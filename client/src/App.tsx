import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Prompts from "./pages/Prompts";
import AIProviders from "./pages/AIProviders";
import Evaluations from "./pages/Evaluations";
import ContextPackages from "./pages/ContextPackages";
import Analytics from "./pages/Analytics";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path="/prompts">
        <DashboardLayout>
          <Prompts />
        </DashboardLayout>
      </Route>
      <Route path="/context-packages">
        <DashboardLayout>
          <ContextPackages />
        </DashboardLayout>
      </Route>
      <Route path="/evaluations">
        <DashboardLayout>
          <Evaluations />
        </DashboardLayout>
      </Route>
      <Route path="/analytics">
        <DashboardLayout>
          <Analytics />
        </DashboardLayout>
      </Route>
      <Route path="/providers">
        <DashboardLayout>
          <AIProviders />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

