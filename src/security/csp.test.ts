import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./csp";

describe("buildContentSecurityPolicy", () => {
  const prod = buildContentSecurityPolicy({ supabaseUrl: "https://abc.supabase.co/", isDev: false });

  it("blocks plugins, framing and base-tag rewrites", () => {
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("base-uri 'self'");
  });

  it("only frames the YouTube no-cookie player", () => {
    expect(prod).toContain("frame-src https://www.youtube-nocookie.com;");
  });

  it("allows the configured Supabase origin to be reached", () => {
    expect(prod).toMatch(/connect-src [^;]*https:\/\/abc\.supabase\.co(?=[ ;])/);
  });

  it("allows dictionary requests without permitting third-party dictionary scripts", () => {
    const connect = prod.split("; ").find(d => d.startsWith("connect-src"))!;
    const scripts = prod.split("; ").find(d => d.startsWith("script-src"))!;
    for (const origin of ["https://es.wiktionary.org", "https://en.wiktionary.org", "https://rae-api.com"]) {
      expect(connect).toContain(origin);
      expect(scripts).not.toContain(origin);
    }
  });

  it("only allows eval and plain http in development", () => {
    const dev = buildContentSecurityPolicy({ supabaseUrl: "http://127.0.0.1:54321", isDev: true });
    expect(prod).not.toContain("unsafe-eval");
    expect(prod).toContain("upgrade-insecure-requests");
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("http://127.0.0.1:54321");
    expect(dev).not.toContain("upgrade-insecure-requests");
  });
});
