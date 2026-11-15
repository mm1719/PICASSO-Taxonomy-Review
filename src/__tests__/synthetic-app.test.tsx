import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StrictMode } from "react";
import App from "../App";

beforeEach(() => {
  window.history.replaceState(null, "", "/valid");
  vi.stubGlobal("fetch", vi.fn(async (input: string) => {
    if (!input.startsWith("/data/")) throw new Error("Unexpected external request");
    const text=readFileSync(resolve(process.cwd(),"public",input.slice(1)),"utf8");
    return new Response(text, { status: 200 });
  }));
});

describe("generated synthetic demo route integration", () => {
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
