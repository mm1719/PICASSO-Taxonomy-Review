import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import mapping from "../public/data/mapping_status.json" with { type: "json" };
import publication from "../public/data/publication.json" with { type: "json" };
import metadata from "../public/data/demo_data_metadata.json" with { type: "json" };
import { parseCsv } from "../src/utils/csv";

// Production checks are read-only; browser contexts and uploaded drafts are disposable.
const test = base.extend<{ readOnly: void }>({
  readOnly: [async ({ page, context }, use) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    context.on("page", (tab) => tab.on("pageerror", (error) => failures.push(error.message)));
    context.on("response", (response) => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    await context.route("**/*", async (route) => {
      if (!["GET", "HEAD"].includes(route.request().method())) {
        failures.push(`Blocked write: ${route.request().method()} ${route.request().url()}`);
        await route.abort();
      } else await route.continue();
    });
    await use();
    expect(failures, "browser errors, HTTP errors, or attempted writes").toEqual([]);
  }, { auto: true }]
});

const latest = mapping.histories.find((history) => history.history_id === mapping.latest_history_id)!;
const rule = latest.rows.find((row) => row.action === "merge")!;
const fields = mapping.export_fields;
const draftKey = "picasso-taxonomy-review:mapping-draft";

async function open(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Taxonomy Integration Review", exact: true })).toBeVisible();
  await expect(page.locator(".drawer")).toHaveCount(0);
}

function row(page: Page, sourceId = rule.source_id) {
  return page.locator(".mapping-table tbody tr").filter({
    has: page.locator("td:nth-child(2)", { hasText: new RegExp(`^${sourceId}$`) })
  });
}

async function exportCsv(page: Page, info: TestInfo, name: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/^manual_mapping_rules_\d{4}-\d{2}-\d{2}\.csv$/);
  const path = info.outputPath(name);
  await download.saveAs(path);
  await info.attach(name, { path, contentType: "text/csv" });
  return { path, text: await readFile(path, "utf8") };
}

async function importCsv(page: Page, path: string) {
  const pending = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import CSV", exact: true }).click();
  await (await pending).setFiles(path);
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

async function fitsViewport(page: Page) {
  expect.soft(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width
  );
}

test("routes, closed drawers and responsive page bounds", async ({ page }, info) => {
  for (const route of ["/valid", "/invalid", "/mapping"]) {
    await open(page, route);
    await fitsViewport(page);
    await screenshot(page, info, route.slice(1));
  }
  await row(page).locator("td").nth(1).click();
  await expect(page.locator(".drawer")).toBeVisible();
  await page.getByRole("button", { name: "Close class detail drawer" }).click();
  await expect(page.locator(".drawer")).toHaveCount(0);
});

test("source credits, license links and attribution download", async ({ page }, info) => {
  await open(page, "/valid");
  await page.getByRole("button", { name: "Sources and licenses" }).click();
  const modal = page.getByRole("dialog", { name: "Terminology help" });
  for (const dataset of publication.datasets) {
    await expect(modal.getByRole("link", { name: dataset.title, exact: true })).toHaveAttribute("href", dataset.source_url);
    await expect(modal.getByText(dataset.creators, { exact: true })).toBeVisible();
  }
  const licenses = modal.getByRole("link", { name: "CC BY 4.0", exact: true });
  await expect(licenses).toHaveCount(2);
  for (const link of await licenses.all()) {
    await expect(link).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
  }
  expect.soft(await page.locator(".help-modal").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await screenshot(page, info, "sources-and-licenses");
  const pending = page.waitForEvent("download");
  await modal.getByRole("link", { name: "Image attribution CSV" }).click();
  const path = info.outputPath("image_attributions.csv");
  await (await pending).saveAs(path);
  const bytes = await readFile(path);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(metadata.public_artifacts["data/image_attributions.csv"].sha256);
  expect(parseCsv(bytes.toString())).toHaveLength(publication.datasets.reduce((n, dataset) => n + dataset.thumbnail_count, 0));
  await page.getByRole("button", { name: "Close help" }).click();
  await expect(modal).toHaveCount(0);
});

for (const sample of [
  { route: "/valid", label: "Actinoptychus", dataset: "life_watch", count: 5 },
  { route: "/valid", label: "Akashiwo_sanguinea", dataset: "medplanktonset", count: 5 },
  { route: "/invalid", label: "Artefact", dataset: "life_watch", count: 5 },
  { route: "/invalid", label: "Copepod_eggs", dataset: "medplanktonset", count: 1 }
]) {
  test(`real thumbnails: ${sample.label}`, async ({ page }, info) => {
    await open(page, sample.route);
    if (sample.route === "/valid") {
      await page.getByRole("textbox", { name: "Search term 1", exact: true }).fill(sample.label);
      await page.getByRole("button", { name: "Expand all", exact: true }).click();
      await page.locator(".terminal-chip").filter({ has: page.getByText(sample.label, { exact: true }) }).click();
    } else {
      if (sample.label === "Copepod_eggs") {
        await page.getByRole("button", { name: /^Taxonomic Mismatch \(\d+\)$/ }).click();
      }
      await page.getByRole("textbox", { name: "Invalid search term 1", exact: true }).fill(sample.label);
      await page.locator("tbody tr").filter({ hasText: sample.label }).click();
    }
    await expect(page.locator(".drawer")).toBeVisible();
    await page.getByRole("button", { name: `Open ${sample.count} sample thumbnails`, exact: true }).click();
    const images = page.locator(".sample-card img");
    await expect(images).toHaveCount(sample.count);
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0 && element.naturalHeight > 0)).toBe(true);
      await expect(image).toHaveAttribute("src", new RegExp(`^/images/${sample.dataset}/.*\\.jpg$`));
    }
    const dataset = publication.datasets.find((item) => item.dataset_id === sample.dataset)!;
    const credits = page.locator(".sample-credits");
    await expect(credits).toContainText(dataset.creators);
    await expect(credits.getByRole("link", { name: dataset.name, exact: true })).toHaveAttribute("href", dataset.source_url);
    await expect(credits.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute("href", dataset.license_url);
    await fitsViewport(page);
    await screenshot(page, info, sample.label);
    await page.getByRole("button", { name: sample.route === "/valid" ? "Back to taxonomy" : "Back to invalid labels", exact: true }).click();
    await page.getByRole("button", { name: "Close detail drawer" }).click();
    await expect(page.locator(".drawer")).toHaveCount(0);
  });
}

test("real mapping history exports all rules and round-trips through a file", async ({ page }, info) => {
  await open(page, "/mapping");
  await expect(page.locator(".mapping-scope")).toHaveText(mapping.scope_note);
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  const first = await exportCsv(page, info, "history.csv");
  const canonical = (rows: Record<string, string>[]) => rows.map((row) => fields.map((field) => row[field])).sort((a, b) => a[1].localeCompare(b[1]));
  expect(canonical(parseCsv(first.text))).toEqual(canonical(latest.rows.filter((row) => row.action === "merge" || row.action === "drop")));
  await row(page).locator("select").selectOption("keep");
  await importCsv(page, first.path);
  await expect(row(page).locator("select")).toHaveValue(rule.action);
  await expect(row(page).locator("input[list]")).toHaveValue(rule.target_id);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const second = await exportCsv(page, info, "history-reimported.csv");
  expect(canonical(parseCsv(second.text))).toEqual(canonical(parseCsv(first.text)));
});

test("CSV notes preserve spaces, quotes, commas, newlines and Unicode", async ({ page }, info) => {
  await open(page, "/mapping");
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  const note = '  Browser, "round trip"\n\u4fdd\u7559\u8349\u7a3f  ';
  await row(page).locator("textarea").fill(note);
  const first = await exportCsv(page, info, "notes.csv");
  expect(parseCsv(first.text).find((item) => item.source_id === rule.source_id)?.notes).toBe(note);
  await row(page).locator("textarea").fill("temporary replacement");
  await importCsv(page, first.path);
  await expect(row(page).locator("textarea")).toHaveValue(note);
  const second = await exportCsv(page, info, "notes-reimported.csv");
  expect(parseCsv(second.text).find((item) => item.source_id === rule.source_id)?.notes).toBe(note);
});

test("failed imports and cancelled history replacement preserve the changed draft", async ({ page }, info) => {
  await open(page, "/mapping");
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  await row(page).locator("textarea").fill("Unexported browser draft");
  await expect(page.getByRole("button", { name: "Edit draft", exact: true })).toBeDisabled();
  const before = await exportCsv(page, info, "protected-draft.csv");
  const badFiles = [
    ["source,target\nunknown,none\n", "Missing CSV columns: action, source_id, target_id"],
    ["action,source_id,target_id\nmerge,unknown,none\n", "source_id not found (unknown)"],
    [`action,source_id,target_id\ndrop,${rule.source_id},\ndrop,${rule.source_id},\n`, `Duplicate source_id: ${rule.source_id}`],
    [`action,source_id,target_id,notes\nmerge,${rule.source_id},${rule.target_id},"unfinished`, "Unclosed quoted CSV field"],
    [`action,source_id,target_id\ninvalid,${rule.source_id},\n`, "Invalid action in CSV row 2"]
  ];
  for (const [index, [contents, message]] of badFiles.entries()) {
    const path = info.outputPath(`rejected-${index}.csv`);
    await writeFile(path, contents);
    await importCsv(page, path);
    await expect(page.getByRole("alert")).toHaveText(`Import blocked: ${message}`);
    expect((await exportCsv(page, info, `preserved-${index}.csv`)).text).toBe(before.text);
  }
  await page.locator(".mapping-sidebar select").selectOption(mapping.histories[0].history_id);
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toContain("Replace the changed draft");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await expect(row(page).locator("textarea")).toHaveValue("Unexported browser draft");
  await page.getByRole("button", { name: "View latest/history", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await expect(row(page).locator("textarea")).toHaveValue(mapping.histories[0].rows.find((item) => item.source_id === rule.source_id)!.notes);
  await screenshot(page, info, "mapping-draft");
  await page.reload();
  await expect(row(page).locator("textarea")).toHaveValue(mapping.histories[0].rows.find((item) => item.source_id === rule.source_id)!.notes);
  await expect(row(page).locator("select")).toHaveValue(mapping.histories[0].rows.find((item) => item.source_id === rule.source_id)!.action);
});

test("unresolved merge blocks export; self-merge and header-only import normalize to keep", async ({ page }, info) => {
  await open(page, "/mapping");
  const path = info.outputPath("unresolved.csv");
  await writeFile(path, `action,source_id,target_id\nmerge,${rule.source_id},unresolved\n`);
  await importCsv(page, path);
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  await row(page).locator("input[list]").fill(rule.source_id);
  await expect(row(page).locator("select")).toHaveValue("keep");
  const empty = await exportCsv(page, info, "all-keep.csv");
  expect(parseCsv(empty.text)).toEqual([]);
  await row(page).locator("select").selectOption("drop");
  await importCsv(page, empty.path);
  await expect(row(page).locator("select")).toHaveValue("keep");
  expect(parseCsv((await exportCsv(page, info, "all-keep-reimported.csv")).text)).toEqual([]);
});

test("autosaved drafts survive reload, route changes, history navigation and a reopened tab", async ({ page, context }, info) => {
  await open(page, "/mapping");
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  const note = '  Autosaved, "notes"\n\u4fdd\u7559\u8349\u7a3f  ';
  await row(page).locator("textarea").fill(note);
  await expect(page.getByRole("status")).toHaveText("Draft saved in this browser.");
  const before = await exportCsv(page, info, "before-reload.csv");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Editable draft", exact: true })).toBeVisible();
  await expect(row(page).locator("textarea")).toHaveValue(note);
  for (const label of ["Valid tree", "Invalid labels", "Mapping status"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
  }
  await expect(row(page).locator("textarea")).toHaveValue(note);
  await page.goBack();
  await expect(page).toHaveURL(/\/invalid$/);
  await page.goForward();
  await expect(row(page).locator("textarea")).toHaveValue(note);
  expect((await exportCsv(page, info, "after-navigation.csv")).text).toBe(before.text);
  const reopened = await context.newPage();
  await page.close();
  await open(reopened, "/mapping");
  await expect(row(reopened).locator("textarea")).toHaveValue(note);
  await reopened.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  await screenshot(reopened, info, "restored-draft");
});

test("autosave retains incomplete merges and keep notes without relaxing export validation", async ({ page }) => {
  await open(page, "/mapping");
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  await row(page).locator("select").selectOption("keep");
  await row(page).locator("textarea").fill("Keep notes are still a draft");
  await page.reload();
  await expect(row(page).locator("select")).toHaveValue("keep");
  await expect(row(page).locator("textarea")).toHaveValue("Keep notes are still a draft");
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  await row(page).locator("select").selectOption("merge");
  await row(page).locator("input[list]").fill("unfinished-target");
  await page.reload();
  await expect(row(page).locator("input[list]")).toHaveValue("unfinished-target");
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeDisabled();
});

test("imported drafts persist and rejected imports leave the saved copy unchanged", async ({ page }, info) => {
  await open(page, "/mapping");
  const imported = info.outputPath("persist-import.csv");
  await writeFile(imported, `action,source_id,target_id,notes\ndrop,${rule.source_id},,imported draft\n`);
  await importCsv(page, imported);
  await expect(row(page).locator("select")).toHaveValue("drop");
  const saved = await page.evaluate((key) => localStorage.getItem(key), draftKey);
  const bad = info.outputPath("rejected-import.csv");
  await writeFile(bad, "action,source_id,target_id\ndrop,unknown-source,\n");
  await importCsv(page, bad);
  await expect(page.getByRole("alert")).toContainText("Import blocked:");
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(saved);
  await page.reload();
  await expect(row(page).locator("select")).toHaveValue("drop");
  await expect(row(page).locator("textarea")).toHaveValue("imported draft");
  const exported = parseCsv((await exportCsv(page, info, "restored-import.csv")).text);
  expect(exported).toHaveLength(1);
  expect(exported[0]).toMatchObject({ action: "drop", source_id: rule.source_id, notes: "imported draft" });
});

test("discard requires confirmation and does not erase unrelated browser storage", async ({ page }) => {
  await open(page, "/mapping");
  await page.evaluate(() => localStorage.setItem("unrelated-key", "keep"));
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  const saved = await page.evaluate((key) => localStorage.getItem(key), draftKey);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(saved);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Discard draft", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("No saved draft.");
  await page.reload();
  await expect(page.getByRole("heading", { name: latest.file_name, exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("unrelated-key"))).toBe("keep");
});

test("incompatible saved drafts are not applied or overwritten and can be backed up", async ({ page }, info) => {
  await open(page, "/mapping");
  const damaged = '{"version":99,"notes":"Retain original content"}';
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: draftKey, raw: damaged });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("incompatible or damaged");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download saved backup" }).click();
  const backup = await pending;
  expect(backup.suggestedFilename()).toBe("picasso_mapping_draft_backup.json");
  const path = info.outputPath("incompatible-backup.json");
  await backup.saveAs(path);
  expect(await readFile(path, "utf8")).toBe(damaged);
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(damaged);
  await screenshot(page, info, "incompatible-draft");
});

test("a stale tab pauses autosave when another tab changes the stored draft", async ({ page, context }, info) => {
  await open(page, "/mapping");
  await page.getByRole("button", { name: "Edit draft", exact: true }).click();
  await page.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  const other = await context.newPage();
  await open(other, "/mapping");
  await other.getByRole("textbox", { name: "Mapping search term 1", exact: true }).fill(rule.source_id);
  await row(page).locator("textarea").fill("Latest saved tab");
  await expect(other.getByRole("alert")).toContainText("changed in another tab");
  await row(other).locator("textarea").fill("Separate unsaved tab");
  expect(await other.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).rows.find((item: {source_id: string}) => item.source_id === id).notes, { key: draftKey, id: rule.source_id })).toBe("Latest saved tab");
  expect(parseCsv((await exportCsv(other, info, "conflicting-tab.csv")).text).find((item) => item.source_id === rule.source_id)?.notes).toBe("Separate unsaved tab");
  await screenshot(other, info, "tab-conflict");
  other.once("dialog", (dialog) => dialog.accept());
  await other.reload();
  await expect(row(other).locator("textarea")).toHaveValue("Latest saved tab");
});

test("every published artifact matches its hash and every thumbnail decodes in Chromium", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "The identical asset set is checked once.");
  test.setTimeout(180_000);
  await open(page, "/valid");
  expect(await page.evaluate(async () => (await fetch("/data/demo_data_metadata.json")).json())).toEqual(metadata);
  const results = await page.evaluate(async (artifacts) => {
    const pending = Object.entries(artifacts);
    const failures: string[] = [];
    let decoded = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (pending.length) {
        const [path, expected] = pending.pop()!;
        try {
          const response = await fetch(`/${path}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const bytes = await response.arrayBuffer();
          const digest = await crypto.subtle.digest("SHA-256", bytes);
          const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
          if (hash !== expected.sha256 || bytes.byteLength !== expected.bytes) throw new Error("hash/size mismatch");
          if (path.endsWith(".jpg")) {
            const image = new Image();
            const url = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
            try {
              image.src = url;
              await image.decode();
              if (!image.naturalWidth || !image.naturalHeight) throw new Error("empty image");
              decoded++;
            } finally { URL.revokeObjectURL(url); }
          }
        } catch (error) { failures.push(`${path}: ${error}`); }
      }
    }));
    return { artifacts: Object.keys(artifacts).length, decoded, failures };
  }, metadata.public_artifacts);
  await info.attach("asset-verification.json", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  expect(results.failures).toEqual([]);
  expect(results.decoded).toBe(publication.datasets.reduce((n, dataset) => n + dataset.thumbnail_count, 0));
});
