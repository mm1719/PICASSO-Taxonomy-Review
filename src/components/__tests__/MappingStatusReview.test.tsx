import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MappingHistory, MappingStatusData } from "../../types";
import { MappingStatusReview } from "../MappingStatusReview";

const targets = [
  {
    source_id: "a",
    source_alias: "Alpha",
    image_count: 12,
    valid_statuses: "invalid",
    invalid_reasons: "non_taxonomic_category",
    risk_flags: "n/a",
    special_tags: "n/a",
    dataset_ids: "flowcam_net",
    source_labels: "alpha"
  },
  {
    source_id: "b",
    source_alias: "beta",
    image_count: 8,
    valid_statuses: "valid",
    invalid_reasons: "n/a",
    risk_flags: "n/a",
    special_tags: "n/a",
    dataset_ids: "life_watch",
    source_labels: "beta"
  },
  {
    source_id: "c",
    source_alias: "Comma, class",
    image_count: 3,
    valid_statuses: "invalid",
    invalid_reasons: "taxonomic_mismatch",
    risk_flags: "n/a",
    special_tags: "n/a",
    dataset_ids: "tara_pacific_deck",
    source_labels: "comma class"
  }
];

const firstHistory: MappingHistory = {
  history_id: "first",
  file_name: "first.csv",
  path: "mapping_history/first.csv",
  row_count: 3,
  explicit_row_count: 1,
  merge_count: 1,
  drop_count: 0,
  warning_count: 0,
  warnings: [],
  rows: [
    {
      action: "merge",
      source_id: "a",
      target_id: "b",
      source_alias: "Alpha",
      target_alias: "beta",
      notes: "merge, \"review\"",
      validation_status: "ok",
      validation_message: ""
    },
    {
      action: "keep",
      source_id: "b",
      target_id: "",
      source_alias: "beta",
      target_alias: "",
      notes: "",
      validation_status: "ok",
      validation_message: ""
    },
    {
      action: "keep",
      source_id: "c",
      target_id: "",
      source_alias: "Comma, class",
      target_alias: "",
      notes: "",
      validation_status: "ok",
      validation_message: ""
    }
  ]
};

const secondHistory: MappingHistory = {
  ...firstHistory,
  history_id: "second",
  file_name: "second.csv",
  path: "mapping_history/second.csv",
  explicit_row_count: 1,
  merge_count: 0,
  drop_count: 1,
  rows: firstHistory.rows.map((row) =>
    row.source_id === "c"
      ? { ...row, action: "drop", notes: "second history" }
      : { ...row, action: "keep", target_id: "", target_alias: "" }
  )
};

function mappingData(
  histories: MappingHistory[] = [firstHistory, secondHistory],
  latestHistoryId = "missing-latest"
): MappingStatusData {
  return {
    generated_at_utc: "2026-07-24T00:00:00+00:00",
    source_targets: "target_profiles.csv",
    history_dir: "mapping_history",
    export_fields: ["action", "source_id", "target_id", "source_alias", "target_alias", "notes"],
    target_count: targets.length,
    targets,
    latest_history_id: latestHistoryId,
    histories
  };
}

function fileInput() {
  return document.querySelector<HTMLInputElement>('input[type="file"]')!;
}

function rowByAlias(panel: HTMLElement, alias: string) {
  return within(panel)
    .getAllByText(alias)
    .find((element) => element.matches("td.strong-cell"))!
    .closest("tr")!;
}

function csvFile(contents: string, name: string) {
  const file = new File([contents], name, { type: "text/csv" });
  Object.defineProperty(file, "text", { value: async () => contents });
  return file;
}

async function blobText(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("MappingStatusReview", () => {
  it("falls back to blank rows when no history exists and closes its drawer", async () => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData([], "")} />);

    expect(screen.getByRole("heading", { name: "No history" })).toBeInTheDocument();
    expect(screen.getAllByText("keep")).toHaveLength(3);

    const panel = screen.getByRole("heading", { name: "No history" }).closest("main")!;
    await user.click(rowByAlias(panel, "Alpha"));
    const drawer = screen.getByRole("heading", { name: "Alpha" }).closest("aside")!;
    expect(within(drawer).getByText("12")).toBeInTheDocument();
    expect(within(drawer).getAllByText("n/a").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Close class detail drawer" }));
    expect(screen.queryByRole("heading", { name: "Alpha" })).not.toBeInTheDocument();
  });

  it("switches history and validates drop, unresolved, self, and valid merge edits", async () => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData()} />);

    expect(screen.getByRole("heading", { name: "second.csv" })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox"), "first");
    expect(screen.getByRole("heading", { name: "first.csv" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    const panel = screen.getByRole("heading", { name: "Editable draft" }).closest("main")!;
    let row = rowByAlias(panel, "Alpha");
    let action = row.querySelector("select")!;

    await user.selectOptions(action, "drop");
    expect(row.querySelector("input[list]")).not.toBeInTheDocument();

    await user.selectOptions(action, "merge");
    const target = row.querySelector<HTMLInputElement>("input[list]")!;
    expect(screen.getByText("target_id is not present in current ML-ready targets")).toBeInTheDocument();

    fireEvent.change(target, { target: { value: "a" } });
    row = rowByAlias(panel, "Alpha");
    action = row.querySelector("select")!;
    expect(action).toHaveValue("keep");

    await user.selectOptions(action, "merge");
    row = rowByAlias(panel, "Alpha");
    const validTarget = row.querySelector<HTMLInputElement>("input[list]")!;
    await user.type(validTarget, "b");
    expect(within(row).getByText("beta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "View latest/history" }));
    expect(screen.getByRole("heading", { name: "first.csv" })).toBeInTheDocument();
  });

  it("blocks unknown imported sources and accepts normalized valid rules", async () => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData()} />);

    await user.upload(
      fileInput(),
      csvFile("action,source_id,target_id,notes\nmerge,missing,b,test\n", "bad.csv")
    );
    expect(await screen.findByText("Import blocked: source_id not found (missing)")).toBeInTheDocument();

    await user.upload(
      fileInput(),
      csvFile(
        "action,source_id,target_id,notes\nMERGE,a,b, imported note \nKEEP,b,,kept source\ndrop,c,b,drop note\n",
        "good.csv",
      )
    );

    const panel = (await screen.findByRole("heading", { name: "Editable draft" })).closest("main")!;
    const alphaRow = rowByAlias(panel, "Alpha");
    expect(within(alphaRow).getByDisplayValue("b")).toBeInTheDocument();
    expect(within(alphaRow).getByRole("textbox")).toHaveValue(" imported note ");
    const betaRow = rowByAlias(panel, "beta");
    expect(within(betaRow).getByRole("combobox")).toHaveValue("keep");
    const dropRow = rowByAlias(panel, "Comma, class");
    expect(within(dropRow).getByRole("combobox")).toHaveValue("drop");
    expect(within(dropRow).queryByDisplayValue("b")).not.toBeInTheDocument();
  });

  it("preserves CSV note whitespace and quoted multiline text", async () => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData()} />);
    const notes = '  Browser, "round trip"\n\u4fdd\u7559\u8349\u7a3f  ';
    await user.upload(fileInput(), csvFile(
      `action,source_id,target_id,notes\nmerge,a,b,"${notes.replace(/"/g, '""')}"\n`,
      "notes.csv"
    ));
    const panel = (await screen.findByRole("heading", { name: "Editable draft" })).closest("main")!;
    expect(within(rowByAlias(panel, "Alpha")).getByRole("textbox")).toHaveValue(notes);
  });

  it("does not reset edits when Edit draft is clicked again", async () => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData([firstHistory], "first")} />);
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    const panel = screen.getByRole("heading", { name: "Editable draft" }).closest("main")!;
    const row = rowByAlias(panel, "Alpha");
    fireEvent.change(within(row).getByRole("textbox"), { target: { value: "Unexported note" } });
    await user.selectOptions(row.querySelector("select")!, "drop");
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    expect(within(row).getByRole("textbox")).toHaveValue("Unexported note");
    expect(row.querySelector("select")).toHaveValue("drop");
  });

  it("requires confirmation before replacing a changed draft from history", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MappingStatusReview data={mappingData([firstHistory], "first")} />);
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    const panel = screen.getByRole("heading", { name: "Editable draft" }).closest("main")!;
    const row = rowByAlias(panel, "Alpha");
    fireEvent.change(within(row).getByRole("textbox"), { target: { value: "Unexported note" } });
    await user.click(screen.getByRole("button", { name: "View latest/history" }));
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("heading", { name: "Editable draft" })).toBeInTheDocument();
    expect(within(rowByAlias(panel, "Alpha")).getByRole("textbox")).toHaveValue("Unexported note");
    await user.click(screen.getByRole("button", { name: "View latest/history" }));
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    expect(within(rowByAlias(panel, "Alpha")).getByRole("textbox")).toHaveValue('merge, "review"');
  });

  it.each([
    "action,source,target\nmerge,a,b\n",
    "source_id,target_id\na,b\n",
    "",
    "action,source_id,target_id\nkeep,,\n",
    "action,source_id,target_id\nwat,a,b\n",
    "action,source_id,target_id\nmerge,a,b\ndrop,a,\n",
    'action,source_id,target_id,notes\nmerge,a,b,"unfinished',
    "action,source_id,target_id\ndrop,missing,\n"
  ])("preserves the draft when an invalid CSV is imported: %s", async (text) => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData([firstHistory], "first")} />);
    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    const panel = screen.getByRole("heading", { name: "Editable draft" }).closest("main")!;
    const row = rowByAlias(panel, "Alpha");
    fireEvent.change(within(row).getByRole("textbox"), { target: { value: "Unexported note" } });
    await user.upload(fileInput(), csvFile(text, "invalid.csv"));
    expect(await screen.findByText(/^Import blocked:/)).toBeInTheDocument();
    expect(within(row).getByRole("textbox")).toHaveValue("Unexported note");
    expect(row.querySelector("select")).toHaveValue("merge");
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
  });

  it("reports a file read failure without entering edit mode", async () => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData()} />);
    const file = new File([], "unreadable.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => { throw new Error("Read failed"); } });
    await user.upload(fileInput(), file);
    expect(await screen.findByText("Import blocked: Read failed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "second.csv" })).toBeInTheDocument();
  });

  it("accepts a header-only export as an all-keep draft", async () => {
    const user = userEvent.setup();
    render(<MappingStatusReview data={mappingData()} />);
    await user.upload(fileInput(), csvFile("action,source_id,target_id,source_alias,target_alias,notes\n", "empty-rules.csv"));
    const panel = (await screen.findByRole("heading", { name: "Editable draft" })).closest("main")!;
    for (const select of within(panel).getAllByRole("combobox")) expect(select).toHaveValue("keep");
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
  });

  it("exports only explicit rows with CSV escaping and imports them unchanged", async () => {
    const user = userEvent.setup();
    let exported: Blob | undefined;
    const createObjectURL = vi.fn((blob: Blob) => {
      exported = blob;
      return "blob:mapping";
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<MappingStatusReview data={mappingData([firstHistory], "first")} />);

    await user.click(screen.getByRole("button", { name: "Edit draft" }));
    await user.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(await blobText(exported!)).toBe(
      "action,source_id,target_id,source_alias,target_alias,notes\n" +
      'merge,a,b,Alpha,beta,"merge, ""review"""\n'
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mapping");
    await user.upload(fileInput(), csvFile(await blobText(exported!), "roundtrip.csv"));
    const panel = screen.getByRole("heading", { name: "Editable draft" }).closest("main")!;
    const row = rowByAlias(panel, "Alpha");
    expect(row.querySelector("select")).toHaveValue("merge");
    expect(row.querySelector("input[list]")).toHaveValue("b");
    expect(within(row).getByRole("textbox")).toHaveValue('merge, "review"');
  });
});
