import { useState } from "react";
import { Bell, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppPreferences, type AppNotification } from "@/contexts/AppPreferencesContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AppHeader() {
  const navigate = useNavigate();
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const {
    role,
    userName,
    logout,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppPreferences();

  const handleSignOut = () => {
    logout();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <header className="h-14 sm:h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 card-shadow sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3">
        <SidebarTrigger className="h-9 w-9" />
        <h1 className="text-sm sm:text-lg font-semibold text-foreground truncate">
          <span className="hidden sm:inline">DCBS</span>
          <span className="sm:hidden">DCBS</span>
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full h-9 w-9 hover:bg-accent transition-colors"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadNotificationCount > 0 && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-[10px] text-white flex items-center justify-center px-1"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </motion.span>
                )}
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[380px] overflow-auto">
            <DropdownMenuLabel className="flex items-center justify-between gap-3">
              <span>Notifications</span>
              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    markAllNotificationsRead();
                  }}
                >
                  Mark all read
                </button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem disabled>No notifications yet</DropdownMenuItem>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="cursor-pointer items-start"
                  onClick={() => {
                    markNotificationRead(notification.id);
                    setSelectedNotification(notification);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
                      {notification.channel} • {new Date(notification.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 sm:gap-2 rounded-full px-2 sm:px-3 h-9">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center"
              >
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
              </motion.div>
              <span className="hidden md:block text-sm font-medium">{userName ?? "Staff"}</span>
              <span className="hidden lg:inline text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                {role}
              </span>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>Profile</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>Account Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleSignOut}>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-md">
          {selectedNotification && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedNotification.title}</DialogTitle>
                <DialogDescription>
                  {selectedNotification.channel.toUpperCase()} • {new Date(selectedNotification.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <p className="text-sm text-foreground whitespace-pre-wrap">{selectedNotification.message}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}
