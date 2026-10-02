const STORAGE_KEY_PREFIX = "el-silbador:library-skeleton-counts:";
const DEFAULT_SKELETON_ROWS = 2;

export interface LibrarySkeletonCounts {
  mine: number;
  favorites: number;
}

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Remembers the last known list sizes so the loading placeholder reserves the same amount of
 * space as the result it is about to replace. Counts belong to a user, never to the browser
 * generally, because multiple people can sign in on the same device.
 */
export function readLibrarySkeletonCounts(userId: string): LibrarySkeletonCounts {
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return { mine: DEFAULT_SKELETON_ROWS, favorites: DEFAULT_SKELETON_ROWS };

    const stored = JSON.parse(raw) as Partial<LibrarySkeletonCounts>;
    return {
      mine: isCount(stored?.mine) ? stored.mine : DEFAULT_SKELETON_ROWS,
      favorites: isCount(stored?.favorites)
        ? stored.favorites
        : DEFAULT_SKELETON_ROWS,
    };
  } catch (error) {
    console.error("No se pudieron leer los conteos de la biblioteca.", error);
    return { mine: DEFAULT_SKELETON_ROWS, favorites: DEFAULT_SKELETON_ROWS };
  }
}

/** Updates one list's count without discarding the last known count of the other list. */
export function saveLibrarySkeletonCount(
  userId: string,
  list: keyof LibrarySkeletonCounts,
  count: number,
): void {
  try {
    const counts = readLibrarySkeletonCounts(userId);
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ ...counts, [list]: count }),
    );
  } catch (error) {
    console.error("No se pudieron guardar los conteos de la biblioteca.", error);
  }
}
