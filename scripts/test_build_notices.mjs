import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const noticeFile = "THIRD_PARTY_LICENSES.md";

test("built notices contain the versions and full license texts of bundled packages", () => {
  const notices = readFileSync(new URL(`dist/${noticeFile}`, root), "utf8");
  for (const name of [
    "react", "react-dom", "scheduler", "lucide-react",
    "@tanstack/react-table", "@tanstack/table-core"
  ]) {
    const directory = new URL(`node_modules/${name}/`, root);
    const { version } = JSON.parse(readFileSync(new URL("package.json", directory), "utf8"));
    const license = readFileSync(new URL("LICENSE", directory), "utf8").trim();
    assert.ok(notices.includes(`## ${name} - ${version}`), `Missing version for ${name}`);
    assert.ok(notices.includes(license), `Missing license text for ${name}`);
  }
});

test("each built JavaScript chunk points to the shipped notices", () => {
  const assets = new URL("dist/assets/", root);
  const chunks = readdirSync(assets).filter((file) => file.endsWith(".js"));
  assert.ok(chunks.length > 0, "No built JavaScript chunks found");
  for (const file of chunks) {
    const code = readFileSync(new URL(file, assets), "utf8");
    assert.ok(code.startsWith(`/*! Third-party licenses: /${noticeFile} */`), file);
  }
});
