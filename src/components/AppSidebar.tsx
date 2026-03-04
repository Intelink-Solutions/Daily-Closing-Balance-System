import {
  LayoutDashboard,
  Upload,
  ArrowLeftRight,
  FileBarChart,
  Settings,
  Landmark,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Upload Statement", url: "/upload", icon: Upload },
  { title: "Transactions", url: "/transactions", icon: ArrowLeftRight },
  { title: "Daily Closing Report", url: "/report", icon: FileBarChart },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shrink-0"
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Landmark className="h-5 w-5 text-primary-foreground" />
          </motion.div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-primary-foreground">DCBS</span>
              <span className="text-xs text-sidebar-foreground/60">Finance Portal</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, i) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200"
                        activeClassName="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md"
                      >
                        <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
                          <item.icon className="h-5 w-5 shrink-0" />
                        </motion.div>
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/40 text-center">
            © 2026 Intelink SOLUTIONS
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
