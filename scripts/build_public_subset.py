"""Export the approved two-dataset showcase without writing to Phase 3 inputs."""

from __future__ import annotations

import argparse
import copy
import csv
import gzip
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

DATASETS = {"life_watch", "medplanktonset"}
LIMIT = 5
DATA_NAMES = (
    "taxonomy_tree.json",
    "valid_class_candidates.csv",
    "class_image_samples.json",
    "worms_lineages.json",
    "invalid_label_groups.json",
    "mapping_status.json",
)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8", newline="") as handle:
        yield from csv.DictReader(handle)


def digest(path):
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def write_json(path, value):
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def write_csv(path, rows, fields):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def split(value):
    return [x for x in value.split("|") if x and x != "n/a"]


def prune_tree(node):
    if node["type"] == "dataset_class":
        return copy.deepcopy(node) if node["dataset_id"] in DATASETS else None
    children = [n for child in node.get("children", []) if (n := prune_tree(child))]
    if not children:
        return None
    result = {**node, "children": children}
    result["image_count"] = sum(c["image_count"] for c in children)
    result["entry_count"] = sum(c.get("entry_count", 1) for c in children)
    result["datasets"] = sorted(
        {d for c in children for d in c.get("datasets", [c.get("dataset_id")]) if d}
    )
    for field in ("risk_flags", "special_tags", "lineage_notes"):
        result[field] = sorted({v for c in children for v in c.get(field, [])})
    return result


def subset_invalid(source):
    result = {"tables": {}, "samples": {}, "summary": {}}
    unique_counts = {}
    for table, groups in source["tables"].items():
        kept = []
        for original in groups:
            evidence = [
                copy.deepcopy(d)
                for d in original["datasets"]
                if d["dataset_id"] in DATASETS
            ]
            if not evidence:
                continue
            group = {**original, "datasets": evidence}
            group["dataset_ids"] = sorted(d["dataset_id"] for d in evidence)
            group["aliases"] = sorted({a for d in evidence for a in d["aliases"]})
            group["total_image_count"] = sum(d["image_count"] for d in evidence)
            for field in ("valid_image_count", "invalid_image_count"):
                group[field] = sum(d[field] for d in evidence)
            group["include_valid_tree_overlap"] = any(
                d["valid_tree_entry"] == "yes" for d in evidence
            )
            group["invalid_reason_count"] = len(
                {v for d in evidence for v in d["reasons"]}
            )
            kept.append(group)
            result["samples"][group["sample_key"]] = [
                r
                for r in source["samples"].get(group["sample_key"], [])
                if r["dataset_id"] in DATASETS
            ]
            for d in evidence:
                key = (d["dataset_id"], group["group_key"])
                if key in unique_counts and unique_counts[key] != d["image_count"]:
                    raise ValueError(f"Conflicting invalid overlap count: {key}")
                unique_counts[key] = d["image_count"]
        result["tables"][table] = kept
    counts = {
        k: sum(g["total_image_count"] for g in gs) for k, gs in result["tables"].items()
    }
    result["summary"] = {
        **source["summary"],
        "source": "Frozen reviewed LifeWatch and MedPlanktonSet subset",
        "sample_limit_per_dataset": LIMIT,
        "table_counts": {k: len(gs) for k, gs in result["tables"].items()},
        "table_image_counts": counts,
        "evidence_table_total_group_count": sum(map(len, result["tables"].values())),
        "evidence_table_total_image_count": sum(counts.values()),
        "unique_group_count": len({k for _, k in unique_counts}),
        "total_image_count": sum(unique_counts.values()),
    }
    return result


def image_key(dataset, source):
    return dataset, Path(source).name


def quality_membership(root, wanted):
    """Use accepted manifests; independently gate MedPlanktonSet invalid evidence."""
    eligible = {}
    targets = {}
    manifests = [
        root / "derived/ml_ready" / name
        for name in (
            "integrated_image_manifest.csv.gz",
            "other_instrument_integrated_image_manifest.csv.gz",
        )
    ]
    qc = (
        root
        / "derived/staging/other_instruments/qc/shards/medplanktonset__IFCB_images.csv.gz"
    )
    duplicates = (
        root / "derived/staging/other_instruments/qc/exact_duplicate_groups.csv"
    )
    input_hashes = {p: digest(p) for p in [*manifests, qc, duplicates]}
    for manifest in manifests:
        for row in read_csv(manifest):
            dataset = row["dataset_id"]
            if dataset not in DATASETS:
                continue
            key = image_key(dataset, row["image_path"])
            if key in wanted:
                if key in eligible and eligible[key]["source"] != row["image_path"]:
                    raise ValueError(f"Ambiguous image identity: {key}")
                eligible[key] = {
                    "label": row["label_original"],
                    "source": row["image_path"],
                    "gate": "current_ml_ready_manifest",
                }
            if dataset == "life_watch":
                target = targets.setdefault(
                    row["aphia_id"],
                    {
                        "image_count": 0,
                        "valid_statuses": set(),
                        "invalid_reasons": set(),
                        "risk_flags": set(),
                        "special_tags": set(),
                        "source_labels": set(),
                    },
                )
                target["image_count"] += 1
                for field, source in (
                    ("valid_statuses", "valid_status"),
                    ("invalid_reasons", "invalid_reason"),
                    ("risk_flags", "risk_flag"),
                    ("special_tags", "special_tags"),
                ):
                    target[field].update(split(row[source]))
                target["source_labels"].add(row["label_original"])
    duplicate_hashes = {
        r["pixel_sha256"]
        for r in read_csv(duplicates)
        if r["dataset_id"] == "medplanktonset"
    }
    seen = set()
    for row in read_csv(qc):
        if row["read_status"] != "ok" or row["transparent_like_flag"].lower() == "true":
            continue
        contrast = float(row["gray_std"] or "nan")
        sharpness = float(row["laplacian_variance"] or "nan")
        if (
            not math.isfinite(contrast)
            or not math.isfinite(sharpness)
            or contrast < 2
            or sharpness < 10
        ):
            continue
        pixel_hash = row["pixel_sha256"]
        if pixel_hash in duplicate_hashes:
            if pixel_hash in seen:
                continue
            seen.add(pixel_hash)
        key = image_key(row["dataset_id"], row["entry_path"])
        if key in wanted and key not in eligible:
            eligible[key] = {
                "label": row["label"],
                "source": row["archive_name"] + "::" + row["entry_path"],
                "gate": "review_evidence_after_read_qc_eda_exact_dedup",
            }
    return eligible, targets, input_hashes


def select_samples(maps, eligible):
    """Share a five-image budget across routes, aliases and AphiaID sample keys."""
    pools = defaultdict(list)
    for sample_map in maps:
        for rows in sample_map.values():
            by_label = defaultdict(list)
            for row in rows:
                key = image_key(row["dataset_id"], row["source_ref"])
                if key in eligible:
                    by_label[(row["dataset_id"], eligible[key]["label"])].append(row)
            for label, subset in by_label.items():
                pools[label].append(subset)
    chosen = {}
    for groups in pools.values():
        used = set()
        for index in range(max(map(len, groups))):
            for rows in groups:
                if index >= len(rows):
                    continue
                row = rows[index]
                key = image_key(row["dataset_id"], row["source_ref"])
                if len(used) < LIMIT and key not in used:
                    used.add(key)
                    chosen[key] = row
    filtered = []
    for sample_map in maps:
        filtered.append(
            {
                k: [
                    r
                    for r in rows
                    if image_key(r["dataset_id"], r["source_ref"]) in chosen
                ]
                for k, rows in sample_map.items()
            }
        )
    return filtered, chosen


def subset_mapping(source, counts):
    lookup = {t["source_id"]: t for t in source["targets"]}
    selected = set(counts)
    if selected - lookup.keys():
        raise ValueError("Current LifeWatch targets are missing from formal mapping")
    # Preserve transitive historical destinations without importing their image cohorts.
    while True:
        added = {
            r["target_id"]
            for h in source["histories"]
            for r in h["rows"]
            if r["source_id"] in selected and r["action"] == "merge"
        } - selected
        if not added:
            break
        if added - lookup.keys():
            raise ValueError("Mapping has unresolved destinations")
        selected.update(added)
    targets = []
    for original in source["targets"]:
        sid = original["source_id"]
        if sid not in selected:
            continue
        target = {
            **original,
            "reference_only": sid not in counts,
            "dataset_ids": "life_watch" if sid in counts else "",
        }
        for key in (
            "image_count",
            "valid_statuses",
            "invalid_reasons",
            "risk_flags",
            "special_tags",
            "source_labels",
        ):
            value = counts.get(sid, {}).get(key, 0 if key == "image_count" else set())
            target[key] = value if isinstance(value, int) else "|".join(sorted(value))
        targets.append(target)
    histories = []
    for history in source["histories"]:
        rows = [copy.deepcopy(r) for r in history["rows"] if r["source_id"] in selected]
        if {r["source_id"] for r in rows} != selected or len(rows) != len(selected):
            raise ValueError(
                "Formal history does not cover the selected IDs exactly once"
            )
        warnings = [w for w in history["warnings"] if w["source_id"] in selected]
        histories.append(
            {
                **history,
                "path": history["file_name"],
                "rows": rows,
                "row_count": len(rows),
                "explicit_row_count": sum(r["action"] != "keep" for r in rows),
                "merge_count": sum(r["action"] == "merge" for r in rows),
                "drop_count": sum(r["action"] == "drop" for r in rows),
                "warnings": warnings,
                "warning_count": len(warnings),
            }
        )
    return {
        **source,
        "source_targets": "Current LifeWatch ML-ready cohort; historical destination-only targets have zero images",
        "history_dir": "the frozen publication snapshot",
        "scope_note": "Formal mapping history: LifeWatch only. MedPlanktonSet has no formal mapping history and is not assigned default keep decisions here. Reference-only targets retain historical destinations with zero images; they do not add another dataset. Mapping image counts use the current LifeWatch ML-ready cohort, not the thumbnail count.",
        "targets": targets,
        "target_count": len(targets),
        "histories": histories,
    }


def publication_info():
    return {
        "kind": "licensed_real_data_subset",
        "published_on": "2026-11-15",
        "sample_limit_per_label": LIMIT,
        "counts_note": "Counts describe the frozen reviewed source cohorts, not the displayed thumbnails. Valid and invalid review evidence can overlap; do not add their totals. This is not the full Phase 3 dataset or a live taxonomy lookup.",
        "modifications": "Selected from QC/EDA-eligible records. Existing review thumbnails were resized and JPEG-encoded by the research pipeline; this publication copies those thumbnails unchanged. Source labels are retained separately from project-reviewed taxonomy and mapping decisions.",
        "datasets": [
            {
                "dataset_id": "life_watch",
                "name": "LifeWatch",
                "instrument": "FlowCAM",
                "title": "LifeWatch observatory data: phytoplankton annotated trainingset by FlowCam imaging in the Belgian Part of the North Sea",
                "creators": "Wout Decrop; Rune Lagaisse; Jonas Mortelmans; Julie Muyle; Luz Amadei Mart\u00ednez; Klaas Deneudt (VLIZ)",
                "source_url": "https://zenodo.org/records/16679297",
                "doi": "10.5281/zenodo.16679297",
                "license": "CC BY 4.0",
                "license_url": "https://creativecommons.org/licenses/by/4.0/",
            },
            {
                "dataset_id": "medplanktonset",
                "name": "MedPlanktonSet",
                "instrument": "IFCB",
                "title": "MedPlanktonSet - A dataset of labeled IFCB images from the Mediterranean Sea",
                "creators": "Mente MS & Houliez E; Scalco E.; Roselli L.; Sarno D. (Stazione Zoologica Anton Dohrn)",
                "source_url": "https://zenodo.org/records/15471023",
                "doi": "10.5281/zenodo.15471023",
                "license": "CC BY 4.0",
                "license_url": "https://creativecommons.org/licenses/by/4.0/",
            },
        ],
        "taxonomy_credit": "WoRMS Editorial Board (2026). World Register of Marine Species. Available from https://www.marinespecies.org at VLIZ. doi:10.14284/170. This is a limited, previously reviewed taxonomy snapshot, not a redistribution of the whole database. Terms checked 2026-11-15; taxon records were not refreshed for this publication.",
        "taxonomy_source_url": "https://www.marinespecies.org/about.php",
        "external_evidence_note": "AlgaeBase (Guiry & Guiry, University of Galway), via Global Names Verifier, and Catalogue of Life are credited in the retained factual name/status evidence and record links. Their websites, descriptions, imagery and raw response caches are not bundled or relicensed. Project review conclusions do not imply provider endorsement.",
        "code_license_note": "Dataset images retain their source CC BY 4.0 terms. These data licenses do not grant a reuse license for this project's own code.",
    }


def build_subset(root, output):
    root, output = root.resolve(), output.resolve()
    if output == root or root in output.parents or output in root.parents:
        raise ValueError("Output must be isolated from the original workspace")
    if output.exists():
        raise ValueError("Output already exists; refuse to overwrite it")
    source_public = root / "demo/taxonomy-integration-review/public"
    source_data = source_public / "data"
    inputs = [source_data / name for name in DATA_NAMES]
    input_hashes = {p: digest(p) for p in inputs}
    candidates = [
        r
        for r in read_csv(source_data / "valid_class_candidates.csv")
        if r["dataset_id"] in DATASETS
    ]
    if {r["dataset_id"] for r in candidates} != DATASETS:
        raise ValueError("An approved dataset is missing")
    ids = {r["entry_id"] for r in candidates}
    selected_ids = {i for r in candidates for i in split(r["selected_aphia_ids"])}
    tree = prune_tree(read_json(source_data / "taxonomy_tree.json"))
    tree.update(
        dataset_class_entry_count=len(candidates),
        unique_selected_aphia_id_count=len(selected_ids),
        unique_candidate_image_count=sum(int(r["image_count"]) for r in candidates),
        placement_weighted_image_count=tree["image_count"],
    )
    for key in ("dataset_colors", "dataset_labels", "dataset_instruments"):
        tree[key] = {d: v for d, v in tree[key].items() if d in DATASETS}
    lineages = {
        k: v
        for k, v in read_json(source_data / "worms_lineages.json").items()
        if k in selected_ids
    }
    if set(lineages) != selected_ids:
        raise ValueError("Selected lineage is missing")
    valid_samples = {
        k: rows
        for k, rows in read_json(source_data / "class_image_samples.json").items()
        if k.split("::aphia::")[0] in ids
    }
    invalid = subset_invalid(read_json(source_data / "invalid_label_groups.json"))
    maps = [valid_samples, invalid["samples"]]
    wanted = {
        image_key(r["dataset_id"], r["source_ref"])
        for m in maps
        for rows in m.values()
        for r in rows
    }
    eligible, target_counts, gate_hashes = quality_membership(root, wanted)
    input_hashes.update(gate_hashes)
    valid_samples = {
        k: [
            r
            for r in rows
            if eligible.get(image_key(r["dataset_id"], r["source_ref"]), {}).get("gate")
            == "current_ml_ready_manifest"
        ]
        for k, rows in valid_samples.items()
    }
    maps = [valid_samples, invalid["samples"]]
    filtered, chosen = select_samples(maps, eligible)
    valid_samples, invalid["samples"] = filtered
    missing = [
        r["entry_id"] for r in candidates if not valid_samples.get(r["entry_id"])
    ]
    if missing:
        raise ValueError(f"No QC-eligible thumbnail for valid entries: {missing}")
    mapping = subset_mapping(
        read_json(source_data / "mapping_status.json"), target_counts
    )
    output.mkdir(parents=True)
    (output / "data").mkdir()
    receipts, published = [], {}
    for key, row in sorted(chosen.items()):
        source = source_public / row["thumbnail_url"].lstrip("/")
        if source.is_symlink() or not source.resolve().is_relative_to(
            source_public.resolve()
        ):
            raise ValueError("Thumbnail source escapes the approved public directory")
        raw = source.read_bytes()
        if not raw.startswith(b"\xff\xd8\xff"):
            raise ValueError("Expected an existing JPEG thumbnail")
        name = hashlib.sha256("::".join(key).encode()).hexdigest()[:24] + ".jpg"
        relative = f"images/{key[0]}/{name}"
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(raw)
        published[key] = {**row, "thumbnail_url": "/" + relative}
        receipts.append(
            {
                "thumbnail_path": relative,
                "dataset_id": key[0],
                "source_label": eligible[key]["label"],
                "image_id": row["image_id"],
                "source_ref": row["source_ref"],
                "quality_gate": eligible[key]["gate"],
                "thumbnail_sha256": hashlib.sha256(raw).hexdigest(),
                "license": "CC-BY-4.0",
                "source_doi": "10.5281/zenodo."
                + ("16679297" if key[0] == "life_watch" else "15471023"),
            }
        )
        input_hashes[source] = hashlib.sha256(raw).hexdigest()
    for m in filtered:
        for key, rows in m.items():
            m[key] = [
                {
                    **r,
                    "thumbnail_url": published[
                        image_key(r["dataset_id"], r["source_ref"])
                    ]["thumbnail_url"],
                }
                for r in rows
            ]
    publication = publication_info()
    for d in publication["datasets"]:
        d["valid_entries"] = sum(r["dataset_id"] == d["dataset_id"] for r in candidates)
        d["thumbnail_count"] = sum(r["dataset_id"] == d["dataset_id"] for r in receipts)
    data = output / "data"
    for name, value in (
        ("taxonomy_tree.json", tree),
        ("class_image_samples.json", valid_samples),
        ("worms_lineages.json", lineages),
        ("invalid_label_groups.json", invalid),
        ("mapping_status.json", mapping),
        ("publication.json", publication),
    ):
        write_json(data / name, value)
    write_csv(data / "valid_class_candidates.csv", candidates, list(candidates[0]))
    write_csv(data / "image_attributions.csv", receipts, list(receipts[0]))
    artifacts = {
        p.relative_to(output).as_posix(): {
            "sha256": digest(p),
            "bytes": p.stat().st_size,
        }
        for p in sorted(output.rglob("*"))
        if p.is_file()
    }
    thumbnail_sources = {
        source_public / r["thumbnail_url"].lstrip("/") for r in chosen.values()
    }
    write_json(
        data / "demo_data_metadata.json",
        {
            "fixture_kind": "licensed_real_data_subset",
            "dataset_ids": sorted(DATASETS),
            "sample_limit_per_label": LIMIT,
            "generator": "scripts/build_public_subset.py",
            "public_artifacts": artifacts,
            "source_inputs": {
                p.relative_to(root).as_posix(): sha
                for p, sha in input_hashes.items()
                if p not in thumbnail_sources
            },
            "source_thumbnail_set_sha256": hashlib.sha256(
                "\n".join(sorted(r["thumbnail_sha256"] for r in receipts)).encode()
            ).hexdigest(),
            "excluded_thumbnail_identities_by_dataset": dict(
                Counter(d for d, name in wanted - eligible.keys())
            ),
            "notes": "Original taxonomy/evidence counts and decisions are frozen; summaries are restricted to the approved datasets. Thumbnail eligibility is independently checked against accepted manifests and QC/EDA/dedup records. No source workspace file was written.",
        },
    )
    for path, sha in input_hashes.items():
        if digest(path) != sha:
            raise ValueError(f"Read-only source changed during export: {path.name}")
    print(
        json.dumps(
            {
                "valid_entries": len(candidates),
                "thumbnail_count": len(receipts),
                "mapping_targets": len(mapping["targets"]),
                "datasets": publication["datasets"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phase3-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build_subset(args.phase3_root, args.output)
