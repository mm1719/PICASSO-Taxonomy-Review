import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { parseCsv } from "../utils/csv";
import type { Candidate, TreeNode, MappingStatusData, InvalidLabelData, SampleMap } from "../types";

const dataPath = (name: string) => resolve(process.cwd(), "public/data", name);
const json = <T,>(name: string) => JSON.parse(readFileSync(dataPath(name), "utf8")) as T;

describe("synthetic source-only fixture contract", () => {
  const tree = json<TreeNode>("taxonomy_tree.json");
  const candidates = parseCsv<Candidate>(readFileSync(dataPath("valid_class_candidates.csv"), "utf8"));
  const invalid = json<InvalidLabelData>("invalid_label_groups.json");
  const mapping = json<MappingStatusData>("mapping_status.json");
  const samples = json<SampleMap>("class_image_samples.json");
  it("identifies all records as synthetic and aligns valid counts", () => {
    expect(candidates).toHaveLength(3);
    expect(tree.dataset_class_entry_count).toBe(candidates.length);
    expect(candidates.reduce((n,r)=>n+Number(r.image_count),0)).toBe(tree.image_count);
    expect(tree.image_count).toBe(tree.unique_candidate_image_count);
    const leaves: TreeNode[] = [];
    const visit = (node:TreeNode) => { if(node.type==="dataset_class") leaves.push(node); node.children?.forEach(visit); };
    visit(tree);
    expect(leaves).toHaveLength(tree.entry_count!);
    for(const row of candidates) {
      expect(row.dataset_id).toMatch(/^synthetic_/);
      expect(row.selected_aphia_ids).toMatch(/^demo_taxon_/);
      expect(row.license_status).toBe("synthetic");
      expect(row.source_url).toBe("");
      expect(row.worms_record_urls).toBe("");
      expect(leaves.find(n=>n.entry_id===row.entry_id)?.image_count).toBe(Number(row.image_count));
    }
  });
  it("uses newly generated local SVG diagrams instead of research thumbnails", () => {
    for(const rows of [...Object.values(samples),...Object.values(invalid.samples)]) for(const row of rows) {
      expect(row.source_ref).toMatch(/^synthetic\//);
      expect(row.thumbnail_url).toMatch(/^\/(samples|invalid-samples)\/[^/]+\.svg$/);
      const path=resolve(process.cwd(),"public",row.thumbnail_url.slice(1));
      expect(existsSync(path)).toBe(true);
      const svg=readFileSync(path,"utf8");
      expect(svg).toContain("SYNTHETIC DIAGRAM");
      expect(svg).not.toMatch(/<script|data:|href=|<image/i);
    }
  });
  it("keeps invalid evidence and editable mapping references internally consistent", () => {
    const groups=Object.values(invalid.tables).flat();
    expect(groups.reduce((n,g)=>n+g.total_image_count,0)).toBe(invalid.summary.total_image_count);
    const ids=new Set(mapping.targets.map(t=>t.source_id));
    expect(mapping.target_count).toBe(ids.size);
    expect(mapping.histories.at(-1)?.history_id).toBe(mapping.latest_history_id);
    for(const history of mapping.histories) {
      expect(history.rows).toHaveLength(ids.size);
      for(const row of history.rows) { expect(ids.has(row.source_id)).toBe(true); if(row.action==="merge") {expect(ids.has(row.target_id)).toBe(true);expect(row.source_id).not.toBe(row.target_id);} }
    }
  });
  it("locks generated artifacts to metadata and contains no private paths or remote assets", () => {
    const metadata=json<{fixture_kind:string,public_artifacts:Record<string,{sha256:string,bytes:number}>}>("demo_data_metadata.json");
    expect(metadata.fixture_kind).toBe("synthetic_not_research_data");
    for(const [name,entry] of Object.entries(metadata.public_artifacts)) {
      const raw=readFileSync(dataPath(name));
      expect(createHash("sha256").update(raw).digest("hex")).toBe(entry.sha256);
      expect(raw.length).toBe(entry.bytes);
      expect(raw.toString()).not.toMatch(/\/home\/|C:\\Users\\|https?:\/\/|@\w+\./);
    }
  });
});
