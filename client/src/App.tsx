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
import Playground from "./pages/Playground";
import Budgets from "./pages/Budgets";
import { RegressionTestingPage } from "./pages/RegressionTestingPage";
import APIKeys from "./pages/APIKeys";
import Teams from "./pages/Teams";
import Marketplace from "./pages/Marketplace";
import AcceptInvitation from "./pages/AcceptInvitation";
import WorkspaceAnalytics from "./pages/WorkspaceAnalytics";
import WorkspaceBilling from "./pages/WorkspaceBilling";
import AuditLogs from "./pages/AuditLogs";
import WorkspacePermissions from "./pages/WorkspacePermissions";
import SecuritySettings from "./pages/SecuritySettings";
import TwoFactorSettings from "./pages/TwoFactorSettings";
import IpAllowlist from "./pages/IpAllowlist";
import ComplianceReports from "./pages/ComplianceReports";
import SessionManagement from "./pages/SessionManagement";
import PasswordPolicy from "./pages/PasswordPolicy";
import LoginActivity from "./pages/LoginActivity";
import ApiDashboard from "./pages/ApiDashboard";
import DataPortability from "./pages/DataPortability";
import Webhooks from "@/pages/Webhooks";
import ScheduledReports from "@/pages/ScheduledReports";
import { KeyboardShortcutsProvider } from "@/components/KeyboardShortcutsProvider";
import Templates from "@/pages/Templates";
import PromptPerformance from "@/pages/PromptPerformance";
import SharedPrompt from "@/pages/SharedPrompt";
import Collections from "@/pages/Collections";
import PromptImportExport from "@/pages/PromptImportExport";
import ExportAnalytics from "@/pages/ExportAnalytics";
import SharedExport from "@/pages/SharedExport";
import ExportManagement from "@/pages/ExportManagement";
import ExportSettings from "@/pages/ExportSettings";
import ExportDiffViewer from "@/pages/ExportDiffViewer";

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
      <Route path="/marketplace">
        <DashboardLayout>
          <Marketplace />
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
      <Route path="/playground">
        <DashboardLayout>
          <Playground />
        </DashboardLayout>
      </Route>
      <Route path="/templates">
        <DashboardLayout>
          <Templates />
        </DashboardLayout>
      </Route>
      <Route path="/budgets">
        <DashboardLayout>
          <Budgets />
        </DashboardLayout>
      </Route>
      <Route path="/regression-testing">
        <DashboardLayout>
          <RegressionTestingPage />
        </DashboardLayout>
      </Route>
      <Route path="/api-keys">
        <DashboardLayout>
          <APIKeys />
        </DashboardLayout>
      </Route>
      <Route path="/teams">
        <DashboardLayout>
          <Teams />
        </DashboardLayout>
      </Route>
      <Route path="/workspace-analytics">
        <DashboardLayout>
          <WorkspaceAnalytics />
        </DashboardLayout>
      </Route>
      <Route path="/workspace-billing">
        <DashboardLayout>
          <WorkspaceBilling />
        </DashboardLayout>
      </Route>
      <Route path="/audit-logs">
        <DashboardLayout>
          <AuditLogs />
        </DashboardLayout>
      </Route>
      <Route path="/workspace-permissions">
        <DashboardLayout>
          <WorkspacePermissions />
        </DashboardLayout>
      </Route>
      <Route path="/security-settings">
        <DashboardLayout>
          <SecuritySettings />
        </DashboardLayout>
      </Route>
      <Route path="/two-factor">
        <DashboardLayout>
          <TwoFactorSettings />
        </DashboardLayout>
      </Route>
      <Route path="/ip-allowlist">
        <DashboardLayout>
          <IpAllowlist />
        </DashboardLayout>
      </Route>
      <Route path="/compliance-reports">
        <DashboardLayout>
          <ComplianceReports />
        </DashboardLayout>
      </Route>
      <Route path="/sessions">
        <DashboardLayout>
          <SessionManagement />
        </DashboardLayout>
      </Route>
      <Route path="/password-policy">
        <DashboardLayout>
          <PasswordPolicy />
        </DashboardLayout>
      </Route>
      <Route path="/login-activity">
        <DashboardLayout>
          <LoginActivity />
        </DashboardLayout>
      </Route>
      <Route path="/api-dashboard">
        <DashboardLayout>
          <ApiDashboard />
        </DashboardLayout>
      </Route>
      <Route path="/data-portability">
        <DashboardLayout>
          <DataPortability />
        </DashboardLayout>
      </Route>
      <Route path="/webhooks">
        <DashboardLayout>
          <Webhooks />
        </DashboardLayout>
      </Route>
      <Route path="/scheduled-reports">
        <DashboardLayout>
          <ScheduledReports />
        </DashboardLayout>
      </Route>
      <Route path="/performance">
        <DashboardLayout>
          <PromptPerformance />
        </DashboardLayout>
      </Route>
      <Route path="/collections">
        <DashboardLayout>
          <Collections />
        </DashboardLayout>
      </Route>
      <Route path="/import-export">
        <DashboardLayout>
          <PromptImportExport />
        </DashboardLayout>
      </Route>
      <Route path="/export-analytics">
        <DashboardLayout>
          <ExportAnalytics />
        </DashboardLayout>
      </Route>
      <Route path="/export-management">
        <DashboardLayout>
          <ExportManagement />
        </DashboardLayout>
      </Route>
      <Route path="/export-settings">
        <ExportSettings />
      </Route>
      <Route path="/export-diff">
        <ExportDiffViewer />
      </Route>
      <Route path="/shared/:shareCode" component={SharedPrompt} />
      <Route path="/shared-export/:shareCode" component={SharedExport} />
      <Route path="/accept-invitation" component={AcceptInvitation} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <KeyboardShortcutsProvider>
            <Toaster />
            <Router />
          </KeyboardShortcutsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

