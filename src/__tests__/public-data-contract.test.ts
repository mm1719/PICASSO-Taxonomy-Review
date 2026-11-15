import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { parseCsv } from "../utils/csv";
import type { Candidate, TreeNode, MappingStatusData, InvalidLabelData, SampleMap } from "../types";

const dataPath = (name: string) => resolve(process.cwd(), "public/data", name);
const json = <T,>(name: string) => JSON.parse(readFileSync(dataPath(name), "utf8")) as T;

describe("licensed public subset contract", () => {
  const tree = json<TreeNode>("taxonomy_tree.json");
  const candidates = parseCsv<Candidate>(readFileSync(dataPath("valid_class_candidates.csv"), "utf8"));
  const invalid = json<InvalidLabelData>("invalid_label_groups.json");
  const mapping = json<MappingStatusData>("mapping_status.json");
  const samples = json<SampleMap>("class_image_samples.json");
  const receipts = parseCsv<Record<string, string>>(readFileSync(dataPath("image_attributions.csv"), "utf8"));

  it("retains real taxonomy, risk evidence and only the two approved datasets", () => {
    expect(candidates).toHaveLength(219);
    expect(candidates.filter(r => r.dataset_id === "life_watch")).toHaveLength(82);
    expect(new Set(candidates.map(r => r.dataset_id))).toEqual(new Set(["life_watch", "medplanktonset"]));
    expect(tree.dataset_class_entry_count).toBe(candidates.length);
    expect(candidates.reduce((n, r) => n + Number(r.image_count), 0)).toBe(tree.unique_candidate_image_count);
    expect(tree.image_count).toBe(tree.placement_weighted_image_count);
    const leaves: TreeNode[] = [];
    const visit = (node: TreeNode) => { if (node.type === "dataset_class") leaves.push(node); node.children?.forEach(visit); };
    visit(tree);
    expect(leaves).toHaveLength(tree.entry_count);
    for (const row of candidates) {
      expect(row.selected_aphia_ids).toMatch(/^\d+(\|\d+)*$/);
      expect(row.license).toBe("CC-BY-4.0");
      expect(row.source_url).toMatch(/^https:\/\/zenodo.org\//);
      expect(leaves.filter(n => n.entry_id === row.entry_id).map(n => n.selected_aphia_id).sort()).toEqual(row.selected_aphia_ids.split("|").sort());
      expect(samples[row.entry_id].length).toBeGreaterThan(0);
    }
    expect(candidates.filter(r => r.risk_flags.includes("challenged"))).toHaveLength(30);
    expect(candidates.filter(r => r.risk_flags.includes("corrected"))).toHaveLength(1);
  });

  it("enforces one five-image budget per original label across valid and invalid views", () => {
    const byPath = new Map(receipts.map(r => [`/${r.thumbnail_path}`, r]));
    const byLabel = new Map<string, Set<string>>();
    for (const row of receipts) {
      const key = `${row.dataset_id}::${row.source_label}`;
      if (!byLabel.has(key)) byLabel.set(key, new Set());
      byLabel.get(key)!.add(row.thumbnail_path);
      expect(row.license).toBe("CC-BY-4.0");
      expect(row.thumbnail_path).toMatch(/^images\/(life_watch|medplanktonset)\/[a-f0-9]{24}\.jpg$/);
    }
    expect(receipts).toHaveLength(1083);
    expect(Math.max(...[...byLabel.values()].map(s => s.size))).toBe(5);
    const referenced = new Set<string>();
    for (const rows of [...Object.values(samples), ...Object.values(invalid.samples)]) for (const row of rows) {
      const receipt = byPath.get(row.thumbnail_url)!;
      expect(receipt).toBeDefined();
      expect(receipt.source_ref).toBe(row.source_ref);
      expect(receipt.dataset_id).toBe(row.dataset_id);
      referenced.add(row.thumbnail_url);
    }
    expect(referenced).toEqual(new Set(byPath.keys()));
  });

  it("preserves closed LifeWatch-only histories and explicit zero-image reference targets", () => {
    const ids = new Set(mapping.targets.map(t => t.source_id));
    expect(mapping.target_count).toBe(82);
    expect(mapping.scope_note).toContain("MedPlanktonSet has no formal mapping history");
    expect(mapping.targets.reduce((sum, t) => sum + t.image_count, 0)).toBe(337032);
    const references = mapping.targets.filter(t => t.reference_only);
    expect(references.map(t => t.source_id).sort()).toEqual(["ntc_031", "ntc_053"]);
    for (const target of mapping.targets) {
      expect(target.dataset_ids).toBe(target.reference_only ? "" : "life_watch");
      if (target.reference_only) expect(target.image_count).toBe(0);
    }
    for (const history of mapping.histories) {
      expect(history.rows).toHaveLength(ids.size);
      for (const row of history.rows) {
        expect(ids.has(row.source_id)).toBe(true);
        if (row.action === "merge") expect(ids.has(row.target_id)).toBe(true);
      }
    }
  });

  it("locks every public artifact, including JPEGs, to its receipt", () => {
    const metadata = json<{fixture_kind: string; public_artifacts: Record<string, {sha256: string; bytes: number}>}>("demo_data_metadata.json");
    expect(metadata.fixture_kind).toBe("licensed_real_data_subset");
    for (const [name, entry] of Object.entries(metadata.public_artifacts)) {
      const raw = readFileSync(resolve(process.cwd(), "public", name));
      expect(createHash("sha256").update(raw).digest("hex")).toBe(entry.sha256);
      expect(raw.length).toBe(entry.bytes);
      if (name.startsWith("data/")) expect(raw.toString()).not.toMatch(/\/home\/|\/tmp\/|C:\\Users\\|Bearer\s/i);
    }
  });
});
