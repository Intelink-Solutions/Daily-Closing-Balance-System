import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import UploadStatement from "./pages/UploadStatement";
import Transactions from "./pages/Transactions";
import DailyClosingReport from "./pages/DailyClosingReport";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { AppPreferencesProvider } from "@/contexts/AppPreferencesContext";
import LoginPage from "./pages/LoginPage";
import { ProtectedLayout, PublicOnlyRoute } from "@/components/AuthGuards";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppPreferencesProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={(
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              )}
            />
            <Route
              path="/forgot-password"
              element={(
                <PublicOnlyRoute>
                  <ForgotPasswordPage />
                </PublicOnlyRoute>
              )}
            />
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/upload" element={<UploadStatement />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/report" element={<DailyClosingReport />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AppPreferencesProvider>
  </QueryClientProvider>
);

export default App;
