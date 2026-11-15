import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { MappingRuleRow, MappingTarget } from "../../types";
import { MAPPING_DRAFT_KEY, useMappingDraft } from "../useMappingDraft";

const targets: MappingTarget[] = ["a", "b"].map((id) => ({
  source_id: id, source_alias: `Label ${id}`, dataset_ids: "life_watch", source_labels: id,
  image_count: 1, valid_statuses: "valid", invalid_reasons: "", risk_flags: "", special_tags: ""
}));
const rows: MappingRuleRow[] = targets.map((target) => ({
  action: "keep", source_id: target.source_id, source_alias: target.source_alias,
  target_id: "", target_alias: "", notes: "  preserved\ntext  ",
  validation_status: "ok", validation_message: ""
}));

function savedDraft() {
  const hook = renderHook(() => useMappingDraft(targets));
  act(() => hook.result.current.save(rows));
  const raw = window.localStorage.getItem(MAPPING_DRAFT_KEY)!;
  hook.unmount();
  return raw;
}

describe("browser mapping draft storage", () => {
  it("does not write on mount, including StrictMode, and stores only editable fields", () => {
    const write = vi.spyOn(Storage.prototype, "setItem");
    const hook = renderHook(() => useMappingDraft(targets), {
      wrapper: ({ children }) => createElement(StrictMode, null, children)
    });
    expect(write).not.toHaveBeenCalled();
    expect(hook.result.current.initialRows).toBeNull();
    act(() => hook.result.current.save(rows));
    const stored = JSON.parse(window.localStorage.getItem(MAPPING_DRAFT_KEY)!);
    expect(stored.version).toBe(1);
    expect(Object.keys(stored.rows[0])).toEqual(["action", "source_id", "target_id", "notes"]);
    expect(stored.rows).toHaveLength(2);
    hook.unmount();
    const restored = renderHook(() => useMappingDraft([...targets].reverse()));
    expect(restored.result.current.initialRows).toEqual(rows);
    expect(write).toHaveBeenCalledOnce();
  });

  it.each([
    ["JSON syntax", () => "{broken"],
    ["null", () => "null"],
    ["version", (draft: object) => JSON.stringify({ ...draft, version: 2 })],
    ["scope", (draft: object) => JSON.stringify({ ...draft, scope: "another dataset" })],
    ["rows", (draft: object) => JSON.stringify({ ...draft, rows: null })],
    ["missing row", (draft: object) => JSON.stringify({ ...draft, rows: [rows[0]] })],
    ["duplicate row", (draft: object) => JSON.stringify({ ...draft, rows: [rows[0], rows[0]] })],
    ["source", (draft: object) => JSON.stringify({ ...draft, rows: [{ ...rows[0], source_id: "retired" }, rows[1]] })],
    ["action", (draft: object) => JSON.stringify({ ...draft, rows: [{ ...rows[0], action: "unknown" }, rows[1]] })],
    ["target", (draft: object) => JSON.stringify({ ...draft, rows: [{ ...rows[0], target_id: 123 }, rows[1]] })],
    ["notes", (draft: object) => JSON.stringify({ ...draft, rows: [{ ...rows[0], notes: null }, rows[1]] })],
    ["null row", (draft: object) => JSON.stringify({ ...draft, rows: [null, rows[1]] })]
  ])("preserves damaged storage without automatic overwrite: %s", (_, damage) => {
    const raw = damage(JSON.parse(savedDraft()));
    window.localStorage.setItem(MAPPING_DRAFT_KEY, raw);
    const hook = renderHook(() => useMappingDraft(targets));
    expect(hook.result.current.initialRows).toBeNull();
    expect(hook.result.current.error).toContain("incompatible or damaged");
    expect(hook.result.current.savedText).toBe(raw);
    act(() => hook.result.current.save(rows));
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe(raw);
  });

  it.each(["source_id", "source_alias", "dataset_ids", "source_labels"])(
    "refuses a different target identity: %s", (field) => {
      const raw = savedDraft();
      const changed = targets.map((target, index) => index ? target : { ...target, [field]: "changed" });
      const hook = renderHook(() => useMappingDraft(changed));
      expect(hook.result.current.initialRows).toBeNull();
      act(() => hook.result.current.save(rows));
      expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe(raw);
    }
  );

  it("allows count-only changes but blocks a target identity change while mounted", () => {
    const raw = savedDraft();
    const hook = renderHook(({ entries }) => useMappingDraft(entries), {
      initialProps: { entries: targets.map((target) => ({ ...target, image_count: 99 })) }
    });
    expect(hook.result.current.initialRows).toEqual(rows);
    hook.rerender({ entries: targets.map((target) => ({ ...target, source_alias: "renamed" })) });
    expect(hook.result.current.error).toContain("incompatible");
    act(() => hook.result.current.save(rows));
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe(raw);
  });

  it("handles denied reads and retries without losing existing stored content", () => {
    const raw = savedDraft();
    const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    const hook = renderHook(() => useMappingDraft(targets));
    expect(hook.result.current.error).toContain("Autosave unavailable");
    act(() => hook.result.current.save(rows));
    expect(hook.result.current.error).toContain("Autosave unavailable");
    read.mockRestore();
    act(() => hook.result.current.save(rows));
    expect(hook.result.current.error).toContain("changed in another tab");
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe(raw);
  });

  it("retains the last stored draft on quota failure and permits retry", () => {
    const raw = savedDraft();
    const hook = renderHook(() => useMappingDraft(targets));
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    const changed = rows.map((row) => ({ ...row, notes: "new note" }));
    act(() => hook.result.current.save(changed));
    expect(hook.result.current.error).toContain("Autosave unavailable");
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe(raw);
    write.mockRestore();
    act(() => hook.result.current.save(changed));
    expect(hook.result.current.error).toBe("");
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toContain("new note");
  });

  it("checks for external writes even before a storage event arrives", () => {
    savedDraft();
    const hook = renderHook(() => useMappingDraft(targets));
    window.localStorage.setItem(MAPPING_DRAFT_KEY, "newer external draft");
    act(() => hook.result.current.save(rows));
    expect(hook.result.current.blocked).toBe(true);
    expect(hook.result.current.error).toContain("changed in another tab");
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe("newer external draft");
    window.localStorage.setItem(MAPPING_DRAFT_KEY, "even newer draft");
    act(() => expect(hook.result.current.discard()).toBe(false));
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe("even newer draft");
    window.localStorage.setItem("unrelated-key", "keep");
    act(() => expect(hook.result.current.discard()).toBe(true));
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBeNull();
    expect(window.localStorage.getItem("unrelated-key")).toBe("keep");
  });

  it("listens for other tabs, ignores unrelated storage, and preserves external clearing", () => {
    savedDraft();
    const hook = renderHook(() => useMappingDraft(targets));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "unrelated", storageArea: window.localStorage })));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: MAPPING_DRAFT_KEY, storageArea: window.sessionStorage })));
    expect(hook.result.current.error).toBe("");
    window.localStorage.removeItem(MAPPING_DRAFT_KEY);
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null, storageArea: window.localStorage })));
    expect(hook.result.current.blocked).toBe(true);
    act(() => hook.result.current.save(rows));
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBeNull();
  });

  it("reports removal failure without claiming the draft was discarded", () => {
    const raw = savedDraft();
    const hook = renderHook(() => useMappingDraft(targets));
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Denied"); });
    act(() => expect(hook.result.current.discard()).toBe(false));
    expect(window.localStorage.getItem(MAPPING_DRAFT_KEY)).toBe(raw);
    expect(hook.result.current.error).toContain("Autosave unavailable");
  });

  it("handles storage access being revoked during an external change notification", () => {
    savedDraft();
    const hook = renderHook(() => useMappingDraft(targets));
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Denied"); });
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: MAPPING_DRAFT_KEY, storageArea: window.localStorage })));
    expect(hook.result.current.error).toContain("Autosave unavailable");
  });
});
