import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-admin-auth";
import { AdminGuard } from "@/components/admin-guard";
import { AdminLayout } from "@/components/admin-layout";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/login";
import QueueAdmin from "@/pages/admin/queue";
import SongsAdmin from "@/pages/admin/songs";
import SessionsAdmin from "@/pages/admin/sessions";
import CategoriesAdmin from "@/pages/admin/categories";
import SettingsAdmin from "@/pages/admin/settings";
import RequestersAdmin from "@/pages/admin/requesters";
import StatsAdmin from "@/pages/admin/stats";
import ObsQueue from "@/pages/obs";
import ObsLyrics from "@/pages/obs-lyrics";

const queryClient = new QueryClient();

function AdminRoutes() {
  return (
    <AdminGuard>
      <AdminLayout>
        <Switch>
          <Route path="/admin" component={QueueAdmin} />
          <Route path="/admin/songs" component={SongsAdmin} />
          <Route path="/admin/sessions" component={SessionsAdmin} />
          <Route path="/admin/categories" component={CategoriesAdmin} />
          <Route path="/admin/settings" component={SettingsAdmin} />
          <Route path="/admin/requesters" component={RequestersAdmin} />
          <Route path="/admin/stats" component={StatsAdmin} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    </AdminGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/admin/login" component={Login} />
              <Route path="/admin/*" component={AdminRoutes} />
              <Route path="/obs" component={ObsQueue} />
              <Route path="/obs/lyrics" component={ObsLyrics} />
              <Route component={NotFound} />
            </Switch>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
