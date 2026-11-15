"""Offline publication guard; requires neither research inputs nor Pillow."""

import argparse
import re
from collections import defaultdict
from pathlib import Path

from build_public_subset import (
    DATA_NAMES,
    DATASETS,
    LIMIT,
    digest,
    read_csv,
    read_json,
    split,
)

DATA_FILES = {
    f"data/{name}"
    for name in (*DATA_NAMES, "publication.json", "image_attributions.csv")
}
METADATA = "data/demo_data_metadata.json"
IMAGE_PATH = re.compile(r"images/(life_watch|medplanktonset)/[0-9a-f]{24}\.jpg")
PRIVATE_PATH = re.compile(r"/home/|/Users/|/tmp/|[A-Z]:\\Users\\|Bearer\s+\S+", re.I)


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_public_data(public):
    require(not public.is_symlink(), "Symlink public directory")
    metadata = read_json(public / METADATA)
    require(
        metadata["fixture_kind"] == "licensed_real_data_subset",
        "Wrong publication marker",
    )
    require(set(metadata["dataset_ids"]) == DATASETS, "Unexpected datasets")
    require(metadata["sample_limit_per_label"] == LIMIT, "Unexpected sample limit")
    receipts = list(read_csv(public / "data/image_attributions.csv"))
    images = {r["thumbnail_path"]: r for r in receipts}
    require(len(images) == len(receipts), "Duplicate thumbnail receipts")
    require(all(IMAGE_PATH.fullmatch(p) for p in images), "Invalid thumbnail path")
    expected = DATA_FILES | set(images) | {METADATA}
    directories = {
        str(parent)
        for p in expected
        for parent in Path(p).parents
        if str(parent) != "."
    }
    present = set()
    for path in public.rglob("*"):
        relative = path.relative_to(public).as_posix()
        require(not path.is_symlink(), f"Symlink is not permitted: {relative}")
        if path.is_dir():
            require(relative in directories, f"Unexpected public directory: {relative}")
        else:
            require(relative in expected, f"Unexpected public asset: {relative}")
            present.add(relative)
    require(present == expected, "Missing public assets")
    require(
        set(metadata["public_artifacts"]) == expected - {METADATA},
        "Unexpected artifact manifest",
    )
    for name, entry in metadata["public_artifacts"].items():
        path = public / name
        require(
            digest(path) == entry["sha256"] and path.stat().st_size == entry["bytes"],
            f"Artifact hash mismatch: {name}",
        )
    for name in DATA_FILES | {METADATA}:
        require(
            not PRIVATE_PATH.search((public / name).read_text()),
            f"Private path or credential: {name}",
        )

    label_images = defaultdict(set)
    for path, row in images.items():
        dataset = row["dataset_id"]
        require(
            dataset in DATASETS and path.split("/")[1] == dataset,
            "Image dataset mismatch",
        )
        require(
            row["source_label"] and row["source_ref"] and row["image_id"],
            "Incomplete image attribution",
        )
        require(row["license"] == "CC-BY-4.0", "Unexpected image license")
        require(
            row["source_doi"]
            == "10.5281/zenodo."
            + ("16679297" if dataset == "life_watch" else "15471023"),
            "Wrong source DOI",
        )
        require(
            row["thumbnail_sha256"] == metadata["public_artifacts"][path]["sha256"],
            "Image receipt hash mismatch",
        )
        gates = {"current_ml_ready_manifest"}
        if dataset == "medplanktonset":
            gates.add("review_evidence_after_read_qc_eda_exact_dedup")
        require(row["quality_gate"] in gates, "Missing approved image quality gate")
        label_images[(dataset, row["source_label"])].add(path)
        raw = (public / path).read_bytes()
        require(
            raw.startswith(b"\xff\xd8\xff") and raw.endswith(b"\xff\xd9"),
            "Invalid JPEG envelope",
        )
    require(
        all(len(paths) <= LIMIT for paths in label_images.values()),
        "Source label exceeds five images",
    )

    candidates = list(read_csv(public / "data/valid_class_candidates.csv"))
    by_id = {r["entry_id"]: r for r in candidates}
    require(len(by_id) == len(candidates), "Duplicate candidate IDs")
    require(
        {r["dataset_id"] for r in candidates} == DATASETS,
        "Unexpected candidate datasets",
    )
    selected = {aid for r in candidates for aid in split(r["selected_aphia_ids"])}
    lineages = read_json(public / "data/worms_lineages.json")
    require(set(lineages) == selected, "Lineage coverage mismatch")
    tree = read_json(public / "data/taxonomy_tree.json")
    leaves = []

    def visit(node):
        if node["type"] == "dataset_class":
            leaves.append(node)
            require(
                node["entry_id"] in by_id and node["dataset_id"] in DATASETS,
                "Unexpected tree entry",
            )
            candidate = by_id[node["entry_id"]]
            require(
                node["selected_aphia_id"] in split(candidate["selected_aphia_ids"]),
                "Tree placement mismatch",
            )
            require(
                set(node["risk_flags"]) == set(split(candidate["risk_flags"])),
                "Tree risk flags mismatch",
            )
            return node["image_count"], 1
        totals = [visit(child) for child in node["children"]]
        count, entries = sum(t[0] for t in totals), sum(t[1] for t in totals)
        require(
            (node["image_count"], node["entry_count"]) == (count, entries),
            "Tree aggregate mismatch",
        )
        return count, entries

    visit(tree)
    require(
        {n["entry_id"] for n in leaves} == set(by_id),
        "Tree candidate coverage mismatch",
    )
    require(
        tree["dataset_class_entry_count"] == len(candidates), "Candidate count mismatch"
    )
    require(
        tree["unique_candidate_image_count"]
        == sum(int(r["image_count"]) for r in candidates),
        "Candidate image count mismatch",
    )
    for key in ("dataset_labels", "dataset_colors", "dataset_instruments"):
        require(set(tree[key]) == DATASETS, "Unexpected tree dataset metadata")

    invalid = read_json(public / "data/invalid_label_groups.json")
    samples = read_json(public / "data/class_image_samples.json")
    require(set(by_id) <= set(samples), "Missing valid thumbnail groups")
    require(
        all(k.split("::aphia::")[0] in by_id for k in samples),
        "Unexpected valid sample key",
    )
    referenced = set()
    for sample_map, valid in ((samples, True), (invalid["samples"], False)):
        for rows in sample_map.values():
            for row in rows:
                path = row["thumbnail_url"].removeprefix("/")
                require(path in images, "Unattributed image reference")
                receipt = images[path]
                require(
                    row["dataset_id"] == receipt["dataset_id"]
                    and row["image_id"] == receipt["image_id"]
                    and row["source_ref"] == receipt["source_ref"],
                    "Sample attribution mismatch",
                )
                if valid:
                    require(
                        receipt["quality_gate"] == "current_ml_ready_manifest",
                        "Valid thumbnail is not ML-ready",
                    )
                referenced.add(path)
    require(referenced == set(images), "Unreferenced images")
    unique_counts = {}
    for table, groups in invalid["tables"].items():
        require(
            len(groups) == invalid["summary"]["table_counts"][table],
            "Invalid group count mismatch",
        )
        require(
            sum(g["total_image_count"] for g in groups)
            == invalid["summary"]["table_image_counts"][table],
            "Invalid table image count mismatch",
        )
        for group in groups:
            require(
                set(group["dataset_ids"]) <= DATASETS, "Unexpected invalid datasets"
            )
            require(
                group["total_image_count"]
                == sum(d["image_count"] for d in group["datasets"]),
                "Invalid evidence count mismatch",
            )
            for dataset in group["datasets"]:
                require(
                    dataset["dataset_id"] in DATASETS,
                    "Unexpected invalid evidence dataset",
                )
                unique_counts[(dataset["dataset_id"], group["group_key"])] = dataset[
                    "image_count"
                ]
    require(
        sum(unique_counts.values()) == invalid["summary"]["total_image_count"],
        "Invalid union count mismatch",
    )

    mapping = read_json(public / "data/mapping_status.json")
    ids = {r["source_id"] for r in mapping["targets"]}
    require(
        len(ids) == len(mapping["targets"]) == mapping["target_count"],
        "Duplicate mapping IDs",
    )
    require(
        "MedPlanktonSet has no formal mapping history" in mapping["scope_note"],
        "Missing mapping scope",
    )
    for row in mapping["targets"]:
        if row["reference_only"]:
            require(
                row["image_count"] == 0 and not row["dataset_ids"],
                "Reference-only target imports images",
            )
        else:
            require(
                row["dataset_ids"] == "life_watch" and row["image_count"] > 0,
                "Mapping dataset mismatch",
            )
    for history in mapping["histories"]:
        require(
            len(history["rows"]) == len(ids)
            and {r["source_id"] for r in history["rows"]} == ids,
            "Mapping history coverage mismatch",
        )
        for row in history["rows"]:
            require(
                row["action"] in {"keep", "merge", "drop"}, "Unknown mapping action"
            )
            if row["action"] == "merge":
                require(
                    row["target_id"] in ids and row["target_id"] != row["source_id"],
                    "Unresolved mapping destination",
                )
    publication = read_json(public / "data/publication.json")
    require(
        {d["dataset_id"] for d in publication["datasets"]} == DATASETS,
        "Missing publication credit",
    )
    for dataset in publication["datasets"]:
        require(
            dataset["creators"] and dataset["license"] == "CC BY 4.0",
            "Incomplete source credit",
        )
        require(
            dataset["thumbnail_count"]
            == sum(r["dataset_id"] == dataset["dataset_id"] for r in receipts),
            "Publication thumbnail count mismatch",
        )
    return len(candidates), len(images)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--public", type=Path, default=Path(__file__).resolve().parents[1] / "public"
    )
    args = parser.parse_args()
    entries, images = check_public_data(args.public)
    print(f"Verified {entries} entries and {images} attributed thumbnails")
