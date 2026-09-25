import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon, SilbadorIcon, StarIcon } from "../components/icons";
import "./Library.css";

interface LibrarySong {
  id: string;
  title: string;
  author: string | null;
}

// Mock data standing in for the Supabase-backed library. Shapes match what a `songs` table
// query would return: a title, an optional author (traditional pieces often have none), and the
// id used to open the song in the editor.
const MY_SONGS: LibrarySong[] = [
  { id: "my-1", title: "Duerme negrito", author: "Atahualpa Yupanqui (arr.)" },
  { id: "my-2", title: "Sin título", author: null },
];

const FAVORITE_SONGS: LibrarySong[] = [];

const PUBLIC_SONGS: LibrarySong[] = [
  { id: "pub-1", title: "Recuerdos de Ypacaraí", author: "Demetrio Ortiz" },
  { id: "pub-2", title: "Alfonsina y el mar", author: "Ariel Ramírez" },
  { id: "pub-3", title: "Gracias a la vida", author: "Violeta Parra" },
];

function matchesQuery(song: LibrarySong, query: string): boolean {
  const haystack = `${song.title} ${song.author ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

interface SongRowProps {
  song: LibrarySong;
  favorited: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}

function SongRow({ song, favorited, onOpen, onToggleFavorite }: SongRowProps) {
  return (
    <li className="library-row">
      <button type="button" className="library-row__open" onClick={onOpen}>
        <span className="library-row__title">{song.title}</span>
        <span className="library-row__leader" aria-hidden="true" />
        <span
          className={
            song.author
              ? "library-row__author"
              : "library-row__author library-row__author--empty"
          }
        >
          {song.author ?? "sin autor"}
        </span>
      </button>
      <button
        type="button"
        className="library-row__star"
        aria-pressed={favorited}
        aria-label={favorited ? "Quitar de favoritas" : "Agregar a favoritas"}
        onClick={onToggleFavorite}
      >
        <StarIcon filled={favorited} />
      </button>
    </li>
  );
}

interface LibrarySectionProps {
  title: string;
  songs: LibrarySong[];
  emptyLabel: string;
  favoriteIds: Set<string>;
  onOpenSong: (song: LibrarySong) => void;
  onToggleFavorite: (song: LibrarySong) => void;
  action?: { label: string; onClick: () => void };
}

function LibrarySection({
  title,
  songs,
  emptyLabel,
  favoriteIds,
  onOpenSong,
  onToggleFavorite,
  action,
}: LibrarySectionProps) {
  return (
    <section className="library-section">
      <div className="library-section__head">
        <h2 className="library-section__title">{title}</h2>
        {action && (
          <button type="button" className="library-section__new" onClick={action.onClick}>
            <PlusIcon />
            {action.label}
          </button>
        )}
      </div>
      {songs.length === 0 ? (
        <p className="empty-state library-section__empty">{emptyLabel}</p>
      ) : (
        <ul className="library-list">
          {songs.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              favorited={favoriteIds.has(song.id)}
              onOpen={() => onOpenSong(song)}
              onToggleFavorite={() => onToggleFavorite(song)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface LibraryProps {
  onOpenSong?: (song: LibrarySong) => void;
  onNewSong?: () => void;
}

export function Library({ onOpenSong, onNewSong }: LibraryProps) {
  const [query, setQuery] = useState("");
  // Favoriting a public or own song is mocked locally: it toggles the star on that row, but
  // (unlike the real, Supabase-backed version) doesn't move the song into the Favoritas section
  // below, which stays fixed mock data.
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    () => new Set(FAVORITE_SONGS.map((song) => song.id)),
  );

  const toggleFavorite = (song: LibrarySong) => {
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(song.id)) {
        next.delete(song.id);
      } else {
        next.add(song.id);
      }
      return next;
    });
  };

  const normalizedQuery = query.trim().toLowerCase();
  const mySongs = useMemo(
    () => (normalizedQuery ? MY_SONGS.filter((song) => matchesQuery(song, normalizedQuery)) : MY_SONGS),
    [normalizedQuery],
  );
  const favoriteSongs = useMemo(
    () =>
      normalizedQuery
        ? FAVORITE_SONGS.filter((song) => matchesQuery(song, normalizedQuery))
        : FAVORITE_SONGS,
    [normalizedQuery],
  );
  const publicSongs = useMemo(
    () =>
      normalizedQuery ? PUBLIC_SONGS.filter((song) => matchesQuery(song, normalizedQuery)) : PUBLIC_SONGS,
    [normalizedQuery],
  );

  const handleOpen = (song: LibrarySong) => onOpenSong?.(song);
  const handleNew = () => onNewSong?.();

  return (
    <main className="library">
      <div className="app-mark" role="img" aria-label="Silbador">
        <SilbadorIcon />
      </div>

      <header className="library-header">
        <h1 className="library-heading">Tu cancionero</h1>
        <label className="library-search">
          <SearchIcon />
          <input
            type="text"
            className="library-search__input"
            placeholder="Buscar canciones o autores"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Buscar canciones o autores"
          />
        </label>
      </header>

      <div className="library-sections">
        <LibrarySection
          title="Mis canciones"
          songs={mySongs}
          emptyLabel="Todavía no escribiste ninguna canción."
          favoriteIds={favoriteIds}
          onOpenSong={handleOpen}
          onToggleFavorite={toggleFavorite}
          action={{ label: "Nueva canción", onClick: handleNew }}
        />

        <LibrarySection
          title="Favoritas"
          songs={favoriteSongs}
          emptyLabel="Todavía no marcaste ninguna canción como favorita. Tocá la estrella junto a una canción para guardarla acá."
          favoriteIds={favoriteIds}
          onOpenSong={handleOpen}
          onToggleFavorite={toggleFavorite}
        />

        <LibrarySection
          title="Públicas"
          songs={publicSongs}
          emptyLabel="Todavía no hay canciones públicas para mostrar."
          favoriteIds={favoriteIds}
          onOpenSong={handleOpen}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    </main>
  );
}
