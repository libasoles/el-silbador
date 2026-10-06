import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "../analytics";
import { useAuthRequired } from "../authRequiredContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DesktopOnlyDialog } from "../components/DesktopOnlyDialog";
import { EditorFeatureShowcase } from "../components/EditorFeatureShowcase";
import { IconButtonTooltip } from "../components/IconButtonTooltip";
import {
  EditIcon,
  LogInIcon,
  LogOutIcon,
  NeutralIllustrationIcon,
  PlusIcon,
  PrivacyIcon,
  SearchIcon,
  SilbadorIcon,
  SpinnerIcon,
  StarIcon,
  TrashIcon,
} from "../components/icons";
import { signOut } from "../../data/auth";
import {
  deleteSong,
  listFavorites,
  listMySongs,
  listPublicSongs,
  toggleFavorite,
} from "../../data/songs";
import { songQueryKeys } from "../../data/queryKeys";
import {
  clearPendingAuthAction,
  readPendingAuthAction,
} from "../pendingAuthActionStorage";
import { useToast } from "../toastContext";
import {
  toLibrarySong,
  toPublicLibrarySong,
  type LibrarySong,
} from "./librarySongs";
import {
  getHighlightParts,
  getMatchingPerformers,
  searchSongs,
} from "./librarySearch";
import { useIsMobile } from "../useIsMobile";
import {
  readLibrarySkeletonCounts,
  saveLibrarySkeletonCount,
} from "./librarySkeletonStorage";
import "./Library.css";

/** Shows `text` with every word of the active search query marked. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  return getHighlightParts(text, query).map((part, index) =>
    part.matches ? (
      <mark className="library-row__match" key={index}>
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );
}

interface SongRowProps {
  song: LibrarySong;
  query: string;
  favorited: boolean;
  favoritePending: boolean;
  fadeIn: boolean;
  showFavorite: boolean;
  showEdit: boolean;
  showDelete: boolean;
  showPrivacy: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SongRow({
  song,
  query,
  favorited,
  favoritePending,
  fadeIn,
  showFavorite,
  showEdit,
  showDelete,
  showPrivacy,
  onOpen,
  onToggleFavorite,
  onEdit,
  onDelete,
}: SongRowProps) {
  // Only a song found by its performers names them, so the row shows why it matched.
  const matchingPerformers = getMatchingPerformers(song, query);

  return (
    <li className={fadeIn ? "library-row library-row--fade-in" : "library-row"}>
      <button type="button" className="library-row__open" onClick={onOpen}>
        <span className="library-row__title">
          <span className="library-row__title-text">
            <HighlightedText text={song.title} query={query} />
          </span>
          {showPrivacy && !song.isPublic && (
            <IconButtonTooltip
              tooltip="Privada"
              className="library-row__privacy-tooltip"
              side="bottom"
            >
              <span className="library-row__privacy" aria-label="Privada">
                <PrivacyIcon size={15} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </IconButtonTooltip>
          )}
        </span>
        <span className="library-row__leader" aria-hidden="true" />
        <span
          className={
            song.author
              ? "library-row__author"
              : "library-row__author library-row__author--empty"
          }
        >
          <HighlightedText text={song.author ?? "sin autor"} query={query} />
        </span>
        {matchingPerformers.length > 0 && (
          <span className="library-row__performers">
            Interpretada por:{" "}
            {matchingPerformers.map((performer, index) => (
              <Fragment key={performer}>
                {index > 0 && ", "}
                <HighlightedText text={performer} query={query} />
              </Fragment>
            ))}
          </span>
        )}
      </button>
      {showFavorite && (
        <IconButtonTooltip
          tooltip={
            favoritePending
              ? "Actualizando favorita"
              : favorited
                ? "Quitar de favoritas"
                : "Agregar a favoritas"
          }
        >
          <button
            type="button"
            className="library-row__star"
            aria-pressed={favorited}
            aria-label={
              favoritePending
                ? "Actualizando favorita"
                : favorited
                  ? "Quitar de favoritas"
                  : "Agregar a favoritas"
            }
            onClick={onToggleFavorite}
            disabled={favoritePending}
          >
            {favoritePending ? (
              <SpinnerIcon />
            ) : (
              <StarIcon filled={favorited} />
            )}
          </button>
        </IconButtonTooltip>
      )}
      {(showEdit || showDelete) && (
        <div className="library-row__actions">
          {showEdit && (
            <IconButtonTooltip tooltip="Editar canción">
              <button
                type="button"
                className="library-row__edit"
                aria-label="Editar canción"
                onClick={onEdit}
              >
                <EditIcon size={18} strokeWidth={1.6} />
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
        </div>
      )}
    </li>
  );
}

function LibraryRowSkeleton() {
  return (
    <li className="library-row">
      <div className="library-row__open">
        <span aria-hidden="true" className="skeleton library-row__title" />
        <span className="library-row__leader" aria-hidden="true" />
        <span aria-hidden="true" className="skeleton library-row__author" />
      </div>
    </li>
  );
}

interface LibrarySectionProps {
  title?: string;
  songs: LibrarySong[];
  query: string;
  emptyLabel: string;
  emptyIcon?: ReactNode;
  favoriteIds: Set<string>;
  favoritePendingSongId?: string;
  fadeInSongId?: string;
  showFavorite?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showPrivacy?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  onOpenSong: (song: LibrarySong) => void;
  onToggleFavorite: (song: LibrarySong) => void;
  onEditSong?: (song: LibrarySong) => void;
  onDeleteSong?: (song: LibrarySong) => void;
}

function LibrarySection({
  title,
  songs,
  query,
  emptyLabel,
  emptyIcon = <SilbadorIcon />,
  favoriteIds,
  favoritePendingSongId,
  fadeInSongId,
  showFavorite = true,
  showEdit = false,
  showDelete = false,
  showPrivacy = false,
  loading = false,
  skeletonRows = 2,
  onOpenSong,
  onToggleFavorite,
  onEditSong,
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
        <ul className="library-list">
          {Array.from({ length: skeletonRows }, (_, index) => (
            <LibraryRowSkeleton key={index} />
          ))}
        </ul>
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
              query={query}
              favorited={favoriteIds.has(song.id)}
              favoritePending={favoritePendingSongId === song.id}
              fadeIn={fadeInSongId === song.id}
              showFavorite={showFavorite}
              showEdit={showEdit}
              showDelete={showDelete}
              showPrivacy={showPrivacy}
              onOpen={() => onOpenSong(song)}
              onToggleFavorite={() => onToggleFavorite(song)}
              onEdit={() => onEditSong?.(song)}
              onDelete={() => onDeleteSong?.(song)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface LibraryProps {
  appVersion: string;
  /** Public songs fetched server-side (Next.js Server Component), so the very first render —
   *  including the one Next performs on the server to produce pre-rendered HTML for crawlers —
   *  already shows real content instead of a loading skeleton. */
  initialPublicSongs?: LibrarySong[];
  /** Opens a song read-only, whichever list it's in — even the user's own songs. */
  onOpenSong?: (song: LibrarySong) => void;
  /** Opens one of the user's own songs in the editor (the row's pencil). */
  onEditSong?: (song: LibrarySong) => void;
  onNewSong?: () => void;
}

export function Library({
  appVersion,
  initialPublicSongs,
  onOpenSong,
  onEditSong,
  onNewSong,
}: LibraryProps) {
  const { session, requireAuthentication } = useAuthRequired();
  const userId = session?.user.id;
  const authenticated = Boolean(session);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  // Mobile is read-only by product rule: no editing or deleting from the index, even for the
  // user's own songs. Favoriting stays available on mobile and must not be gated here.
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [desktopOnlyNoticeOpen, setDesktopOnlyNoticeOpen] = useState(false);
  const [songPendingDelete, setSongPendingDelete] =
    useState<LibrarySong | null>(null);
  const [favoritePendingSongId, setFavoritePendingSongId] = useState<
    string | null
  >(null);
  const [favoriteFadeInSongId, setFavoriteFadeInSongId] = useState<
    string | null
  >(null);

  const {
    data: myLibrarySongs = [],
    isLoading: myQueryLoading,
    isSuccess: myQuerySuccess,
  } = useQuery({
    queryKey: songQueryKeys.mine(userId ?? ""),
    queryFn: async () => (await listMySongs()).map(toLibrarySong),
    enabled: Boolean(userId),
  });
  // `undefined` session means the initial auth check hasn't resolved yet, so this section should
  // still read as loading rather than flashing an empty "no songs" state; `null` (confirmed
  // signed out) never fetches, so it isn't "loading" even though the query itself stays disabled.
  const myLibraryLoading =
    session === undefined || (Boolean(userId) && myQueryLoading);

  const { data: publicLibrarySongs = [], isLoading: publicLibraryLoading } =
    useQuery({
      queryKey: songQueryKeys.public(),
      queryFn: async () => (await listPublicSongs()).map(toPublicLibrarySong),
      initialData: initialPublicSongs,
    });

  const {
    data: favoriteLibrarySongs = [],
    isLoading: favoritesQueryLoading,
    isSuccess: favoritesQuerySuccess,
  } = useQuery({
    queryKey: songQueryKeys.favorites(userId ?? ""),
    queryFn: async () => (await listFavorites()).map(toLibrarySong),
    enabled: Boolean(userId),
  });
  const favoritesLoading =
    session === undefined || (Boolean(userId) && favoritesQueryLoading);

  const skeletonCounts = useMemo(
    () => (userId ? readLibrarySkeletonCounts(userId) : undefined),
    [userId],
  );

  useEffect(() => {
    if (userId && myQuerySuccess) {
      saveLibrarySkeletonCount(userId, "mine", myLibrarySongs.length);
    }
  }, [myLibrarySongs.length, myQuerySuccess, userId]);

  useEffect(() => {
    if (userId && favoritesQuerySuccess) {
      saveLibrarySkeletonCount(
        userId,
        "favorites",
        favoriteLibrarySongs.length,
      );
    }
  }, [favoriteLibrarySongs.length, favoritesQuerySuccess, userId]);

  const deleteMutation = useMutation({
    mutationFn: deleteSong,
    onSuccess: (_data, songId) => {
      if (userId) {
        queryClient.setQueryData<LibrarySong[]>(
          songQueryKeys.mine(userId),
          (current) => (current ?? []).filter((song) => song.id !== songId),
        );
      }
      setSongPendingDelete(null);
      showToast({
        variant: "success",
        title: "Canción eliminada",
        description: "Borramos la canción de tu cancionero.",
      });
    },
  });

  const favoriteIds = useMemo(
    () => new Set(favoriteLibrarySongs.map((song) => song.id)),
    [favoriteLibrarySongs],
  );

  const toggleFavoriteMutation = useMutation({
    mutationFn: (song: LibrarySong) => toggleFavorite(song.id),
    onMutate: (song) => {
      setFavoritePendingSongId(song.id);
    },
    onSuccess: (_data, song) => {
      if (!userId) return;
      const wasFavorited =
        queryClient
          .getQueryData<LibrarySong[]>(songQueryKeys.favorites(userId))
          ?.some((existing) => existing.id === song.id) ?? false;
      queryClient.setQueryData<LibrarySong[]>(
        songQueryKeys.favorites(userId),
        (current) => {
          const list = current ?? [];
          const alreadyFavorited = list.some(
            (existing) => existing.id === song.id,
          );
          return alreadyFavorited
            ? list.filter((existing) => existing.id !== song.id)
            : [...list, song];
        },
      );
      if (!wasFavorited) setFavoriteFadeInSongId(song.id);
    },
    onSettled: (_data, _error, song) => {
      setFavoritePendingSongId((current) =>
        current === song.id ? null : current,
      );
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
  }, [
    authenticated,
    myLibrarySongs,
    publicLibrarySongs,
    toggleFavoriteMutation,
    showToast,
  ]);

  const mySongs = useMemo(
    () => searchSongs(myLibrarySongs, query),
    [myLibrarySongs, query],
  );
  const favoriteSongs = useMemo(
    () => searchSongs(favoriteLibrarySongs, query),
    [favoriteLibrarySongs, query],
  );
  const publicSongs = useMemo(
    () => searchSongs(publicLibrarySongs, query),
    [publicLibrarySongs, query],
  );

  const handleOpen = (song: LibrarySong) => {
    trackEvent("open_song", { song_id: song.id });
    onOpenSong?.(song);
  };
  const handleEdit = (song: LibrarySong) => {
    trackEvent("edit_song", { song_id: song.id });
    onEditSong?.(song);
  };
  const handleNew = () => {
    trackEvent("new_song_click");
    // The editor is desktop-only for now: on mobile, explain that instead of creating a song.
    if (isMobile) {
      setDesktopOnlyNoticeOpen(true);
      return;
    }
    onNewSong?.();
  };

  const handleConfirmDelete = () => {
    if (!songPendingDelete) return;
    deleteMutation.mutate(songPendingDelete.id);
  };

  const handleAuthClick = () => {
    if (authenticated) {
      signOut()
        .then(() => {
          showToast({
            variant: "success",
            icon: <img src="/04-happy.svg" alt="" />,
            title: "Hasta pronto",
          });
        })
        .catch((error: unknown) => {
          console.error("No se pudo cerrar sesión.", error);
        });
      return;
    }
    requireAuthentication();
  };

  const handleToggleFavorite = (song: LibrarySong) => {
    if (!favoriteIds.has(song.id)) {
      trackEvent("add_favorite", { song_id: song.id });
    }
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

      <button
        type="button"
        className="library-auth"
        onClick={handleAuthClick}
        // Until the session check resolves we can't tell "Entrar" from "Salir"; keep the slot
        // (no layout shift) but don't show a wrong state.
        style={session === undefined ? { visibility: "hidden" } : undefined}
        aria-hidden={session === undefined}
        tabIndex={session === undefined ? -1 : undefined}
      >
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
            query={query}
            emptyLabel="Todavía no escribiste ninguna canción."
            favoriteIds={favoriteIds}
            favoritePendingSongId={favoritePendingSongId ?? undefined}
            showFavorite={false}
            showEdit={!isMobile}
            showDelete={!isMobile}
            showPrivacy
            loading={myLibraryLoading}
            skeletonRows={skeletonCounts?.mine}
            onOpenSong={handleOpen}
            onToggleFavorite={handleToggleFavorite}
            onEditSong={handleEdit}
            onDeleteSong={setSongPendingDelete}
          />
        )}

        {session && (
          <LibrarySection
            title="Favoritas"
            songs={favoriteSongs}
            query={query}
            emptyLabel="Todavía no marcaste ninguna canción como favorita. Tocá la estrella junto a una canción para guardarla acá."
            favoriteIds={favoriteIds}
            favoritePendingSongId={favoritePendingSongId ?? undefined}
            fadeInSongId={favoriteFadeInSongId ?? undefined}
            loading={favoritesLoading}
            skeletonRows={skeletonCounts?.favorites}
            onOpenSong={handleOpen}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        <LibrarySection
          title={session ? "Públicas" : undefined}
          songs={publicSongs}
          query={query}
          emptyLabel="Todavía no hay canciones públicas para mostrar."
          emptyIcon={<NeutralIllustrationIcon />}
          favoriteIds={favoriteIds}
          favoritePendingSongId={favoritePendingSongId ?? undefined}
          loading={publicLibraryLoading}
          onOpenSong={handleOpen}
          onToggleFavorite={handleToggleFavorite}
        />

        <section className="library-section">
          <div className="library-section__head">
            <h2 className="library-section__title">Estudio</h2>
          </div>
          <a
            className="library-study-link"
            href="https://acordesdeguitarra.com.ar/"
            onClick={() => trackEvent("acordesdeguitarra_link_click")}
          >
            acordesdeguitarra.com.ar
          </a>
        </section>
      </div>

      <footer className="library-version">v{appVersion} alfa</footer>

      <DesktopOnlyDialog
        open={desktopOnlyNoticeOpen}
        onOpenChange={setDesktopOnlyNoticeOpen}
        title="Probalo en una computadora"
        description="Por el momento, el editor de canciones no está disponible para el celular."
      >
        <EditorFeatureShowcase />
      </DesktopOnlyDialog>

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
