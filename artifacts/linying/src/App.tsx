import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import HomePage from "@/pages/home";
import ObsPage from "@/pages/obs";
import HistoryPage from "@/pages/history";
import AdminOverview from "@/pages/admin/index";
import AdminSongs from "@/pages/admin/songs";
import AdminCategories from "@/pages/admin/categories";
import AdminQueue from "@/pages/admin/queue";
import AdminSettings from "@/pages/admin/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/obs" component={ObsPage} />
      <Route path="/history" component={HistoryPage} />

      <Route path="/admin" component={AdminOverview} />
      <Route path="/admin/songs" component={AdminSongs} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/queue" component={AdminQueue} />
      <Route path="/admin/settings" component={AdminSettings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
