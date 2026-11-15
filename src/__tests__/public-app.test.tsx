import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StrictMode } from "react";
import App from "../App";
import { SamplePage } from "../components/SamplePage";
import { parseCsv } from "../utils/csv";
import type { MappingStatusData, SampleMap } from "../types";

beforeEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/valid");
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (!input.startsWith("/data/")) throw new Error("Unexpected external request");
    const text=readFileSync(resolve(process.cwd(),"public",input.slice(1)),"utf8");
    return new Response(text, { status: 200 });
  }));
});

describe("published real-data subset route integration", () => {
  it("restores the mapping draft after navigating through valid and invalid views", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/mapping");
    render(<StrictMode><App /></StrictMode>);
    await screen.findByRole("heading", { name: "Taxonomy Integration Review" });
    const loadRequests = vi.mocked(fetch).mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Edit draft", exact: true }));
    await user.type(screen.getByLabelText("Mapping search term 1"), "ntc_032");
    const note = document.querySelector<HTMLTextAreaElement>(".mapping-table textarea")!;
    await user.clear(note);
    await user.type(note, "Keep this across routes");
    await user.click(screen.getByRole("button", { name: "Valid tree", exact: true }));
    await user.click(screen.getByRole("button", { name: "Invalid labels", exact: true }));
    await user.click(screen.getByRole("button", { name: "Mapping status", exact: true }));
    expect(screen.getByRole("heading", { name: "Editable draft" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Keep this across routes")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(loadRequests);
  });

  it("reports a network failure and recovers when Retry succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Network unavailable"));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    expect(screen.queryByText("Loading taxonomy data...")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "Taxonomy Integration Review" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(10);
  });

  it.each([
    "taxonomy_tree.json", "valid_class_candidates.csv", "class_image_samples.json",
    "invalid_label_groups.json", "mapping_status.json"
  ])("reports an unsuccessful HTTP response for %s", async (file) => {
    const normalFetch = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).endsWith(file)) return new Response("not found", { status: 404 });
      return normalFetch(input, init);
    });
    render(<App />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(file);
    expect(alert).toHaveTextContent("404");
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("reports invalid JSON instead of staying in loading", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not JSON", { status: 200 }));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load taxonomy data");
    expect(screen.queryByText("Loading taxonomy data...")).not.toBeInTheDocument();
  });

  it("ignores failed requests from a cleaned-up StrictMode effect", async () => {
    for (let index = 0; index < 5; index += 1) {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Stale request"));
    }
    render(<StrictMode><App /></StrictMode>);
    await screen.findByRole("heading", { name: "Taxonomy Integration Review" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.mocked(fetch).mock.calls[5][1]?.signal?.aborted).toBe(false);
  });

  it("loads the real generated fixture files and navigates all three review sections", async () => {
    const user=userEvent.setup();
    render(<App />);
    await screen.findByRole("heading",{name:"Taxonomy Integration Review"});
    expect(screen.getByRole("note")).toHaveTextContent("licensed real-data subset");
    expect(screen.getByRole("checkbox", { name: "LifeWatch", exact: true })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Sources and licenses" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("475 published thumbnails");
    expect(screen.getAllByRole("link", { name: "CC BY 4.0" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Image attribution CSV" })).toHaveAttribute("href", "/data/image_attributions.csv");
    await user.click(screen.getByRole("button", { name: "Close help" }));
    await user.click(screen.getByRole("button",{name:"Invalid labels",exact:true}));
    await waitFor(()=>expect(window.location.pathname).toBe("/invalid"));
    expect(screen.getByText("Artefact")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Mapping status",exact:true}));
    await waitFor(()=>expect(window.location.pathname).toBe("/mapping"));
    expect(screen.getByText(/MedPlanktonSet has no formal mapping history/)).toBeInTheDocument();
    expect(screen.getAllByText("Reference only")).toHaveLength(2);
    await user.click(screen.getAllByText("Reference only")[0]);
    expect(screen.getByText(/Historical destination only/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close class detail drawer" }));
    await user.click(screen.getByRole("button",{name:"Valid tree",exact:true}));
    await waitFor(()=>expect(window.location.pathname).toBe("/valid"));
    expect(screen.getByRole("note")).toHaveTextContent("Counts describe source cohorts");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(5);
  });

  it("credits real sample images on the thumbnail page", () => {
    const samples = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/class_image_samples.json"), "utf8")) as SampleMap;
    const rows = samples["life_watch::Actinoptychus"];
    render(<SamplePage samples={rows} onBack={vi.fn()} />);
    expect(screen.getAllByRole("img")).toHaveLength(rows.length);
    expect(screen.getByRole("link", { name: "LifeWatch" })).toHaveAttribute("href", "https://zenodo.org/records/16679297");
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
    expect(screen.getByText(/Wout Decrop/)).toBeInTheDocument();
  });

  it("roundtrips the published mapping IDs and protects a changed draft", async () => {
    const user = userEvent.setup();
    const data = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/mapping_status.json"), "utf8")) as MappingStatusData;
    const latest = data.histories.find(h => h.history_id === data.latest_history_id)!;
    window.history.replaceState(null, "", "/mapping");
    let exported: Blob;
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn((blob: Blob) => { exported = blob; return "blob:public-mapping"; }) });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<App />);
    await screen.findByRole("heading", { name: latest.file_name });
    expect(screen.queryByRole("button", { name: "Close class detail drawer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exported!);
    });
    const rules = parseCsv<Record<string, string>>(csv);
    expect(rules.map(r => [r.source_id, r.action, r.target_id]).sort()).toEqual(latest.rows.filter(r => r.action !== "keep").map(r => [r.source_id, r.action, r.target_id]).sort());
    const upload = async (text: string) => {
      const file = new File([text], "review.csv", { type: "text/csv" });
      Object.defineProperty(file, "text", { value: async () => text });
      await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);
    };
    await upload(csv);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const rule = rules[0];
    const row = within(screen.getByRole("main")).getAllByText(rule.source_id).find(e => e.closest("td")?.cellIndex === 1)!.closest("tr")!;
    const note = row.querySelector("textarea")!;
    await user.clear(note);
    await user.type(note, "retain this reviewed draft");
    await upload("action,source_id,target_id\ndrop,not-in-this-subset,\n");
    expect(screen.getByRole("alert")).toHaveTextContent("not-in-this-subset");
    expect(note).toHaveValue("retain this reviewed draft");
    await user.click(screen.getByRole("button", { name: "View latest/history" }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByDisplayValue("retain this reviewed draft")).toBeInTheDocument();
  });
});
