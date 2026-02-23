/**
 * BottomTabBar Component
 * 
 * Mobile-only bottom navigation bar with safe area support.
 * Shows tabs for: Messages, Contacts, Settings.
 * Only visible on mobile viewports (< 768px).
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Settings, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TabItem {
  id: string
  label: string
  icon: LucideIcon
  path: string
}

const tabs: TabItem[] = [
  {
    id: 'messages',
    label: 'Chats',
    icon: MessageCircle,
    path: '/messages',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
  },
]

export default function BottomTabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActiveTab = (path: string) => {
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50"
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = isActiveTab(tab.path)

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                'active:bg-accent/10 active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
