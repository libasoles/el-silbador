"use client";

import { useRouter } from "next/navigation";
import App from "../../editor/App";

export default function NuevaPage() {
  const router = useRouter();

  return (
    <App
      onSongCreated={(_id, slug) => router.replace(`/cancion/${slug}`)}
      onDeleted={() => router.replace("/")}
    />
  );
}
