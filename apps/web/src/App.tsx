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
import SettingsPage from '@/pages/SettingsPage'
import SkillsPage from '@/pages/SkillsPage'
import CronPage from '@/pages/CronPage'
import NotFoundPage from '@/pages/NotFoundPage'

// ZeroClaw / ClawX Pages
import DashboardPage from '@/pages/DashboardPage'
import AgentChatPage from '@/pages/AgentChatPage'
import ToolsPage from '@/pages/ToolsPage'
import MemoryPage from '@/pages/MemoryPage'
import ConfigPage from '@/pages/ConfigPage'
import IntegrationsPage from '@/pages/IntegrationsPage'
import CostPage from '@/pages/CostPage'
import LogsPage from '@/pages/LogsPage'
import DoctorPage from '@/pages/DoctorPage'
import PairingPage from '@/pages/PairingPage'

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
      <ThemeProvider defaultTheme="system" storageKey="raven-theme">
        <ToastContainer position="bottom-left" theme="colored" />
        <main className="relative !w-screen !h-screen !min-h-screen !max-h-screen overflow-hidden flex flex-col font-sans antialiased">
          <Routes>
            {/* Public routes (guest only) */}
            <Route element={<GuestGuard />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected routes (auth required) */}
            <Route element={<AuthGuard />}>
              <Route element={<MessagesWebSocketProvider />}>
                <Route element={<MessagesLayout />}>
                  {/* Original chat routes */}
                  <Route path="/messages" element={<HomePage />} />
                  <Route path="/messages/:id" element={<ConversationPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* ZeroClaw / ClawX routes */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/agent-chat" element={<AgentChatPage />} />
                  <Route path="/tools" element={<ToolsPage />} />
                  <Route path="/skills" element={<SkillsPage />} />
                  <Route path="/cron" element={<CronPage />} />
                  <Route path="/memory" element={<MemoryPage />} />
                  <Route path="/config" element={<ConfigPage />} />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  <Route path="/cost" element={<CostPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/doctor" element={<DoctorPage />} />
                  <Route path="/pairing" element={<PairingPage />} />
                </Route>
              </Route>
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
