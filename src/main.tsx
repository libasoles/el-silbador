import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import Root from './app/Root.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    // Data comes from Supabase and only changes through our own mutations (save/delete/fork/
    // favorite), which invalidate their queries explicitly — so there's no need to refetch just
    // because the window regained focus or the network reconnected.
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, refetchOnReconnect: false },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </StrictMode>,
)
