import { NextResponse } from "next/server";
import { parseLinkPreview, partituraUrlOf } from "../../../core/partituraLink";

const MAX_HTML_BYTES = 300_000;
const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

/** Open Graph metadata of a Partitura page, for the banner that replaces a lone link in a song.
 *  Only partitura.com.ar is fetched: anything else is rejected before any request is made, and
 *  redirects aren't followed, so the route can't be used to reach another host. */
export async function GET(request: Request) {
  const target = partituraUrlOf(new URL(request.url).searchParams.get("url") ?? "");
  if (!target) return NextResponse.json({ error: "Link no admitido." }, { status: 400 });

  try {
    const response = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { accept: "text/html", "user-agent": "ElSilbadorLinkPreview/1.0" },
    });
    if (!response.ok) return NextResponse.json({ error: "Página no disponible." }, { status: 502 });

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (reader && received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
    }
    await reader?.cancel();
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    return NextResponse.json(parseLinkPreview(html, target), { headers: { "cache-control": CACHE_CONTROL } });
  } catch {
    return NextResponse.json({ error: "No se pudo leer la página." }, { status: 502 });
  }
}
