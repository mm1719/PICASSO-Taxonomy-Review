import { useEffect, useMemo, useRef, useState } from "react";
import type { MappingRuleRow, MappingTarget } from "../types";

export const MAPPING_DRAFT_KEY = "picasso-taxonomy-review:mapping-draft";
const UNAVAILABLE = "Autosave unavailable. Edits are only in memory; export before reloading or leaving Mapping.";
const INCOMPATIBLE = "Saved draft is incompatible or damaged and has not been overwritten. Download its backup before discarding it. New edits are only in memory.";
const CONFLICT = "Autosave paused: the saved draft changed in another tab. Export this tab's work before reloading or leaving Mapping.";

function decodeDraft(text: string, scope: string, targets: MappingTarget[]): MappingRuleRow[] {
  const stored = JSON.parse(text);
  if (!stored || stored.version !== 1 || stored.scope !== scope
    || !Array.isArray(stored.rows) || stored.rows.length !== targets.length) {
    throw new Error("Incompatible draft");
  }
  const byId = new Map(targets.map((target) => [target.source_id, target]));
  const seen = new Set<string>();
  return stored.rows.map((row: Record<string, unknown> | null) => {
    if (!row || typeof row.source_id !== "string" || !byId.has(row.source_id)
      || seen.has(row.source_id) || typeof row.target_id !== "string"
      || typeof row.notes !== "string"
      || (row.action !== "keep" && row.action !== "merge" && row.action !== "drop")) {
      throw new Error("Invalid draft row");
    }
    seen.add(row.source_id);
    return {
      action: row.action,
      source_id: row.source_id,
      target_id: row.target_id,
      source_alias: byId.get(row.source_id)!.source_alias,
      target_alias: "",
      notes: row.notes,
      validation_status: "ok",
      validation_message: ""
    };
  });
}

export function useMappingDraft(targets: MappingTarget[]) {
  const scope = useMemo(() => JSON.stringify(targets.map((target) => [
    target.source_id, target.source_alias, target.dataset_ids, target.source_labels
  ]).sort((a, b) => a[0].localeCompare(b[0], "en"))), [targets]);
  const [initial] = useState(() => {
    let raw: string | null = null;
    let error = "";
    let rows: MappingRuleRow[] | null = null;
    let blocked = false;
    try {
      raw = window.localStorage.getItem(MAPPING_DRAFT_KEY);
      if (raw !== null) {
        try { rows = decodeDraft(raw, scope, targets); }
        catch { error = INCOMPATIBLE; blocked = true; }
      }
    } catch { error = UNAVAILABLE; }
    return { raw, rows, error, blocked, scope };
  });
  const guard = useRef({ raw: initial.raw, blocked: initial.blocked });
  const [error, setError] = useState(initial.error);
  const [hasSavedDraft, setHasSavedDraft] = useState(initial.raw !== null);

  function conflict(raw: string | null) {
    guard.current = { raw, blocked: true };
    setHasSavedDraft(raw !== null);
    setError(CONFLICT);
  }

  useEffect(() => {
    if (scope !== initial.scope) {
      guard.current.blocked = true;
      setError(INCOMPATIBLE);
    }
    function changed(event: StorageEvent) {
      if (event.key !== null && event.key !== MAPPING_DRAFT_KEY) return;
      try {
        if (event.storageArea !== window.localStorage) return;
        const raw = window.localStorage.getItem(MAPPING_DRAFT_KEY);
        if (raw !== guard.current.raw) conflict(raw);
      } catch { setError(UNAVAILABLE); }
    }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [scope, initial.scope]);

  function save(rows: MappingRuleRow[]) {
    if (guard.current.blocked) return;
    try {
      // shortcut: this optimistic guard is not a lock; use one editing tab until collaboration is required.
      const current = window.localStorage.getItem(MAPPING_DRAFT_KEY);
      if (current !== guard.current.raw) { conflict(current); return; }
      const raw = JSON.stringify({
        version: 1,
        scope,
        rows: rows.map(({ action, source_id, target_id, notes }) => ({ action, source_id, target_id, notes }))
      });
      // Save in the edit handler so navigation cannot outrun a debounce or effect.
      window.localStorage.setItem(MAPPING_DRAFT_KEY, raw);
      guard.current.raw = raw;
      setHasSavedDraft(true);
      setError("");
    } catch { setError(UNAVAILABLE); }
  }

  function discard() {
    try {
      const current = window.localStorage.getItem(MAPPING_DRAFT_KEY);
      if (current !== guard.current.raw) { conflict(current); return false; }
      window.localStorage.removeItem(MAPPING_DRAFT_KEY);
      guard.current = { raw: null, blocked: false };
      setHasSavedDraft(false);
      setError("");
      return true;
    } catch { setError(UNAVAILABLE); return false; }
  }

  return {
    initialRows: initial.rows,
    error,
    hasSavedDraft,
    blocked: guard.current.blocked,
    savedText: guard.current.raw,
    save,
    discard
  };
}
