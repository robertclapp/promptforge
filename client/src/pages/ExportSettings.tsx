import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Settings,
  Bell,
  Webhook,
  Trash2,
  Archive,
  Clock,
  Plus,
  Edit,
  Loader2,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  HardDrive,
  Calendar,
  Layers,
} from "lucide-react";

export default function ExportSettings() {
  const [activeTab, setActiveTab] = useState("retention");
  
  // Retention settings state
  const [retentionEnabled, setRetentionEnabled] = useState(false);
  const [maxVersionsPerExport, setMaxVersionsPerExport] = useState<number | null>(10);
  const [maxAgeDays, setMaxAgeDays] = useState<number | null>(90);
  const [minVersionsToKeep, setMinVersionsToKeep] = useState(1);
  const [maxTotalSizeMb, setMaxTotalSizeMb] = useState<number | null>(null);
  const [archiveBeforeDelete, setArchiveBeforeDelete] = useState(false);
  const [cleanupFrequency, setCleanupFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  
  // Alert rule state
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [alertName, setAlertName] = useState("");
  const [alertDescription, setAlertDescription] = useState("");
  const [alertActions, setAlertActions] = useState<string[]>([]);
  const [alertThreshold, setAlertThreshold] = useState(1);
  const [alertWindow, setAlertWindow] = useState(60);
  const [alertCooldown, setAlertCooldown] = useState(15);
  const [alertNotifyEmail, setAlertNotifyEmail] = useState(true);
  const [alertNotifyWebhook, setAlertNotifyWebhook] = useState(false);
  const [alertWebhookUrl, setAlertWebhookUrl] = useState("");
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);
  
  // Webhook state
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookTemplate, setWebhookTemplate] = useState("generic");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookTriggers, setWebhookTriggers] = useState({
    exportComplete: true,
    exportFailed: true,
    importComplete: false,
    importFailed: false,
    scheduledExport: true,
    shareAccess: false,
  });
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);

  // Queries
  const { data: retentionSettings, isLoading: loadingRetention } = trpc.versionCleanup.getSettings.useQuery();
  const { data: alertRules, isLoading: loadingAlerts } = trpc.auditAlerts.listRules.useQuery();
  const { data: alertTemplates } = trpc.auditAlerts.getTemplates.useQuery();
  const { data: webhooks, isLoading: loadingWebhooks } = trpc.exportWebhooks.list.useQuery();
  const { data: webhookTemplates } = trpc.webhookTemplates.list.useQuery();
  const { data: cleanupStats } = trpc.versionCleanup.getStats.useQuery();
  const { data: alertStats } = trpc.auditAlerts.getStats.useQuery();
  
  const utils = trpc.useUtils();

  // Mutations
  const updateRetentionMutation = trpc.versionCleanup.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Retention settings saved");
      utils.versionCleanup.getSettings.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const runCleanupMutation = trpc.versionCleanup.runCleanup.useMutation({
    onSuccess: (result) => {
      toast.success(`Cleanup completed: ${result.versionsDeleted} versions deleted`);
      utils.versionCleanup.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Cleanup failed: ${error.message}`);
    },
  });

  const createAlertMutation = trpc.auditAlerts.createRule.useMutation({
    onSuccess: () => {
      toast.success("Alert rule created");
      setShowAlertDialog(false);
      resetAlertForm();
      utils.auditAlerts.listRules.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create alert: ${error.message}`);
    },
  });

  const updateAlertMutation = trpc.auditAlerts.updateRule.useMutation({
    onSuccess: () => {
      toast.success("Alert rule updated");
      setShowAlertDialog(false);
      resetAlertForm();
      utils.auditAlerts.listRules.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update alert: ${error.message}`);
    },
  });

  const deleteAlertMutation = trpc.auditAlerts.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("Alert rule deleted");
      setDeleteAlertId(null);
      utils.auditAlerts.listRules.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete alert: ${error.message}`);
    },
  });

  const createWebhookMutation = trpc.exportWebhooks.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created");
      setShowWebhookDialog(false);
      resetWebhookForm();
      utils.exportWebhooks.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create webhook: ${error.message}`);
    },
  });

  const updateWebhookMutation = trpc.exportWebhooks.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook updated");
      setShowWebhookDialog(false);
      resetWebhookForm();
      utils.exportWebhooks.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update webhook: ${error.message}`);
    },
  });

  const deleteWebhookMutation = trpc.exportWebhooks.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted");
      setDeleteWebhookId(null);
      utils.exportWebhooks.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete webhook: ${error.message}`);
    },
  });

  // Initialize retention settings from query
  useState(() => {
    if (retentionSettings) {
      setRetentionEnabled(retentionSettings.enabled);
      setMaxVersionsPerExport(retentionSettings.maxVersionsPerExport);
      setMaxAgeDays(retentionSettings.maxAgeDays);
      setMinVersionsToKeep(retentionSettings.minVersionsToKeep);
      setMaxTotalSizeMb(retentionSettings.maxTotalSizeMb);
      setArchiveBeforeDelete(retentionSettings.archiveBeforeDelete);
      setCleanupFrequency(retentionSettings.cleanupFrequency as "daily" | "weekly" | "monthly");
    }
  });

  const resetAlertForm = () => {
    setEditingAlert(null);
    setAlertName("");
    setAlertDescription("");
    setAlertActions([]);
    setAlertThreshold(1);
    setAlertWindow(60);
    setAlertCooldown(15);
    setAlertNotifyEmail(true);
    setAlertNotifyWebhook(false);
    setAlertWebhookUrl("");
  };

  const resetWebhookForm = () => {
    setEditingWebhook(null);
    setWebhookName("");
    setWebhookUrl("");
    setWebhookTemplate("generic");
    setWebhookSecret("");
    setWebhookTriggers({
      exportComplete: true,
      exportFailed: true,
      importComplete: false,
      importFailed: false,
      scheduledExport: true,
      shareAccess: false,
    });
  };

  const handleSaveRetention = () => {
    updateRetentionMutation.mutate({
      enabled: retentionEnabled,
      maxVersionsPerExport,
      maxAgeDays,
      minVersionsToKeep,
      maxTotalSizeMb,
      archiveBeforeDelete,
      cleanupFrequency,
    });
  };

  const handleSaveAlert = () => {
    if (!alertName || alertActions.length === 0) {
      toast.error("Please provide a name and select at least one trigger action");
      return;
    }

    const alertData = {
      name: alertName,
      description: alertDescription || undefined,
      triggerOnActions: alertActions,
      thresholdCount: alertThreshold,
      thresholdWindowMinutes: alertWindow,
      cooldownMinutes: alertCooldown,
      notifyEmail: alertNotifyEmail,
      notifyWebhook: alertNotifyWebhook,
      webhookUrl: alertNotifyWebhook ? alertWebhookUrl : undefined,
    };

    if (editingAlert) {
      updateAlertMutation.mutate({ ruleId: editingAlert, ...alertData });
    } else {
      createAlertMutation.mutate(alertData);
    }
  };

  const handleSaveWebhook = () => {
    if (!webhookName || !webhookUrl) {
      toast.error("Please provide a name and URL");
      return;
    }

    const webhookData = {
      name: webhookName,
      url: webhookUrl,
      secret: webhookSecret || undefined,
      triggerOnExportComplete: webhookTriggers.exportComplete,
      triggerOnExportFailed: webhookTriggers.exportFailed,
      triggerOnImportComplete: webhookTriggers.importComplete,
      triggerOnImportFailed: webhookTriggers.importFailed,
      triggerOnScheduledExport: webhookTriggers.scheduledExport,
      triggerOnShareAccess: webhookTriggers.shareAccess,
    };

    if (editingWebhook) {
      updateWebhookMutation.mutate({ id: editingWebhook, ...webhookData });
    } else {
      createWebhookMutation.mutate(webhookData);
    }
  };

  const openEditAlert = (alert: NonNullable<typeof alertRules>[0]) => {
    setEditingAlert(alert.id);
    setAlertName(alert.name);
    setAlertDescription(alert.description || "");
    setAlertActions(alert.triggerOnActions);
    setAlertThreshold(alert.thresholdCount);
    setAlertWindow(alert.thresholdWindowMinutes);
    setAlertCooldown(alert.cooldownMinutes);
    setAlertNotifyEmail(alert.notifyEmail);
    setAlertNotifyWebhook(alert.notifyWebhook);
    setAlertWebhookUrl(alert.webhookUrl || "");
    setShowAlertDialog(true);
  };

  const openEditWebhook = (webhook: NonNullable<typeof webhooks>['webhooks'][0]) => {
    setEditingWebhook(webhook.id);
    setWebhookName(webhook.name);
    setWebhookUrl(webhook.url);
    setWebhookSecret(webhook.secret || "");
    setWebhookTriggers({
      exportComplete: webhook.triggerOnExportComplete,
      exportFailed: webhook.triggerOnExportFailed,
      importComplete: webhook.triggerOnImportComplete,
      importFailed: webhook.triggerOnImportFailed,
      scheduledExport: webhook.triggerOnScheduledExport,
      shareAccess: webhook.triggerOnShareAccess,
    });
    setShowWebhookDialog(true);
  };

  const createAlertFromTemplate = (templateId: string) => {
    const template = alertTemplates?.find((t) => t.id === templateId);
    if (template) {
      setAlertName(template.name);
      setAlertDescription(template.description);
      setAlertActions(template.config.triggerOnActions || []);
      setAlertThreshold(template.config.thresholdCount || 1);
      setAlertWindow(template.config.thresholdWindowMinutes || 60);
      setAlertCooldown(template.config.cooldownMinutes || 15);
      setShowAlertDialog(true);
    }
  };

  const actionOptions = [
    { value: "share_access", label: "Share Access" },
    { value: "export_download", label: "Export Download" },
    { value: "export_failed", label: "Export Failed" },
    { value: "import_failed", label: "Import Failed" },
    { value: "scheduled_export_failed", label: "Scheduled Export Failed" },
    { value: "unauthorized_access", label: "Unauthorized Access" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Export Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage retention policies, alert rules, and webhook configurations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="retention" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Retention</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              <span className="hidden sm:inline">Webhooks</span>
            </TabsTrigger>
          </TabsList>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Cleanups
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cleanupStats?.totalCleanups || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Versions Deleted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cleanupStats?.totalVersionsDeleted || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Space Freed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cleanupStats?.totalSpaceFreedMb?.toFixed(1) || 0} MB
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cleanupStats?.successRate || 100}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Retention Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Retention Policy</CardTitle>
                    <CardDescription>
                      Configure automatic cleanup of old export versions
                    </CardDescription>
                  </div>
                  <Switch
                    checked={retentionEnabled}
                    onCheckedChange={setRetentionEnabled}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Max Versions Per Export
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={maxVersionsPerExport || ""}
                      onChange={(e) => setMaxVersionsPerExport(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="No limit"
                      disabled={!retentionEnabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Keep only the most recent N versions per export
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Max Age (Days)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={maxAgeDays || ""}
                      onChange={(e) => setMaxAgeDays(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="No limit"
                      disabled={!retentionEnabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Delete versions older than N days
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Min Versions to Keep
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={minVersionsToKeep}
                      onChange={(e) => setMinVersionsToKeep(parseInt(e.target.value) || 1)}
                      disabled={!retentionEnabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Always keep at least N versions regardless of other rules
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Max Total Size (MB)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={maxTotalSizeMb || ""}
                      onChange={(e) => setMaxTotalSizeMb(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="No limit"
                      disabled={!retentionEnabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Delete oldest versions when total size exceeds limit
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Cleanup Frequency
                    </Label>
                    <Select
                      value={cleanupFrequency}
                      onValueChange={(v) => setCleanupFrequency(v as "daily" | "weekly" | "monthly")}
                      disabled={!retentionEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      Archive Before Delete
                    </Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        checked={archiveBeforeDelete}
                        onCheckedChange={setArchiveBeforeDelete}
                        disabled={!retentionEnabled}
                      />
                      <span className="text-sm text-muted-foreground">
                        {archiveBeforeDelete ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveRetention}
                    disabled={updateRetentionMutation.isPending}
                  >
                    {updateRetentionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Settings
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => runCleanupMutation.mutate()}
                    disabled={!retentionEnabled || runCleanupMutation.isPending}
                  >
                    {runCleanupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Run Cleanup Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6 mt-6">
            {/* Alert Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertStats?.totalAlerts || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unacknowledged
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {alertStats?.unacknowledged || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Last 24 Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{alertStats?.last24Hours || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Critical
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {alertStats?.bySeverity?.critical || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Start Templates</CardTitle>
                <CardDescription>
                  Create alert rules from predefined templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {alertTemplates?.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => createAlertFromTemplate(template.id)}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                      <div className="text-left">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alert Rules List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Alert Rules</CardTitle>
                    <CardDescription>
                      {alertRules?.length || 0} rules configured
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAlertDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAlerts ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : alertRules?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No alert rules configured. Create one to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertRules?.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${rule.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                            {rule.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Triggers: {rule.triggerOnActions.join(", ")} | 
                              Threshold: {rule.thresholdCount} in {rule.thresholdWindowMinutes}min
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.triggerCount} triggered
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditAlert(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteAlertId(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-6 mt-6">
            {/* Webhook Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Service Templates</CardTitle>
                <CardDescription>
                  Pre-configured templates for popular services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {webhookTemplates?.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="justify-start h-auto py-3"
                      onClick={() => {
                        setWebhookTemplate(template.id);
                        setShowWebhookDialog(true);
                      }}
                    >
                      <Webhook className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {template.description}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Webhooks List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configured Webhooks</CardTitle>
                    <CardDescription>
                      {webhooks?.webhooks?.length || 0} webhooks configured
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowWebhookDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingWebhooks ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : webhooks?.webhooks?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No webhooks configured. Create one to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks?.webhooks?.map((webhook) => (
                      <div
                        key={webhook.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${webhook.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                            {webhook.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{webhook.name}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {webhook.url}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {webhook.successCount}/{webhook.totalTriggers} success
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditWebhook(webhook)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteWebhookId(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Alert Rule Dialog */}
        <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingAlert ? "Edit Alert Rule" : "Create Alert Rule"}
              </DialogTitle>
              <DialogDescription>
                Configure when and how you want to be notified
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  placeholder="e.g., Unauthorized Access Alert"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={alertDescription}
                  onChange={(e) => setAlertDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger Actions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {actionOptions.map((action) => (
                    <div key={action.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={action.value}
                        checked={alertActions.includes(action.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAlertActions([...alertActions, action.value]);
                          } else {
                            setAlertActions(alertActions.filter((a) => a !== action.value));
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor={action.value} className="text-sm">
                        {action.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Threshold</Label>
                  <Input
                    type="number"
                    min={1}
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Window (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={alertWindow}
                    onChange={(e) => setAlertWindow(parseInt(e.target.value) || 60)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cooldown (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={alertCooldown}
                    onChange={(e) => setAlertCooldown(parseInt(e.target.value) || 15)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notifications</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={alertNotifyEmail}
                      onCheckedChange={setAlertNotifyEmail}
                    />
                    <span className="text-sm">Email notification</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={alertNotifyWebhook}
                      onCheckedChange={setAlertNotifyWebhook}
                    />
                    <span className="text-sm">Webhook notification</span>
                  </div>
                  {alertNotifyWebhook && (
                    <Input
                      value={alertWebhookUrl}
                      onChange={(e) => setAlertWebhookUrl(e.target.value)}
                      placeholder="https://..."
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAlertDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveAlert}
                disabled={createAlertMutation.isPending || updateAlertMutation.isPending}
              >
                {(createAlertMutation.isPending || updateAlertMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingAlert ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Webhook Dialog */}
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? "Edit Webhook" : "Create Webhook"}
              </DialogTitle>
              <DialogDescription>
                Configure webhook endpoint and triggers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  placeholder="e.g., Slack Notifications"
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={
                    webhookTemplates?.find((t) => t.id === webhookTemplate)?.urlPlaceholder ||
                    "https://..."
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Secret (Optional)</Label>
                <Input
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="For HMAC signature verification"
                  type="password"
                />
              </div>
              <div className="space-y-2">
                <Label>Triggers</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={webhookTriggers.exportComplete}
                      onCheckedChange={(v) =>
                        setWebhookTriggers({ ...webhookTriggers, exportComplete: v })
                      }
                    />
                    <span className="text-sm">Export Complete</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={webhookTriggers.exportFailed}
                      onCheckedChange={(v) =>
                        setWebhookTriggers({ ...webhookTriggers, exportFailed: v })
                      }
                    />
                    <span className="text-sm">Export Failed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={webhookTriggers.importComplete}
                      onCheckedChange={(v) =>
                        setWebhookTriggers({ ...webhookTriggers, importComplete: v })
                      }
                    />
                    <span className="text-sm">Import Complete</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={webhookTriggers.importFailed}
                      onCheckedChange={(v) =>
                        setWebhookTriggers({ ...webhookTriggers, importFailed: v })
                      }
                    />
                    <span className="text-sm">Import Failed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={webhookTriggers.scheduledExport}
                      onCheckedChange={(v) =>
                        setWebhookTriggers({ ...webhookTriggers, scheduledExport: v })
                      }
                    />
                    <span className="text-sm">Scheduled Export</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={webhookTriggers.shareAccess}
                      onCheckedChange={(v) =>
                        setWebhookTriggers({ ...webhookTriggers, shareAccess: v })
                      }
                    />
                    <span className="text-sm">Share Access</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveWebhook}
                disabled={createWebhookMutation.isPending || updateWebhookMutation.isPending}
              >
                {(createWebhookMutation.isPending || updateWebhookMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingWebhook ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Alert Confirmation */}
        <AlertDialog open={!!deleteAlertId} onOpenChange={() => setDeleteAlertId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Alert Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this alert rule? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAlertId && deleteAlertMutation.mutate({ ruleId: deleteAlertId })}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Webhook Confirmation */}
        <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this webhook? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteWebhookId && deleteWebhookMutation.mutate({ id: deleteWebhookId })}
                className="bg-red-500 hover:bg-red-600"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
