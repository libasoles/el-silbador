"use client";

import { useRouter } from "next/navigation";
import App from "../../editor/App";
import { songEditPath } from "../../editor/songPaths";

export default function NuevaPage() {
  const router = useRouter();

  return (
    <App
      onSongCreated={(_id, slug) => router.replace(songEditPath(slug), { scroll: false })}
      onDeleted={() => router.replace("/")}
    />
  );
}
