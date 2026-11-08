import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartituraBanner } from "./PartituraBanner";

const URL_ = "https://partitura.com.ar/es/demos/canto-en-la-rama/";

afterEach(() => vi.unstubAllGlobals());

describe("PartituraBanner", () => {
  it("shows the link right away and fills in the page's metadata when it arrives", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ title: "Canto en la rama", description: "Tres voces", image: "https://partitura.com.ar/og.png", siteName: "Partitura" }),
      }),
    );
    const { container } = render(<PartituraBanner text={URL_} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", URL_);
    expect(await screen.findByText("Canto en la rama")).toBeTruthy();
    expect(screen.getByText("Tres voces")).toBeTruthy();
    expect(container.querySelector("img")).toHaveAttribute("src", "https://partitura.com.ar/og.png");
  });

  it("keeps the placeholder banner when the metadata can't be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<PartituraBanner text={URL_ + "?x=1"} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", URL_ + "?x=1");
    expect(screen.getByText("Partitura")).toBeTruthy();
  });

  it("renders nothing for a link that isn't Partitura's", () => {
    const { container } = render(<PartituraBanner text="https://example.com/" />);
    expect(container.firstChild).toBeNull();
  });
});
