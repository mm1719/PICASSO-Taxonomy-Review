import { describe, expect, it } from "vitest";
import { parseCsv, splitCell } from "../csv";

describe("parseCsv", () => {
  it("parses quoted fields, escaped quotes, and CRLF rows", () => {
    const rows = parseCsv<{ id: string; label: string; note: string }>(
      'id,label,note\r\n1,Tripos,plain\r\n2,"A,B","has comma"\r\n3,"quoted""name","line one\nline two"\r\n'
    );

    expect(rows).toEqual([
      { id: "1", label: "Tripos", note: "plain" },
      { id: "2", label: "A,B", note: "has comma" },
      { id: "3", label: 'quoted"name', note: "line one\nline two" }
    ]);
  });

  it("fills missing trailing cells with empty strings", () => {
    const rows = parseCsv<{ a: string; b: string; c: string }>("a,b,c\n1,2\n");

    expect(rows).toEqual([{ a: "1", b: "2", c: "" }]);
  });

  it.each([
    ["", "Missing CSV columns"],
    ["action,source,target\nmerge,a,b\n", "Missing CSV columns"],
    ["action,source_id,target_id,source_id\nmerge,a,b,c\n", "Duplicate CSV columns"],
    ['action,source_id,target_id,notes\nmerge,a,b,"unfinished', "Unclosed quoted CSV field"]
  ])("rejects malformed mapping CSV: %s", (text, message) => {
    expect(() => parseCsv(text, ["action", "source_id", "target_id"])).toThrow(message);
  });

  it("accepts a header-only export with no explicit rules", () => {
    expect(parseCsv("action,source_id,target_id,notes\n", ["action", "source_id", "target_id"]))
      .toEqual([]);
  });
});

describe("splitCell", () => {
  it("splits pipe-delimited cells and removes empty segments", () => {
    expect(splitCell("a||b|")).toEqual(["a", "b"]);
  });
});
