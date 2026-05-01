import { Link } from "react-router-dom";
import { Home, Users, Settings } from "lucide-react";
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

export function AppSidebar() {
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
          alt="Turbo chat Logo"
          width={28}
          height={28}
          className="w-7 h-7 min-w-7 min-h-7 rounded-md object-contain flex-shrink-0 transition-all duration-300 ease-out opacity-80 hover:opacity-100"
        />
        <h1 className="font-light text-base tracking-wide text-sidebar-foreground/90 whitespace-nowrap overflow-hidden transition-all duration-300 ease-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
          Turbo
        </h1>
      </SidebarHeader>

      {/* Search Section - Uncomment when needed */}
      {/* <SearchSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} /> */}

      <SidebarContent className="px-3">
        {/* Navigation Section - Subtle, spacious */}
        <SidebarGroup className="mb-8">
          <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-light text-muted-foreground/60 mb-3 px-3">
            Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Home"
                  className="h-9 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5 data-[active=true]:bg-sidebar-accent/10"
                >
                  <Link to="/" className="flex items-center gap-3">
                    <Home className="w-[18px] h-[18px] font-light text-sidebar-foreground" />
                    <span className="font-light text-sidebar-foreground text-sm">Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Contacts"
                  className="h-9 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5 data-[active=true]:bg-sidebar-accent/10"
                >
                  <Link to="/contacts" className="flex items-center gap-3">
                    <Users className="w-[18px] h-[18px] font-light text-sidebar-foreground" />
                    <span className="font-light text-sidebar-foreground text-sm">Contacts</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Settings"
                  className="h-9 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5 data-[active=true]:bg-sidebar-accent/10"
                >
                  <Link to="/settings" className="flex items-center gap-3">
                    <Settings className="w-[18px] h-[18px] font-light text-sidebar-foreground" />
                    <span className="font-light text-sidebar-foreground text-sm">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
