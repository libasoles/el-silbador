import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import './index.css'
import Root from './app/Root.tsx'

// gcTime must be at least as long as the persister's maxAge below, or React Query garbage-collects
// a query from memory (and skips persisting it) before it'd otherwise expire.
const ONE_DAY_MS = 24 * 60 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    // Data comes from Supabase and only changes through our own mutations (save/delete/fork/
    // favorite), which invalidate their queries explicitly — so there's no need to refetch just
    // because the window regained focus or the network reconnected.
    queries: {
      staleTime: 60_000,
      gcTime: ONE_DAY_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

// Persists the query cache to localStorage so a full page reload can paint the library from what
// was last fetched instead of a blank skeleton, while the query still revalidates against
// Supabase in the background per the staleTime above.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "silabeo-query-cache",
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_DAY_MS,
        // Bump this when a cached query's shape changes incompatibly, to drop old localStorage
        // entries instead of feeding stale-shaped data into components expecting the new one.
        buster: "v1",
      }}
    >
      <Root />
    </PersistQueryClientProvider>
  </StrictMode>,
)
