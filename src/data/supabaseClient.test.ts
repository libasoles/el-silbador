import { describe, expect, it, vi } from "vitest";
import { createSupabaseFetch } from "./supabaseClient";

describe("createSupabaseFetch", () => {
  it("reports a clear Docker hint when Supabase local refuses the connection", async () => {
    const connectionRefused = Object.assign(new TypeError("fetch failed"), {
      cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:54321"), {
        code: "ECONNREFUSED",
      }),
    });
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(connectionRefused);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const supabaseFetch = createSupabaseFetch("http://127.0.0.1:54321", fetchMock);

    await expect(supabaseFetch("http://127.0.0.1:54321/rest/v1/songs")).rejects.toBe(connectionRefused);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Docker no está corriendo o Supabase local no fue iniciado"),
    );
    errorSpy.mockRestore();
  });
});
