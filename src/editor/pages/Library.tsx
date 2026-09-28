import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { trackEvent } from "../analytics";
import { useAuthRequired } from "../authRequiredContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { IconButtonTooltip } from "../components/IconButtonTooltip";
import {
  LogInIcon,
  LogOutIcon,
  NeutralIllustrationIcon,
  PlusIcon,
  SearchIcon,
  SilbadorIcon,
  StarIcon,
  TrashIcon,
} from "../components/icons";
import { signOut } from "../../data/auth";
import { deleteSong, listFavorites, listMySongs, listPublicSongs, toggleFavorite } from "../../data/songs";
import { songQueryKeys } from "../../data/queryKeys";
import { clearPendingAuthAction, readPendingAuthAction } from "../pendingAuthActionStorage";
import { useToast } from "../toastContext";
import { toLibrarySong, toPublicLibrarySong, type LibrarySong } from "./librarySongs";
import "./Library.css";

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
  emptyIcon?: ReactNode;
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
  emptyIcon = <SilbadorIcon />,
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
            {emptyIcon}
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
  /** Public songs fetched server-side (Next.js Server Component), so the very first render —
   *  including the one Next performs on the server to produce pre-rendered HTML for crawlers —
   *  already shows real content instead of a loading skeleton. */
  initialPublicSongs?: LibrarySong[];
  onOpenSong?: (song: LibrarySong) => void;
  onNewSong?: () => void;
}

export function Library({ initialPublicSongs, onOpenSong, onNewSong }: LibraryProps) {
  const { session, requireAuthentication } = useAuthRequired();
  const userId = session?.user.id;
  const authenticated = Boolean(session);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [songPendingDelete, setSongPendingDelete] = useState<LibrarySong | null>(null);

  const {
    data: myLibrarySongs = [],
    isLoading: myQueryLoading,
  } = useQuery({
    queryKey: songQueryKeys.mine(userId ?? ""),
    queryFn: async () => (await listMySongs()).map(toLibrarySong),
    enabled: Boolean(userId),
  });
  // `undefined` session means the initial auth check hasn't resolved yet, so this section should
  // still read as loading rather than flashing an empty "no songs" state; `null` (confirmed
  // signed out) never fetches, so it isn't "loading" even though the query itself stays disabled.
  const myLibraryLoading = session === undefined || (Boolean(userId) && myQueryLoading);

  const {
    data: publicLibrarySongs = [],
    isLoading: publicLibraryLoading,
  } = useQuery({
    queryKey: songQueryKeys.public(),
    queryFn: async () => (await listPublicSongs()).map(toPublicLibrarySong),
    initialData: initialPublicSongs,
  });

  const {
    data: favoriteLibrarySongs = [],
    isLoading: favoritesQueryLoading,
  } = useQuery({
    queryKey: songQueryKeys.favorites(userId ?? ""),
    queryFn: async () => (await listFavorites()).map(toLibrarySong),
    enabled: Boolean(userId),
  });
  const favoritesLoading = session === undefined || (Boolean(userId) && favoritesQueryLoading);

  const deleteMutation = useMutation({
    mutationFn: deleteSong,
    onSuccess: (_data, songId) => {
      if (userId) {
        queryClient.setQueryData<LibrarySong[]>(songQueryKeys.mine(userId), (current) =>
          (current ?? []).filter((song) => song.id !== songId),
        );
      }
      setSongPendingDelete(null);
      showToast({
        variant: "success",
        title: "Canción eliminada",
        description: "Borramos la canción de tu biblioteca.",
      });
    },
  });

  const favoriteIds = useMemo(
    () => new Set(favoriteLibrarySongs.map((song) => song.id)),
    [favoriteLibrarySongs],
  );

  const toggleFavoriteMutation = useMutation({
    mutationFn: (song: LibrarySong) => toggleFavorite(song.id),
    onSuccess: (_data, song) => {
      if (!userId) return;
      queryClient.setQueryData<LibrarySong[]>(songQueryKeys.favorites(userId), (current) => {
        const list = current ?? [];
        const alreadyFavorited = list.some((existing) => existing.id === song.id);
        return alreadyFavorited
          ? list.filter((existing) => existing.id !== song.id)
          : [...list, song];
      });
    },
  });

  useEffect(() => {
    if (!authenticated) return;
    const pendingAction = readPendingAuthAction();
    if (pendingAction?.type !== "toggle-favorite") return;

    const song = [...myLibrarySongs, ...publicLibrarySongs].find(
      (candidate) => candidate.id === pendingAction.songId,
    );
    if (!song) return;

    // This update mirrors an external auth/session transition. Queue it so React can finish
    // synchronizing that transition before rendering the resulting favorite state.
    queueMicrotask(() => {
      toggleFavoriteMutation.mutate(song);
      clearPendingAuthAction();
      showToast({
        variant: "success",
        title: "Sesión iniciada",
        description: "Actualizamos tus favoritas.",
      });
    });
  }, [authenticated, myLibrarySongs, publicLibrarySongs, toggleFavoriteMutation, showToast]);

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
        ? favoriteLibrarySongs.filter((song) => matchesQuery(song, normalizedQuery))
        : favoriteLibrarySongs,
    [favoriteLibrarySongs, normalizedQuery],
  );
  const publicSongs = useMemo(
    () =>
      normalizedQuery
        ? publicLibrarySongs.filter((song) => matchesQuery(song, normalizedQuery))
        : publicLibrarySongs,
    [publicLibrarySongs, normalizedQuery],
  );

  const handleOpen = (song: LibrarySong) => {
    trackEvent("open_song", { song_id: song.id });
    onOpenSong?.(song);
  };
  const handleNew = () => {
    trackEvent("new_song_click");
    onNewSong?.();
  };

  const handleConfirmDelete = () => {
    if (!songPendingDelete) return;
    deleteMutation.mutate(songPendingDelete.id);
  };

  const handleAuthClick = () => {
    if (authenticated) {
      signOut().catch((error: unknown) => {
        console.error("No se pudo cerrar sesión.", error);
      });
      return;
    }
    requireAuthentication();
  };

  const handleToggleFavorite = (song: LibrarySong) => {
    if (!authenticated) {
      requireAuthentication({ type: "toggle-favorite", songId: song.id });
      return;
    }
    toggleFavoriteMutation.mutate(song);
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
            onToggleFavorite={handleToggleFavorite}
            onDeleteSong={setSongPendingDelete}
          />
        )}

        {session && (
          <LibrarySection
            title="Favoritas"
            songs={favoriteSongs}
            emptyLabel="Todavía no marcaste ninguna canción como favorita. Tocá la estrella junto a una canción para guardarla acá."
            favoriteIds={favoriteIds}
            loading={favoritesLoading}
            onOpenSong={handleOpen}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        <LibrarySection
          title={session ? "Públicas" : undefined}
          songs={publicSongs}
          emptyLabel="Todavía no hay canciones públicas para mostrar."
          emptyIcon={<NeutralIllustrationIcon />}
          favoriteIds={favoriteIds}
          loading={publicLibraryLoading}
          onOpenSong={handleOpen}
          onToggleFavorite={handleToggleFavorite}
        />

        <section className="library-section">
          <div className="library-section__head">
            <h2 className="library-section__title">Estudio</h2>
          </div>
          <a className="library-study-link" href="https://acordesdeguitarra.com.ar/">
            acordesdeguitarra.com.ar
          </a>
        </section>
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
    </main>
  );
}
