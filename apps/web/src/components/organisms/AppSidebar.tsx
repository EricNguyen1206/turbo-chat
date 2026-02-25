import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Wrench,
  Puzzle,
  Clock,
  Database,
  Settings,
  Plug,
  DollarSign,
  ScrollText,
  Stethoscope,
  Link2,
  Home,
} from "lucide-react";
import { useSidebarActions } from "@/hooks/useSidebarActions";
import { SidebarConversations } from "../molecules/SidebarConversations";
import SidebarDirectMessages from "../molecules/SidebarDirectMessages";
import NavUser from "../molecules/NavUser";
import { useGlobalWebSocket } from "@/hooks/useGlobalWebSocket";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Sidebar nav items grouped by category
const agentItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Agent Chat", path: "/agent-chat", icon: MessageSquare },
  { label: "Tools", path: "/tools", icon: Wrench },
  { label: "Skills", path: "/skills", icon: Puzzle },
  { label: "Cron Tasks", path: "/cron", icon: Clock },
  { label: "Memory", path: "/memory", icon: Database },
];

const systemItems = [
  { label: "Config", path: "/config", icon: Settings },
  { label: "Integrations", path: "/integrations", icon: Plug },
  { label: "Cost", path: "/cost", icon: DollarSign },
  { label: "Logs", path: "/logs", icon: ScrollText },
  { label: "Doctor", path: "/doctor", icon: Stethoscope },
  { label: "Pairing", path: "/pairing", icon: Link2 },
];

function NavItem({ item, isActive }: { item: (typeof agentItems)[0]; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={item.label}
        isActive={isActive}
        className="h-9 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5 data-[active=true]:bg-sidebar-accent/10"
      >
        <Link to={item.path} className="flex items-center gap-3">
          <Icon className="w-[18px] h-[18px] font-light text-sidebar-foreground" />
          <span className="font-light text-sidebar-foreground text-sm">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const location = useLocation();

  // Use centralized business logic from actions
  const {
    filteredConversations,
    filteredDirectMessages,
    isConversationsLoading,
  } = useSidebarActions();

  // Mount global WebSocket listener for unread counts
  useGlobalWebSocket();

  return (
    <Sidebar collapsible="icon" className="border-none bg-sidebar">
      {/* Team Header - Nordic minimalism: sticky at top, no border, generous spacing */}
      <SidebarHeader className="sticky top-0 z-50 h-16 flex-row items-center gap-4 px-6 bg-sidebar/95 backdrop-blur-sm transition-all duration-300 ease-out group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:justify-center">
        <img
          src="/logo.png"
          alt="Raven Logo"
          width={28}
          height={28}
          className="w-7 h-7 min-w-7 min-h-7 rounded-md object-contain flex-shrink-0 transition-all duration-300 ease-out opacity-80 hover:opacity-100"
        />
        <h1 className="font-light text-base tracking-wide text-sidebar-foreground/90 whitespace-nowrap overflow-hidden transition-all duration-300 ease-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
          ClawX
        </h1>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {/* Agent Section */}
        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-light text-muted-foreground/60 mb-3 px-3">
            Agent
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {agentItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isActive={location.pathname === item.path}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-light text-muted-foreground/60 mb-3 px-3">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {systemItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isActive={location.pathname === item.path}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat Section */}
        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-light text-muted-foreground/60 mb-3 px-3">
            Chat
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <NavItem
                item={{ label: "Messages", path: "/messages", icon: Home }}
                isActive={location.pathname.startsWith("/messages")}
              />
              <NavItem
                item={{ label: "Settings", path: "/settings", icon: Settings }}
                isActive={location.pathname === "/settings"}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversations Section */}
        <SidebarConversations
          items={filteredConversations}
          loading={isConversationsLoading}
        />

        {/* Direct Messages Section */}
        <SidebarDirectMessages
          items={filteredDirectMessages}
          loading={isConversationsLoading}
        />
      </SidebarContent>

      {/* User Profile Section - Clean, no heavy borders, sticky at bottom */}
      <SidebarFooter className="sticky bottom-0 z-50 border-none pt-4 pb-4 px-3 mt-auto bg-sidebar/95 backdrop-blur-sm">
        <NavUser />
      </SidebarFooter>

      {/* Rail for resize/toggle on edge - Nordic minimalism: subtle, functional */}
      <SidebarRail className="sticky top-0 z-50 transition-all duration-200 hover:bg-sidebar-accent/10" />
    </Sidebar>
  );
}

export default AppSidebar;

