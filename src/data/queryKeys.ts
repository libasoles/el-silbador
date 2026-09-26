/** Central place for TanStack Query cache keys, so invalidation call sites don't hand-roll keys
 *  that silently drift out of sync with the ones useQuery was called with. */
export const songQueryKeys = {
  // Prefix shared by every `mine` key below — pass this to `invalidateQueries` to invalidate the
  // list for whichever user is currently signed in, without needing their id at the call site.
  mineAll: ["songs", "mine"] as const,
  mine: (userId: string) => ["songs", "mine", userId] as const,
  favorites: (userId: string) => ["songs", "favorites", userId] as const,
  public: () => ["songs", "public"] as const,
  detail: (songId: string) => ["songs", "detail", songId] as const,
  bySlug: (slug: string) => ["songs", "bySlug", slug] as const,
};
