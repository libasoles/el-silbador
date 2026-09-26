import { useEffect, useMemo, useState } from "react";
import { Skeleton, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { trackEvent } from "../analytics";
import { AuthModal } from "../components/AuthModal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconButtonTooltip } from "../components/IconButtonTooltip";
import {
  LogInIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  SilbadorIcon,
  StarIcon,
  TrashIcon,
} from "../components/icons";
import { signOut } from "../../data/auth";
import { deleteSong, listMySongs } from "../../data/songs";
import type { SongSummary } from "../../data/types";
import { useAuth } from "../useAuth";
import "./Library.css";

interface LibrarySong {
  id: string;
  slug: string;
  title: string;
  author: string | null;
}

function toLibrarySong(song: SongSummary): LibrarySong {
  return { id: song.id, slug: song.slug, title: song.title ?? "Sin título", author: null };
}

// Mock data standing in for the still-unimplemented parts of the Supabase-backed library.
// "Canciones propias" now comes from Supabase (see listMySongs below); favoritas and públicas
// stay mocked until those are wired up too.
const FAVORITE_SONGS: LibrarySong[] = [];

const PUBLIC_SONGS: LibrarySong[] = [
  { id: "pub-1", slug: "recuerdos-de-ypacarai-pub1a", title: "Recuerdos de Ypacaraí", author: "Demetrio Ortiz" },
  { id: "pub-2", slug: "alfonsina-y-el-mar-pub2b", title: "Alfonsina y el mar", author: "Ariel Ramírez" },
  { id: "pub-3", slug: "gracias-a-la-vida-pub3c", title: "Gracias a la vida", author: "Violeta Parra" },
];

function matchesQuery(song: LibrarySong, query: string): boolean {
  const haystack = `${song.title} ${song.author ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

interface SongRowProps {
  song: LibrarySong;
  favorited: boolean;
  showFavorite: boolean;
  showDelete: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function SongRow({
  song,
  favorited,
  showFavorite,
  showDelete,
  onOpen,
  onToggleFavorite,
  onDelete,
}: SongRowProps) {
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
      {showFavorite && (
        <IconButtonTooltip tooltip={favorited ? "Quitar de favoritas" : "Agregar a favoritas"}>
          <button
            type="button"
            className="library-row__star"
            aria-pressed={favorited}
            aria-label={favorited ? "Quitar de favoritas" : "Agregar a favoritas"}
            onClick={onToggleFavorite}
          >
            <StarIcon filled={favorited} />
          </button>
        </IconButtonTooltip>
      )}
      {showDelete && (
        <IconButtonTooltip tooltip="Eliminar canción">
          <button
            type="button"
            className="library-row__delete"
            aria-label="Eliminar canción"
            onClick={onDelete}
          >
            <TrashIcon size={18} strokeWidth={1.6} />
          </button>
        </IconButtonTooltip>
      )}
    </li>
  );
}

function LibraryRowSkeleton() {
  return (
    <li className="library-row">
      <div className="library-row__open">
        <Skeleton>
          <span className="library-row__title">Título de ejemplo</span>
        </Skeleton>
        <span className="library-row__leader" aria-hidden="true" />
        <Skeleton>
          <span className="library-row__author">Autor de ejemplo</span>
        </Skeleton>
      </div>
    </li>
  );
}

interface LibrarySectionProps {
  title?: string;
  songs: LibrarySong[];
  emptyLabel: string;
  favoriteIds: Set<string>;
  showFavorite?: boolean;
  showDelete?: boolean;
  loading?: boolean;
  onOpenSong: (song: LibrarySong) => void;
  onToggleFavorite: (song: LibrarySong) => void;
  onDeleteSong?: (song: LibrarySong) => void;
}

function LibrarySection({
  title,
  songs,
  emptyLabel,
  favoriteIds,
  showFavorite = true,
  showDelete = false,
  loading = false,
  onOpenSong,
  onToggleFavorite,
  onDeleteSong,
}: LibrarySectionProps) {
  return (
    <section className="library-section">
      {title && (
        <div className="library-section__head">
          <h2 className="library-section__title">{title}</h2>
        </div>
      )}
      {loading ? (
        <Theme hasBackground={false}>
          <ul className="library-list">
            <LibraryRowSkeleton />
            <LibraryRowSkeleton />
          </ul>
        </Theme>
      ) : songs.length === 0 ? (
        <div className="library-section__empty">
          <span className="library-section__empty-mark" aria-hidden="true">
            <SilbadorIcon />
          </span>
          <p className="empty-state">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="library-list">
          {songs.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              favorited={favoriteIds.has(song.id)}
              showFavorite={showFavorite}
              showDelete={showDelete}
              onOpen={() => onOpenSong(song)}
              onToggleFavorite={() => onToggleFavorite(song)}
              onDelete={() => onDeleteSong?.(song)}
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
  const session = useAuth();
  const authenticated = Boolean(session);
  const [query, setQuery] = useState("");
  const [myLibrarySongs, setMyLibrarySongs] = useState<LibrarySong[]>([]);
  const [songPendingDelete, setSongPendingDelete] = useState<LibrarySong | null>(null);
  const [myLibraryLoading, setMyLibraryLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (session === undefined) {
      // Still checking for an existing session: neither "logged out" nor "loaded" yet.
      setMyLibraryLoading(true);
      return;
    }
    if (session === null) {
      setMyLibrarySongs([]);
      setMyLibraryLoading(false);
      return;
    }
    let cancelled = false;
    setMyLibraryLoading(true);
    listMySongs()
      .then((songs) => {
        if (!cancelled) setMyLibrarySongs(songs.map(toLibrarySong));
      })
      .catch((error: unknown) => {
        console.error("No se pudieron cargar las canciones propias.", error);
      })
      .finally(() => {
        if (!cancelled) setMyLibraryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

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
    () =>
      normalizedQuery
        ? myLibrarySongs.filter((song) => matchesQuery(song, normalizedQuery))
        : myLibrarySongs,
    [myLibrarySongs, normalizedQuery],
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

  const handleOpen = (song: LibrarySong) => {
    trackEvent("open_song", { song_id: song.id });
    onOpenSong?.(song);
  };
  const handleNew = () => {
    trackEvent("new_song_click");
    onNewSong?.();
  };

  const handleConfirmDelete = async () => {
    if (!songPendingDelete) return;
    await deleteSong(songPendingDelete.id);
    setMyLibrarySongs((current) => current.filter((song) => song.id !== songPendingDelete.id));
    setSongPendingDelete(null);
  };

  const handleAuthClick = () => {
    if (authenticated) {
      signOut().catch((error: unknown) => {
        console.error("No se pudo cerrar sesión.", error);
      });
      return;
    }
    trackEvent("auth_modal_open");
    setAuthModalOpen(true);
  };

  return (
    <main className="library">
      <a className="app-mark" href="/" aria-label="Ir al índice">
        <SilbadorIcon />
      </a>

      <button type="button" className="library-auth" onClick={handleAuthClick}>
        {authenticated ? (
          <>
            <LogOutIcon />
            Salir
          </>
        ) : (
          <>
            <LogInIcon />
            Entrar
          </>
        )}
      </button>

      <header className="library-header">
        <div className="library-header__title-row">
          <h1 className="library-heading">Cancionero</h1>
          <IconButtonTooltip tooltip="Nueva canción">
            <button
              type="button"
              className="library-new"
              aria-label="Nueva canción"
              onClick={handleNew}
            >
              <PlusIcon size={26} />
            </button>
          </IconButtonTooltip>
        </div>
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
        {session && (
          <LibrarySection
            songs={mySongs}
            emptyLabel="Todavía no escribiste ninguna canción."
            favoriteIds={favoriteIds}
            showFavorite={false}
            showDelete
            loading={myLibraryLoading}
            onOpenSong={handleOpen}
            onToggleFavorite={toggleFavorite}
            onDeleteSong={setSongPendingDelete}
          />
        )}

        {session && (
          <LibrarySection
            title="Favoritas"
            songs={favoriteSongs}
            emptyLabel="Todavía no marcaste ninguna canción como favorita. Tocá la estrella junto a una canción para guardarla acá."
            favoriteIds={favoriteIds}
            onOpenSong={handleOpen}
            onToggleFavorite={toggleFavorite}
          />
        )}

        <LibrarySection
          title={session ? "Públicas" : undefined}
          songs={publicSongs}
          emptyLabel="Todavía no hay canciones públicas para mostrar."
          favoriteIds={favoriteIds}
          onOpenSong={handleOpen}
          onToggleFavorite={toggleFavorite}
        />
      </div>

      <ConfirmDialog
        open={songPendingDelete !== null}
        title="Eliminar canción"
        description={
          songPendingDelete
            ? `Esta acción no se puede deshacer. ¿Querés eliminar "${songPendingDelete.title}"?`
            : ""
        }
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setSongPendingDelete(null)}
      />

      {authModalOpen && !authenticated && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}
    </main>
  );
}
