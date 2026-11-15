"""Publication contracts and refusal paths, without access to research storage."""

import copy
import csv
import gzip
import shutil
import tempfile
import unittest
from pathlib import Path

from build_public_subset import (
    build_subset,
    digest,
    image_key,
    prune_tree,
    quality_membership,
    read_json,
    read_csv,
    select_samples,
    subset_mapping,
    write_csv,
    write_json,
)
from check_public_data import check_public_data

PUBLIC = Path(__file__).resolve().parents[1] / "public"


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.public = self.root / "public"
        shutil.copytree(PUBLIC, self.public)

    def refresh_hash(self, relative):
        metadata_path = self.public / "data/demo_data_metadata.json"
        metadata = read_json(metadata_path)
        path = self.public / relative
        metadata["public_artifacts"][relative] = {
            "sha256": digest(path),
            "bytes": path.stat().st_size,
        }
        write_json(metadata_path, metadata)

    def test_rehashed_label_budget_violation_still_fails(self):
        relative = "data/image_attributions.csv"
        rows = list(read_csv(self.public / relative))
        for row in rows:
            row["source_label"] = "one source label"
        write_csv(self.public / relative, rows, list(rows[0]))
        self.refresh_hash(relative)
        with self.assertRaisesRegex(ValueError, "exceeds five images"):
            check_public_data(self.public)

    def test_rehashed_private_path_still_fails(self):
        relative = "data/publication.json"
        publication = read_json(self.public / relative)
        publication["modifications"] = "/home/private/example"
        write_json(self.public / relative, publication)
        self.refresh_hash(relative)
        with self.assertRaisesRegex(ValueError, "Private path"):
            check_public_data(self.public)

    def test_rehashed_reference_only_images_still_fail(self):
        relative = "data/mapping_status.json"
        mapping = read_json(self.public / relative)
        next(t for t in mapping["targets"] if t["reference_only"])["image_count"] = 1
        write_json(self.public / relative, mapping)
        self.refresh_hash(relative)
        with self.assertRaisesRegex(ValueError, "Reference-only target imports images"):
            check_public_data(self.public)

    def test_complete_snapshot(self):
        self.assertEqual(check_public_data(self.public), (219, 1083))

    def test_unexpected_file_is_not_deleted(self):
        path = self.public / "data/private.csv"
        path.write_text("private sentinel")
        with self.assertRaisesRegex(ValueError, "Unexpected public asset"):
            check_public_data(self.public)
        self.assertEqual(path.read_text(), "private sentinel")

    def test_unexpected_empty_directory(self):
        (self.public / "unreviewed").mkdir()
        with self.assertRaisesRegex(ValueError, "Unexpected public directory"):
            check_public_data(self.public)

    def test_symlink_is_rejected(self):
        sentinel = self.root / "private"
        sentinel.write_text("unchanged")
        (self.public / "data/private").symlink_to(sentinel)
        with self.assertRaisesRegex(ValueError, "Symlink is not permitted"):
            check_public_data(self.public)
        self.assertEqual(sentinel.read_text(), "unchanged")

    def test_missing_image(self):
        next((self.public / "images").rglob("*.jpg")).unlink()
        with self.assertRaisesRegex(ValueError, "Missing public assets"):
            check_public_data(self.public)

    def test_tampered_data_and_image(self):
        for path in (
            self.public / "data/taxonomy_tree.json",
            next((self.public / "images").rglob("*.jpg")),
        ):
            original = path.read_bytes()
            path.write_bytes(original + b"tampered")
            with self.assertRaisesRegex(ValueError, "Artifact hash mismatch"):
                check_public_data(self.public)
            path.write_bytes(original)

    def test_builder_cannot_overwrite_or_write_in_original_workspace(self):
        for output in (self.root, self.root / "new-output", self.public):
            with self.assertRaisesRegex(ValueError, "isolated"):
                build_subset(self.root, output)
        with self.assertRaisesRegex(ValueError, "already exists"):
            build_subset(self.root / "source", self.public)


class SelectionTests(unittest.TestCase):
    def test_quality_gates_keep_manifest_records_and_only_eligible_invalid_evidence(
        self,
    ):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)

            def write(relative, rows):
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                opener = gzip.open if path.suffix == ".gz" else open
                with opener(path, "wt", newline="") as handle:
                    writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
                    writer.writeheader()
                    writer.writerows(rows)

            record = {
                "dataset_id": "life_watch",
                "image_path": "source/accepted.jpg",
                "label_original": "source label",
                "aphia_id": "42",
                "valid_status": "valid",
                "invalid_reason": "n/a",
                "risk_flag": "challenged",
                "special_tags": "",
            }
            write("derived/ml_ready/integrated_image_manifest.csv.gz", [record])
            write(
                "derived/ml_ready/other_instrument_integrated_image_manifest.csv.gz",
                [{**record, "dataset_id": "medplanktonset"}],
            )
            qc = {
                "dataset_id": "medplanktonset",
                "entry_path": "eligible.jpg",
                "read_status": "ok",
                "transparent_like_flag": "False",
                "gray_std": "2",
                "laplacian_variance": "10",
                "pixel_sha256": "duplicate",
                "label": "invalid source label",
                "archive_name": "archive.zip",
            }
            rejected = [
                {**qc, "entry_path": "bad.jpg", "read_status": "error"},
                {
                    **qc,
                    "entry_path": "transparent.jpg",
                    "transparent_like_flag": "True",
                },
                {**qc, "entry_path": "blank.jpg", "gray_std": "1.9"},
                {**qc, "entry_path": "blur.jpg", "laplacian_variance": "9.9"},
                {**qc, "entry_path": "missing-metric.jpg", "gray_std": ""},
            ]
            write(
                "derived/staging/other_instruments/qc/shards/medplanktonset__IFCB_images.csv.gz",
                [*rejected, qc, {**qc, "entry_path": "duplicate.jpg"}],
            )
            write(
                "derived/staging/other_instruments/qc/exact_duplicate_groups.csv",
                [{"dataset_id": "medplanktonset", "pixel_sha256": "duplicate"}],
            )
            wanted = {
                ("life_watch", "accepted.jpg"),
                ("medplanktonset", "accepted.jpg"),
                ("medplanktonset", "eligible.jpg"),
                ("medplanktonset", "duplicate.jpg"),
                *(("medplanktonset", r["entry_path"]) for r in rejected),
            }
            eligible, targets, hashes = quality_membership(root, wanted)
            self.assertEqual(
                set(eligible),
                {
                    ("life_watch", "accepted.jpg"),
                    ("medplanktonset", "accepted.jpg"),
                    ("medplanktonset", "eligible.jpg"),
                },
            )
            self.assertEqual(
                eligible[("medplanktonset", "eligible.jpg")]["gate"],
                "review_evidence_after_read_qc_eda_exact_dedup",
            )
            self.assertEqual(targets["42"]["image_count"], 1)
            self.assertEqual(targets["42"]["risk_flags"], {"challenged"})
            self.assertEqual(targets["42"]["invalid_reasons"], set())
            self.assertEqual(len(hashes), 4)

    def test_sample_budget_is_shared_across_routes_and_aliases(self):
        rows = [
            {
                "dataset_id": "life_watch",
                "source_ref": f"relative/{i}.jpg",
                "label": "display alias",
            }
            for i in range(12)
        ]
        eligible = {
            image_key(r["dataset_id"], r["source_ref"]): {"label": "original label"}
            for r in rows[:-1]
        }
        maps = [{"valid": rows[:8], "valid::aphia::1": rows[4:]}, {"invalid": rows[6:]}]
        before = copy.deepcopy(maps)
        filtered, chosen = select_samples(maps, eligible)
        self.assertEqual(maps, before)
        self.assertEqual(len(chosen), 5)
        self.assertTrue(filtered[0]["valid"])
        self.assertTrue(filtered[0]["valid::aphia::1"])
        self.assertTrue(filtered[1]["invalid"])
        self.assertNotIn(image_key("life_watch", "relative/11.jpg"), chosen)
        self.assertEqual(select_samples(maps, eligible), (filtered, chosen))

    def test_pruning_preserves_leaves_and_recomputes_aggregate_flags(self):
        leaf = {
            "type": "dataset_class",
            "dataset_id": "life_watch",
            "image_count": 10,
            "risk_flags": ["challenged"],
            "special_tags": [],
            "lineage_notes": ["original evidence"],
        }
        removed = {**leaf, "dataset_id": "excluded", "risk_flags": ["contaminated"]}
        tree = {
            "type": "root",
            "children": [leaf, removed],
            "image_count": 20,
            "risk_flags": ["challenged", "contaminated"],
        }
        before = copy.deepcopy(tree)
        result = prune_tree(tree)
        self.assertEqual(tree, before)
        self.assertEqual(result["children"], [leaf])
        self.assertEqual(result["risk_flags"], ["challenged"])
        self.assertEqual((result["image_count"], result["entry_count"]), (10, 1))
        self.assertIsNone(prune_tree({"type": "taxon", "children": [removed]}))

    def test_mapping_closes_over_historical_destinations_without_their_images(self):
        source = read_json(PUBLIC / "data/mapping_status.json")
        rule = next(
            r
            for h in source["histories"]
            for r in h["rows"]
            if r["target_id"] == "ntc_031"
        )
        sid = rule["source_id"]
        count = {"image_count": 123, "source_labels": {"source label"}}
        before = copy.deepcopy(source)
        result = subset_mapping(source, {sid: count})
        self.assertEqual(source, before)
        target = next(t for t in result["targets"] if t["source_id"] == "ntc_031")
        self.assertTrue(target["reference_only"])
        self.assertEqual((target["image_count"], target["dataset_ids"]), (0, ""))
        self.assertEqual(sum(t["image_count"] for t in result["targets"]), 123)
        for history in result["histories"]:
            original = next(
                h
                for h in source["histories"]
                if h["history_id"] == history["history_id"]
            )
            self.assertEqual(
                history["rows"],
                [
                    r
                    for r in original["rows"]
                    if r["source_id"] in {t["source_id"] for t in result["targets"]}
                ],
            )

    def test_missing_mapping_target_fails_closed(self):
        source = read_json(PUBLIC / "data/mapping_status.json")
        with self.assertRaisesRegex(ValueError, "missing from formal mapping"):
            subset_mapping(source, {"unknown": {"image_count": 1}})


if __name__ == "__main__":
    unittest.main()
