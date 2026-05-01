import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { ThemeProvider } from '@/components/templates/ThemeProvider'
import { AuthGuard } from '@/guards/AuthGuard'
import { GuestGuard } from '@/guards/GuestGuard'
import MessagesWebSocketProvider from '@/components/templates/MessagesWebSocketProvider'

// Pages
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import HomePage from '@/pages/HomePage'
import ConversationPage from '@/pages/ConversationPage'
import ContactsPage from '@/pages/ContactsPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'

// Layouts
import MessagesLayout from '@/components/templates/MessagesLayout'

// Configure QueryClient with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      refetchOnReconnect: false, // Don't refetch on reconnect
      staleTime: 5 * 60 * 1000, // 5 minutes before data is stale
      retry: 1, // Only retry once
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <ToastContainer position="bottom-left" theme="colored" />
        <main className="relative !w-screen !h-screen !min-h-screen !max-h-screen overflow-hidden flex flex-col font-sans antialiased">
          <Routes>
            {/* Public routes (guest only) */}
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
            </Route>

            {/* Protected routes (auth required) */}
            <Route element={<AuthGuard />}>
              <Route element={<MessagesWebSocketProvider />}>
                <Route element={<MessagesLayout />}>
                  <Route path="/messages" element={<HomePage />} />
                  <Route path="/messages/:id" element={<ConversationPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/messages" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
