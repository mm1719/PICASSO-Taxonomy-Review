import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import App from "../App";

beforeEach(() => {
  window.history.replaceState(null, "", "/valid");
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (!input.startsWith("/data/")) throw new Error("Unexpected external request");
    const text=readFileSync(resolve(process.cwd(),"public",input.slice(1)),"utf8");
    return {json:async()=>JSON.parse(text),text:async()=>text};
  }));
});

describe("generated synthetic demo route integration", () => {
  it("loads the real generated fixture files and navigates all three review sections", async () => {
    const user=userEvent.setup();
    render(<App />);
    await screen.findByRole("heading",{name:"Taxonomy Integration Review"});
    expect(screen.getByRole("note")).toHaveTextContent("Synthetic demo");
    expect(screen.getByText("Synthetic collection A")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Invalid labels",exact:true}));
    await waitFor(()=>expect(window.location.pathname).toBe("/invalid"));
    expect(screen.getByText("Synthetic debris")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Mapping status",exact:true}));
    await waitFor(()=>expect(window.location.pathname).toBe("/mapping"));
    expect(screen.getAllByText("Fictional rounded group").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button",{name:"Valid tree",exact:true}));
    await waitFor(()=>expect(window.location.pathname).toBe("/valid"));
    expect(screen.getByRole("note")).toHaveTextContent("not scientific records");
    expect(vi.mocked(fetch).mock.calls).toHaveLength(5);
  });
});
