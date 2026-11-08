import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllGlobals());

const request = (url: string) => new Request(`http://localhost/api/link-preview?url=${encodeURIComponent(url)}`);

describe("GET /api/link-preview", () => {
  it("never fetches a host other than partitura.com.ar", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await GET(request("https://example.com/"))).status).toBe(400);
    expect((await GET(request("http://169.254.169.254/"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the page's metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response('<head><meta property="og:title" content="Hola"><meta property="og:image" content="https://partitura.com.ar/a.png"></head>'),
      ),
    );
    const response = await GET(request("https://partitura.com.ar/es/"));
    expect(await response.json()).toMatchObject({ title: "Hola", image: "https://partitura.com.ar/a.png" });
  });

  it("answers 502 when the page can't be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect((await GET(request("https://partitura.com.ar/"))).status).toBe(502);
  });
});
