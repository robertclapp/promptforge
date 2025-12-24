import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Shield, 
  Bell, 
  Archive, 
  Trash2, 
  RefreshCw,
  Clock,
  AlertTriangle,
  Save,
  Info,
  Download,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

export default function SecuritySettings() {
  const utils = trpc.useUtils();

  // Security Alert Settings
  const { data: alertSettings, isLoading: alertsLoading } = 
    trpc.securityAlerts.getSettings.useQuery();

  const [alertForm, setAlertForm] = useState({
    permissionDenialThreshold: 5,
    permissionDenialWindowMinutes: 15,
    bulkDeletionThreshold: 10,
    bulkDeletionWindowMinutes: 30,
    loginAttemptThreshold: 5,
    loginAttemptWindowMinutes: 10,
    enabled: true,
  });

  // Update form when data loads
  useState(() => {
    if (alertSettings) {
      setAlertForm({
        permissionDenialThreshold: alertSettings.permissionDenialThreshold,
        permissionDenialWindowMinutes: alertSettings.permissionDenialWindowMinutes,
        bulkDeletionThreshold: alertSettings.bulkDeletionThreshold,
        bulkDeletionWindowMinutes: alertSettings.bulkDeletionWindowMinutes,
        loginAttemptThreshold: alertSettings.loginAttemptThreshold,
        loginAttemptWindowMinutes: alertSettings.loginAttemptWindowMinutes,
        enabled: alertSettings.enabled,
      });
    }
  });

  // Retention Settings
  const { data: retentionSettings, isLoading: retentionLoading } = 
    trpc.auditRetention.getSettings.useQuery();

  const { data: retentionStats, isLoading: statsLoading } = 
    trpc.auditRetention.getStats.useQuery();

  const { data: archives, isLoading: archivesLoading } = 
    trpc.auditRetention.getArchives.useQuery({ limit: 10 });

  const [retentionDays, setRetentionDays] = useState("90");
  const [archiveBeforeDelete, setArchiveBeforeDelete] = useState(true);

  // Mutations
  const updateAlertsMutation = trpc.securityAlerts.updateSettings.useMutation({
    onSuccess: () => {
      utils.securityAlerts.getSettings.invalidate();
      toast.success("Alert settings saved");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRetentionMutation = trpc.auditRetention.updateSettings.useMutation({
    onSuccess: () => {
      utils.auditRetention.getSettings.invalidate();
      utils.auditRetention.getStats.invalidate();
      toast.success("Retention settings saved");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const runCleanupMutation = trpc.auditRetention.runCleanup.useMutation({
    onSuccess: (result) => {
      utils.auditRetention.getStats.invalidate();
      utils.auditRetention.getArchives.invalidate();
      toast.success(`Cleanup complete: ${result.deleted} logs deleted, ${result.archived} archived`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteArchiveMutation = trpc.auditRetention.deleteArchive.useMutation({
    onSuccess: () => {
      utils.auditRetention.getArchives.invalidate();
      toast.success("Archive deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSaveAlerts = () => {
    updateAlertsMutation.mutate(alertForm);
  };

  const handleSaveRetention = () => {
    updateRetentionMutation.mutate({
      retentionDays: parseInt(retentionDays),
      archiveBeforeDelete,
    });
  };

  const isLoading = alertsLoading || retentionLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Security Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure security alerts and audit log retention policies
          </p>
        </div>

        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Security Alerts
            </TabsTrigger>
            <TabsTrigger value="retention" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Log Retention
            </TabsTrigger>
          </TabsList>

          {/* Security Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            {/* Enable/Disable */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Security Alerts</CardTitle>
                    <CardDescription>
                      Receive notifications when suspicious activity is detected
                    </CardDescription>
                  </div>
                  <Switch
                    checked={alertForm.enabled}
                    onCheckedChange={(checked) => setAlertForm({ ...alertForm, enabled: checked })}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Alert Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alert Thresholds
                </CardTitle>
                <CardDescription>
                  Configure when security alerts are triggered
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Permission Denials */}
                <div className="space-y-4">
                  <h4 className="font-medium">Permission Denials</h4>
                  <p className="text-sm text-muted-foreground">
                    Alert when a user is denied access multiple times
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Threshold (number of denials)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={alertForm.permissionDenialThreshold}
                        onChange={(e) => setAlertForm({ 
                          ...alertForm, 
                          permissionDenialThreshold: parseInt(e.target.value) || 5 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time window (minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={alertForm.permissionDenialWindowMinutes}
                        onChange={(e) => setAlertForm({ 
                          ...alertForm, 
                          permissionDenialWindowMinutes: parseInt(e.target.value) || 15 
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Bulk Deletions */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Bulk Deletions</h4>
                  <p className="text-sm text-muted-foreground">
                    Alert when a user deletes many resources in a short time
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Threshold (number of deletions)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={alertForm.bulkDeletionThreshold}
                        onChange={(e) => setAlertForm({ 
                          ...alertForm, 
                          bulkDeletionThreshold: parseInt(e.target.value) || 10 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time window (minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={alertForm.bulkDeletionWindowMinutes}
                        onChange={(e) => setAlertForm({ 
                          ...alertForm, 
                          bulkDeletionWindowMinutes: parseInt(e.target.value) || 30 
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Login Attempts */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium">Failed Login Attempts</h4>
                  <p className="text-sm text-muted-foreground">
                    Alert on suspicious login activity
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Threshold (failed attempts)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={alertForm.loginAttemptThreshold}
                        onChange={(e) => setAlertForm({ 
                          ...alertForm, 
                          loginAttemptThreshold: parseInt(e.target.value) || 5 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time window (minutes)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={1440}
                        value={alertForm.loginAttemptWindowMinutes}
                        onChange={(e) => setAlertForm({ 
                          ...alertForm, 
                          loginAttemptWindowMinutes: parseInt(e.target.value) || 10 
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveAlerts} disabled={updateAlertsMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Alert Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Retention Tab */}
          <TabsContent value="retention" className="space-y-6">
            {/* Retention Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Retention Policy
                </CardTitle>
                <CardDescription>
                  Configure how long audit logs are kept before cleanup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Retention Period</Label>
                    <Select value={retentionDays} onValueChange={setRetentionDays}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Keep Forever</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                        <SelectItem value="180">180 Days</SelectItem>
                        <SelectItem value="365">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Logs older than this will be automatically cleaned up
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Archive Before Delete</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={archiveBeforeDelete}
                        onCheckedChange={setArchiveBeforeDelete}
                      />
                      <span className="text-sm text-muted-foreground">
                        {archiveBeforeDelete ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Save logs to archive before deletion for compliance
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSaveRetention} disabled={updateRetentionMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Retention Settings
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={runCleanupMutation.isPending}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run Cleanup Now
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Run Manual Cleanup?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will archive and delete audit logs older than {retentionDays} days.
                          {retentionStats?.estimatedCleanupCount ? (
                            <span className="block mt-2 font-medium">
                              Estimated {retentionStats.estimatedCleanupCount} logs will be processed.
                            </span>
                          ) : null}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => runCleanupMutation.mutate()}>
                          Run Cleanup
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Log Statistics</CardTitle>
                <CardDescription>Current audit log storage overview</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">{retentionStats?.totalLogs || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Logs</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">{retentionStats?.logsOlderThan30Days || 0}</p>
                      <p className="text-sm text-muted-foreground">&gt; 30 Days</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold">{retentionStats?.logsOlderThan90Days || 0}</p>
                      <p className="text-sm text-muted-foreground">&gt; 90 Days</p>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {retentionStats?.estimatedCleanupCount || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Due for Cleanup</p>
                    </div>
                  </div>
                )}

                {retentionSettings?.lastCleanupAt && (
                  <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last cleanup: {formatDistanceToNow(new Date(retentionSettings.lastCleanupAt), { addSuffix: true })}
                    ({retentionSettings.lastCleanupCount} logs processed)
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Archives */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-purple-500" />
                  Archived Logs
                </CardTitle>
                <CardDescription>
                  {retentionStats?.totalArchives || 0} archives containing {retentionStats?.totalArchivedLogs || 0} logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {archivesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : archives?.archives.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No archives yet</p>
                    <p className="text-sm">Archives will appear here after cleanup runs</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {archives?.archives.map((archive) => (
                      <div
                        key={archive.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              {archive.startDate && archive.endDate
                                ? `${format(new Date(archive.startDate), "MMM d")} - ${format(new Date(archive.endDate), "MMM d, yyyy")}`
                                : "Archive"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {archive.logCount} logs • Created {archive.createdAt ? formatDistanceToNow(new Date(archive.createdAt), { addSuffix: true }) : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Archive?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this archive containing {archive.logCount} logs.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteArchiveMutation.mutate({ archiveId: archive.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
