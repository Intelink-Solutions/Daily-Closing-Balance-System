import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
            {children}
          </main>
          <footer className="border-t border-border px-4 sm:px-6 py-3 text-center text-xs text-muted-foreground">
            © 2026 Intelink SOLUTIONS
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
