import { BadgeCheck, ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/templates/ThemeProvider";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "../ui/sidebar";
import UserSettingDialog from "../organisms/UserSettingDialog";
import { useState } from "react";
import { useCurrentUserQuery } from "@/services/api/users";
import { useSignoutMutation } from "@/services/api/auth";
import { useQueryClient } from "@tanstack/react-query";

const NavUser = () => {
  const { data: user, isLoading } = useCurrentUserQuery();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const signoutMutation = useSignoutMutation({
    onSuccess: () => {
      queryClient.clear();
      toast.success("Sign out successfully");
      navigate("/login", { replace: true });
    },
    onError: () => {
      toast.error("An error occurred during sign out");
    },
  });

  const handleSignOut = () => {
    signoutMutation.mutate();
  };

  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-12 px-3 data-[state=open]:bg-sidebar-accent/5 rounded-xl transition-all duration-200 hover:bg-sidebar-accent/5"
            >
              <Avatar className="h-8 w-8 rounded-lg relative overflow-visible">
                {user && <AvatarImage src={user.avatar || undefined} alt={user.username} className="rounded-lg" />}
                <AvatarFallback className="rounded-lg bg-sidebar-accent/20 text-sidebar-foreground/60 text-sm font-light">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-relaxed">
                <span className="truncate font-light text-sidebar-foreground">{user?.username ?? (isLoading ? "Loading..." : "User")}</span>
                <span className="truncate text-xs font-light text-muted-foreground/50">{user?.email ?? ""}</span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 opacity-40" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl border-sidebar-border/50 bg-sidebar shadow-lg backdrop-blur-sm"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-3 text-left text-sm">
                <Avatar className="h-9 w-9 rounded-lg">
                  {user && <AvatarImage src={user.avatar || undefined} alt={user.username} />}
                  <AvatarFallback className="rounded-lg bg-sidebar-accent/20 text-sidebar-foreground/60 text-sm font-light">
                    {user?.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-relaxed">
                  <span className="truncate font-light text-sidebar-foreground">{user?.username ?? (isLoading ? "Loading..." : "User")}</span>
                  <span className="truncate text-xs font-light text-muted-foreground/50">{user?.email ?? ""}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-sidebar-border/30" />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem
                onClick={() => setIsProfileDialogOpen(true)}
                className="rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5 cursor-pointer py-2.5 gap-3"
              >
                <BadgeCheck className="w-[16px] h-[16px] opacity-50" />
                <span className="font-light text-sm">Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5 cursor-pointer py-2.5 gap-3"
              >
                {theme === "dark" ? <Sun className="w-[16px] h-[16px] opacity-50" /> : <Moon className="w-[16px] h-[16px] opacity-50" />}
                <span className="font-light text-sm">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-sidebar-border/30" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="m-1 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/5 cursor-pointer py-2.5 gap-3 text-destructive/80 hover:text-destructive"
            >
              <LogOut className="w-[16px] h-[16px]" />
              <span className="font-light text-sm">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <UserSettingDialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <div></div>
      </UserSettingDialog>
    </SidebarMenu>
  );
};

export default NavUser;
