import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../test/matchMedia";
import { useIsMobile } from "./useIsMobile";

function Probe() {
  return <p>{useIsMobile() ? "mobile" : "desktop"}</p>;
}

describe("useIsMobile", () => {
  afterEach(() => vi.unstubAllGlobals());

  // Hydrating by hand (not through Testing Library), so tell React that act() is in use.
  beforeEach(() => vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true));

  it("hydrates a mobile viewport without a mismatch, then switches to the mobile view", async () => {
    // The server has no viewport, so it always renders the desktop markup.
    mockMatchMedia(false);
    const html = renderToString(<Probe />);
    expect(html).toContain("desktop");

    mockMatchMedia(true);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      hydrateRoot(container, <Probe />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(container.textContent).toBe("mobile");
    consoleError.mockRestore();
    container.remove();
  });
});
