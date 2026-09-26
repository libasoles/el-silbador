import { useEffect, useState } from "react";
import App from "./App";
import { initAnalytics, trackPageView } from "./analytics";
import { AuthRequiredProvider } from "./AuthRequired";
import { ToastProvider } from "./components/ToastProvider";
import { Library } from "./pages/Library";
import { useAuth } from "./useAuth";

type Route = { name: "library" } | { name: "new" } | { name: "song"; slug: string };

function parseRoute(pathname: string): Route {
  if (pathname === "/nueva") return { name: "new" };
  const songMatch = pathname.match(/^\/cancion\/([^/]+)\/?$/);
  if (songMatch) return { name: "song", slug: songMatch[1] };
  return { name: "library" };
}

function pathForRoute(route: Route): string {
  switch (route.name) {
    case "new":
      return "/nueva";
    case "song":
      return `/cancion/${route.slug}`;
    case "library":
      return "/";
  }
}

function Root() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  const session = useAuth();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(window.location.pathname);
  }, [route]);

  useEffect(() => {
    function handlePopState() {
      setRoute(parseRoute(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (next: Route, mode: "push" | "replace" = "push") => {
    const path = pathForRoute(next);
    if (path !== window.location.pathname) {
      if (mode === "replace") window.history.replaceState(null, "", path);
      else window.history.pushState(null, "", path);
    }
    setRoute(next);
  };

  const page =
    route.name === "new" || route.name === "song" ? (
      <App
        songSlug={route.name === "song" ? route.slug : undefined}
        // Autosave assigns the slug the first time it creates the row; swap the URL to the
        // song's own address without pushing a fresh history entry for the same document.
        onSongCreated={(_id, slug) => navigate({ name: "song", slug }, "replace")}
        onDeleted={() => navigate({ name: "library" })}
      />
    ) : (
      <Library
        onOpenSong={(song) => navigate({ name: "song", slug: song.slug })}
        onNewSong={() => navigate({ name: "new" })}
      />
    );

  return (
    <ToastProvider>
      <AuthRequiredProvider session={session}>{page}</AuthRequiredProvider>
    </ToastProvider>
  );
}

export default Root;
