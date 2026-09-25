import { useState } from "react";
import App from "./App";
import { Library } from "./pages/Library";

type Route = { name: "library" } | { name: "editor" };

// Stands in for real routing/loading until a song can be fetched from Supabase: opening a song
// from the library always lands on a blank editor for now.
function Root() {
  const [route, setRoute] = useState<Route>({ name: "library" });

  if (route.name === "editor") {
    return <App />;
  }

  return (
    <Library
      onOpenSong={() => setRoute({ name: "editor" })}
      onNewSong={() => setRoute({ name: "editor" })}
    />
  );
}

export default Root;
