import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  History,
  Webhook,
  Shield,
  Plus,
  Trash2,
  Edit,
  Play,
  RefreshCw,
  Download,
  Eye,
  GitCompare,
  Archive,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  ExternalLink,
} from "lucide-react";

export default function ExportManagement() {
  const [activeTab, setActiveTab] = useState("versions");
  
  // Version state
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  
  // Webhook state
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    description: "",
    url: "",
    secret: "",
    triggerOnExportComplete: true,
    triggerOnExportFailed: true,
    triggerOnImportComplete: false,
    triggerOnImportFailed: false,
    triggerOnScheduledExport: true,
    triggerOnShareAccess: false,
    maxRetries: 3,
    retryDelaySeconds: 60,
  });
  
  // Audit state
  const [auditFilters, setAuditFilters] = useState({
    action: "",
    resourceType: "",
    search: "",
  });
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Queries
  const versionsQuery = trpc.exportVersioning.list.useQuery();
  const versionStatsQuery = trpc.exportVersioning.stats.useQuery();
  const webhooksQuery = trpc.exportWebhooks.list.useQuery();
  const auditLogsQuery = trpc.exportAuditLog.list.useQuery({
    limit: 50,
    action: auditFilters.action as any || undefined,
    resourceType: auditFilters.resourceType as any || undefined,
    search: auditFilters.search || undefined,
  });
  const auditStatsQuery = trpc.exportAuditLog.stats.useQuery();
  const auditSettingsQuery = trpc.exportAuditLog.getSettings.useQuery();
  
  // Mutations
  const utils = trpc.useUtils();
  
  const createVersionMutation = trpc.exportVersioning.create.useMutation({
    onSuccess: () => {
      toast.success("Version created successfully");
      utils.exportVersioning.list.invalidate();
      utils.exportVersioning.stats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteVersionMutation = trpc.exportVersioning.delete.useMutation({
    onSuccess: () => {
      toast.success("Version deleted");
      utils.exportVersioning.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const archiveVersionMutation = trpc.exportVersioning.update.useMutation({
    onSuccess: () => {
      toast.success("Version archived");
      utils.exportVersioning.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const restoreVersionMutation = trpc.exportVersioning.restore.useMutation({
    onSuccess: (data) => {
      toast.success(`Restored version ${data.versionNumber}`);
      window.open(data.exportUrl, "_blank");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const compareVersionsQuery = trpc.exportVersioning.compare.useQuery(
    { versionId1: selectedVersions[0] || "", versionId2: selectedVersions[1] || "" },
    { enabled: selectedVersions.length === 2 && showCompareDialog }
  );
  
  const createWebhookMutation = trpc.exportWebhooks.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook created successfully");
      utils.exportWebhooks.list.invalidate();
      setShowWebhookDialog(false);
      resetWebhookForm();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateWebhookMutation = trpc.exportWebhooks.update.useMutation({
    onSuccess: () => {
      toast.success("Webhook updated");
      utils.exportWebhooks.list.invalidate();
      setShowWebhookDialog(false);
      setEditingWebhook(null);
      resetWebhookForm();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const deleteWebhookMutation = trpc.exportWebhooks.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook deleted");
      utils.exportWebhooks.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  
  const testWebhookMutation = trpc.exportWebhooks.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => toast.error(error.message),
  });
  
  const exportAuditLogsMutation = trpc.exportAuditLog.export.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.data], { type: data.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit logs exported");
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateAuditSettingsMutation = trpc.exportAuditLog.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      utils.exportAuditLog.getSettings.invalidate();
      setShowSettingsDialog(false);
    },
    onError: (error) => toast.error(error.message),
  });
  
  function resetWebhookForm() {
    setWebhookForm({
      name: "",
      description: "",
      url: "",
      secret: "",
      triggerOnExportComplete: true,
      triggerOnExportFailed: true,
      triggerOnImportComplete: false,
      triggerOnImportFailed: false,
      triggerOnScheduledExport: true,
      triggerOnShareAccess: false,
      maxRetries: 3,
      retryDelaySeconds: 60,
    });
  }
  
  function handleCreateWebhook() {
    createWebhookMutation.mutate(webhookForm);
  }
  
  function handleUpdateWebhook() {
    if (!editingWebhook) return;
    updateWebhookMutation.mutate({ id: editingWebhook, ...webhookForm });
  }
  
  function openEditWebhook(webhook: any) {
    setEditingWebhook(webhook.id);
    setWebhookForm({
      name: webhook.name,
      description: webhook.description || "",
      url: webhook.url,
      secret: webhook.secret || "",
      triggerOnExportComplete: webhook.triggerOnExportComplete,
      triggerOnExportFailed: webhook.triggerOnExportFailed,
      triggerOnImportComplete: webhook.triggerOnImportComplete,
      triggerOnImportFailed: webhook.triggerOnImportFailed,
      triggerOnScheduledExport: webhook.triggerOnScheduledExport,
      triggerOnShareAccess: webhook.triggerOnShareAccess,
      maxRetries: webhook.maxRetries,
      retryDelaySeconds: webhook.retryDelaySeconds,
    });
    setShowWebhookDialog(true);
  }
  
  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
  
  function formatDate(date: Date | string | null): string {
    if (!date) return "N/A";
    return new Date(date).toLocaleString();
  }
  
  function getStatusBadge(status: string) {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "retrying":
        return <Badge className="bg-yellow-500"><RefreshCw className="w-3 h-3 mr-1" />Retrying</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Export Management</h1>
            <p className="text-muted-foreground">
              Manage versions, webhooks, and audit logs for your exports
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="versions" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Versions
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          {/* Versions Tab */}
          <TabsContent value="versions" className="space-y-4">
            {/* Version Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Versions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{versionStatsQuery.data?.totalVersions || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Archived</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{versionStatsQuery.data?.archivedVersions || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Storage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatBytes(versionStatsQuery.data?.totalStorageBytes || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Latest Version</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">v{versionStatsQuery.data?.latestVersion || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Compare Button */}
            {selectedVersions.length === 2 && (
              <div className="flex justify-end">
                <Button onClick={() => setShowCompareDialog(true)}>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare Selected Versions
                </Button>
              </div>
            )}

            {/* Versions List */}
            <Card>
              <CardHeader>
                <CardTitle>Version History</CardTitle>
                <CardDescription>
                  Select two versions to compare, or restore from a previous version
                </CardDescription>
              </CardHeader>
              <CardContent>
                {versionsQuery.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading versions...</div>
                ) : versionsQuery.data?.versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No versions yet. Create an export to start tracking versions.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versionsQuery.data?.versions.map((version) => (
                      <div
                        key={version.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          selectedVersions.includes(version.id) ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selectedVersions.includes(version.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedVersions.length < 2) {
                                  setSelectedVersions([...selectedVersions, version.id]);
                                }
                              } else {
                                setSelectedVersions(selectedVersions.filter((id) => id !== version.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              v{version.versionNumber} - {version.versionName}
                              {version.isArchived && (
                                <Badge variant="secondary">Archived</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {version.promptCount} prompts · {formatBytes(version.exportFileSize || 0)} · {formatDate(version.createdAt)}
                            </div>
                            {version.description && (
                              <div className="text-sm text-muted-foreground mt-1">{version.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreVersionMutation.mutate({ id: version.id })}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => archiveVersionMutation.mutate({ id: version.id, isArchived: !version.isArchived })}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteVersionMutation.mutate({ id: version.id })}
                          >
                            <Trash2 className="w-4 h-4" />
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
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { resetWebhookForm(); setEditingWebhook(null); setShowWebhookDialog(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Webhook
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Configured Webhooks</CardTitle>
                <CardDescription>
                  Webhooks are triggered when export events occur
                </CardDescription>
              </CardHeader>
              <CardContent>
                {webhooksQuery.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading webhooks...</div>
                ) : webhooksQuery.data?.webhooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No webhooks configured. Add a webhook to receive notifications.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooksQuery.data?.webhooks.map((webhook) => (
                      <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {webhook.name}
                            <Badge variant={webhook.isActive ? "default" : "secondary"}>
                              {webhook.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {webhook.url}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {webhook.totalTriggers} triggers · {webhook.successCount} success · {webhook.failureCount} failed
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testWebhookMutation.mutate({ id: webhook.id })}
                            disabled={testWebhookMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditWebhook(webhook)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteWebhookMutation.mutate({ id: webhook.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            {/* Audit Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditStatsQuery.data?.totalEvents || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Exports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(auditStatsQuery.data?.eventsByResourceType?.export || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Shares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(auditStatsQuery.data?.eventsByResourceType?.share || 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Retention</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditSettingsQuery.data?.retentionDays || 90} days</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Select
                  value={auditFilters.resourceType}
                  onValueChange={(value) => setAuditFilters({ ...auditFilters, resourceType: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Resource Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="share">Share</SelectItem>
                    <SelectItem value="version">Version</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search..."
                  value={auditFilters.search}
                  onChange={(e) => setAuditFilters({ ...auditFilters, search: e.target.value })}
                  className="w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportAuditLogsMutation.mutate({ format: "csv" })}
                  disabled={exportAuditLogsMutation.isPending}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Audit Logs List */}
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>
                  Detailed log of all export-related activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogsQuery.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
                ) : auditLogsQuery.data?.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit logs found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogsQuery.data?.logs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
                            <Badge variant="secondary">{log.resourceType}</Badge>
                            <span className="text-muted-foreground">{formatDate(log.createdAt)}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {log.actorName || log.actorEmail || "System"} · {log.ipAddress || "N/A"}
                          </div>
                          {log.metadata && (
                            <div className="text-xs text-muted-foreground">
                              {log.metadata.exportFileName && `File: ${log.metadata.exportFileName}`}
                              {log.metadata.promptCount && ` · ${log.metadata.promptCount} prompts`}
                              {log.metadata.fileSize && ` · ${formatBytes(log.metadata.fileSize)}`}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Compare Versions Dialog */}
        <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compare Versions</DialogTitle>
              <DialogDescription>
                Comparing changes between two export versions
              </DialogDescription>
            </DialogHeader>
            {compareVersionsQuery.isLoading ? (
              <div className="text-center py-8">Loading comparison...</div>
            ) : compareVersionsQuery.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Version {compareVersionsQuery.data.version1.versionNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div>{compareVersionsQuery.data.version1.promptCount} prompts</div>
                      <div>{formatBytes(compareVersionsQuery.data.version1.fileSize || 0)}</div>
                      <div className="text-muted-foreground">{formatDate(compareVersionsQuery.data.version1.createdAt)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Version {compareVersionsQuery.data.version2.versionNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div>{compareVersionsQuery.data.version2.promptCount} prompts</div>
                      <div>{formatBytes(compareVersionsQuery.data.version2.fileSize || 0)}</div>
                      <div className="text-muted-foreground">{formatDate(compareVersionsQuery.data.version2.createdAt)}</div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Changes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span>Prompt Count:</span>
                      <Badge variant={compareVersionsQuery.data.comparison.promptCountDiff > 0 ? "default" : compareVersionsQuery.data.comparison.promptCountDiff < 0 ? "destructive" : "secondary"}>
                        {compareVersionsQuery.data.comparison.promptCountDiff > 0 ? "+" : ""}{compareVersionsQuery.data.comparison.promptCountDiff}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>File Size:</span>
                      <Badge variant="outline">
                        {compareVersionsQuery.data.comparison.fileSizeDiff > 0 ? "+" : ""}{formatBytes(Math.abs(compareVersionsQuery.data.comparison.fileSizeDiff))}
                      </Badge>
                    </div>
                    {compareVersionsQuery.data.comparison.addedPrompts.length > 0 && (
                      <div>
                        <span className="text-green-600">Added:</span> {compareVersionsQuery.data.comparison.addedPrompts.join(", ")}
                      </div>
                    )}
                    {compareVersionsQuery.data.comparison.removedPrompts.length > 0 && (
                      <div>
                        <span className="text-red-600">Removed:</span> {compareVersionsQuery.data.comparison.removedPrompts.join(", ")}
                      </div>
                    )}
                    {compareVersionsQuery.data.comparison.modifiedPrompts.length > 0 && (
                      <div>
                        <span className="text-yellow-600">Modified:</span> {compareVersionsQuery.data.comparison.modifiedPrompts.join(", ")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompareDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Webhook Dialog */}
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
              <DialogDescription>
                Configure a webhook to receive notifications for export events
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  placeholder="My Webhook"
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div className="space-y-2">
                <Label>Secret (for HMAC signature)</Label>
                <Input
                  value={webhookForm.secret}
                  onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                  placeholder="Optional secret key"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={webhookForm.description}
                  onChange={(e) => setWebhookForm({ ...webhookForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Trigger Events</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhookForm.triggerOnExportComplete}
                      onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, triggerOnExportComplete: checked })}
                    />
                    <span className="text-sm">Export Complete</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhookForm.triggerOnExportFailed}
                      onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, triggerOnExportFailed: checked })}
                    />
                    <span className="text-sm">Export Failed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhookForm.triggerOnImportComplete}
                      onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, triggerOnImportComplete: checked })}
                    />
                    <span className="text-sm">Import Complete</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhookForm.triggerOnScheduledExport}
                      onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, triggerOnScheduledExport: checked })}
                    />
                    <span className="text-sm">Scheduled Export</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={webhookForm.maxRetries}
                    onChange={(e) => setWebhookForm({ ...webhookForm, maxRetries: parseInt(e.target.value) || 3 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Retry Delay (seconds)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={3600}
                    value={webhookForm.retryDelaySeconds}
                    onChange={(e) => setWebhookForm({ ...webhookForm, retryDelaySeconds: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>Cancel</Button>
              <Button onClick={editingWebhook ? handleUpdateWebhook : handleCreateWebhook}>
                {editingWebhook ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Audit Settings Dialog */}
        <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Audit Log Settings</DialogTitle>
              <DialogDescription>
                Configure what events are logged and how long they are retained
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Retention Period (days)</Label>
                <Input
                  type="number"
                  min={7}
                  max={365}
                  defaultValue={auditSettingsQuery.data?.retentionDays || 90}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 7 && value <= 365) {
                      updateAuditSettingsMutation.mutate({ retentionDays: value });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Log Categories</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logExports ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logExports: checked })}
                    />
                    <span className="text-sm">Exports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logImports ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logImports: checked })}
                    />
                    <span className="text-sm">Imports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logShares ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logShares: checked })}
                    />
                    <span className="text-sm">Shares</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logVersions ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logVersions: checked })}
                    />
                    <span className="text-sm">Versions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logWebhooks ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logWebhooks: checked })}
                    />
                    <span className="text-sm">Webhooks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logSchedules ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logSchedules: checked })}
                    />
                    <span className="text-sm">Schedules</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Privacy Settings</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logIpAddresses ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logIpAddresses: checked })}
                    />
                    <span className="text-sm">Log IP Addresses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={auditSettingsQuery.data?.logUserAgents ?? true}
                      onCheckedChange={(checked) => updateAuditSettingsMutation.mutate({ logUserAgents: checked })}
                    />
                    <span className="text-sm">Log User Agents</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
