import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";

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
          <div className="p-8">
            <h1 className="text-3xl font-bold">Prompts</h1>
            <p className="text-muted-foreground mt-2">Manage your prompt templates</p>
          </div>
        </DashboardLayout>
      </Route>
      <Route path="/context-packages">
        <DashboardLayout>
          <div className="p-8">
            <h1 className="text-3xl font-bold">Context Packages</h1>
            <p className="text-muted-foreground mt-2">Manage context for your prompts</p>
          </div>
        </DashboardLayout>
      </Route>
      <Route path="/evaluations">
        <DashboardLayout>
          <div className="p-8">
            <h1 className="text-3xl font-bold">Evaluations</h1>
            <p className="text-muted-foreground mt-2">Test and compare prompts</p>
          </div>
        </DashboardLayout>
      </Route>
      <Route path="/analytics">
        <DashboardLayout>
          <div className="p-8">
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">View your usage metrics</p>
          </div>
        </DashboardLayout>
      </Route>
      <Route path="/providers">
        <DashboardLayout>
          <div className="p-8">
            <h1 className="text-3xl font-bold">AI Providers</h1>
            <p className="text-muted-foreground mt-2">Manage your AI provider connections</p>
          </div>
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

