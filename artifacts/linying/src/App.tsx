import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { withAdminGuard } from "@/components/admin-guard";
import NotFound from "@/pages/not-found";

import HomePage from "@/pages/home";
import ObsPage from "@/pages/obs";
import HistoryPage from "@/pages/history";
import LoginPage from "@/pages/login";
import AdminOverview from "@/pages/admin/index";
import AdminSongs from "@/pages/admin/songs";
import AdminCategories from "@/pages/admin/categories";
import AdminQueue from "@/pages/admin/queue";
import AdminSettings from "@/pages/admin/settings";
import AdminRequesterStats from "@/pages/admin/requester-stats";

const queryClient = new QueryClient();

const ProtectedAdminOverview = withAdminGuard(AdminOverview);
const ProtectedAdminSongs = withAdminGuard(AdminSongs);
const ProtectedAdminCategories = withAdminGuard(AdminCategories);
const ProtectedAdminQueue = withAdminGuard(AdminQueue);
const ProtectedAdminSettings = withAdminGuard(AdminSettings);
const ProtectedAdminRequesterStats = withAdminGuard(AdminRequesterStats);

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/obs" component={ObsPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/login" component={LoginPage} />

      <Route path="/admin" component={ProtectedAdminOverview} />
      <Route path="/admin/songs" component={ProtectedAdminSongs} />
      <Route path="/admin/categories" component={ProtectedAdminCategories} />
      <Route path="/admin/queue" component={ProtectedAdminQueue} />
      <Route path="/admin/settings" component={ProtectedAdminSettings} />
      <Route path="/admin/requester-stats" component={ProtectedAdminRequesterStats} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
