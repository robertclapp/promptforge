import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  FileText,
  BarChart3,
  Shield,
  DollarSign,
  Users,
  Layers,
  Send,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const reportTypes = [
  { value: "api_usage", label: "API Usage", icon: BarChart3, description: "API calls, usage patterns" },
  { value: "security_summary", label: "Security Summary", icon: Shield, description: "Security events, access logs" },
  { value: "evaluation_metrics", label: "Evaluation Metrics", icon: FileText, description: "Evaluation results, quality scores" },
  { value: "budget_status", label: "Budget Status", icon: DollarSign, description: "Spending, budget utilization" },
  { value: "team_activity", label: "Team Activity", icon: Users, description: "Team actions, collaboration" },
  { value: "comprehensive", label: "Comprehensive", icon: Layers, description: "All metrics combined" },
];

const frequencies = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const daysOfWeek = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function ScheduledReports() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [showDeliveriesDialog, setShowDeliveriesDialog] = useState<string | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    reportType: "comprehensive" as string,
    frequency: "weekly" as string,
    dayOfWeek: 1,
    dayOfMonth: 1,
    hour: 9,
    emailRecipients: "",
    includeAttachment: true,
    attachmentFormat: "pdf" as string,
  });

  const { data: reports, isLoading, refetch } = trpc.scheduledReports.list.useQuery();
  const { data: deliveries, isLoading: deliveriesLoading } = trpc.scheduledReports.getDeliveries.useQuery(
    { reportId: showDeliveriesDialog || "", limit: 20 },
    { enabled: !!showDeliveriesDialog }
  );
  const { data: previewData, isLoading: previewLoading } = trpc.scheduledReports.preview.useQuery(
    { reportType: showPreviewDialog as "api_usage" | "security_summary" | "evaluation_metrics" | "budget_status" | "team_activity" | "comprehensive" },
    { enabled: !!showPreviewDialog }
  );
  const { data: emailPrefs } = trpc.scheduledReports.getEmailPreferences.useQuery();

  const createReport = trpc.scheduledReports.create.useMutation({
    onSuccess: () => {
      toast.success("Scheduled report created!");
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create report: ${error.message}`);
    },
  });

  const updateReport = trpc.scheduledReports.update.useMutation({
    onSuccess: () => {
      toast.success("Report updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update report: ${error.message}`);
    },
  });

  const deleteReport = trpc.scheduledReports.delete.useMutation({
    onSuccess: () => {
      toast.success("Report deleted");
      setShowDeleteDialog(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete report: ${error.message}`);
    },
  });

  const sendTest = trpc.scheduledReports.sendTest.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Test report sent successfully!");
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });

  const updateEmailPrefs = trpc.scheduledReports.updateEmailPreferences.useMutation({
    onSuccess: () => {
      toast.success("Email preferences updated");
    },
    onError: (error) => {
      toast.error(`Failed to update preferences: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      reportType: "comprehensive",
      frequency: "weekly",
      dayOfWeek: 1,
      dayOfMonth: 1,
      hour: 9,
      emailRecipients: "",
      includeAttachment: true,
      attachmentFormat: "pdf",
    });
  };

  const handleCreate = () => {
    const recipients = formData.emailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);

    if (recipients.length === 0) {
      toast.error("Please enter at least one email recipient");
      return;
    }

    createReport.mutate({
      name: formData.name,
      reportType: formData.reportType as "api_usage" | "security_summary" | "evaluation_metrics" | "budget_status" | "team_activity" | "comprehensive",
      frequency: formData.frequency as "daily" | "weekly" | "monthly",
      dayOfWeek: formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
      dayOfMonth: formData.frequency === "monthly" ? formData.dayOfMonth : undefined,
      hour: formData.hour,
      emailRecipients: recipients,
      includeAttachment: formData.includeAttachment,
      attachmentFormat: formData.attachmentFormat as "pdf" | "csv" | "json",
    });
  };

  const getReportTypeInfo = (type: string) => {
    return reportTypes.find((t) => t.value === type) || reportTypes[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Scheduled Reports</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
            Configure automated email reports for your workspace
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Create Report
        </Button>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="reports" className="flex-1 sm:flex-none">Reports</TabsTrigger>
          <TabsTrigger value="preferences" className="flex-1 sm:flex-none">Email Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => {
                const typeInfo = getReportTypeInfo(report.reportType);
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={report.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <TypeIcon className="w-5 h-5 text-primary shrink-0" />
                            <span className="font-medium">{report.name}</span>
                            <Badge variant={report.isActive ? "default" : "secondary"}>
                              {report.isActive ? "Active" : "Paused"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{typeInfo.label}</Badge>
                            <Badge variant="outline" className="capitalize">
                              {report.frequency}
                            </Badge>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {report.hour}:00
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {(report.emailRecipients as string[]).length} recipient(s)
                            </span>
                            {report.lastSentAt && (
                              <span>Last sent: {new Date(report.lastSentAt).toLocaleDateString()}</span>
                            )}
                            {report.nextScheduledAt && (
                              <span>Next: {new Date(report.nextScheduledAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Switch
                            checked={report.isActive}
                            onCheckedChange={(checked) =>
                              updateReport.mutate({ reportId: report.id, isActive: checked })
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreviewDialog(report.reportType)}
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendTest.mutate({ reportId: report.id })}
                            disabled={sendTest.isPending}
                            title="Send Test"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeliveriesDialog(report.id)}
                            title="History"
                          >
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteDialog(report.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No scheduled reports</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first scheduled report to receive automated updates
                </p>
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Report
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notification Preferences</CardTitle>
              <CardDescription>
                Choose which types of emails you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Security Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts for security events
                  </p>
                </div>
                <Switch
                  checked={emailPrefs?.securityAlerts ?? true}
                  onCheckedChange={(checked) =>
                    updateEmailPrefs.mutate({ securityAlerts: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Evaluation Complete</p>
                  <p className="text-sm text-muted-foreground">
                    Notify when evaluations finish
                  </p>
                </div>
                <Switch
                  checked={emailPrefs?.evaluationComplete ?? true}
                  onCheckedChange={(checked) =>
                    updateEmailPrefs.mutate({ evaluationComplete: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Budget Warnings</p>
                  <p className="text-sm text-muted-foreground">
                    Alert when budgets reach thresholds
                  </p>
                </div>
                <Switch
                  checked={emailPrefs?.budgetWarnings ?? true}
                  onCheckedChange={(checked) =>
                    updateEmailPrefs.mutate({ budgetWarnings: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Digest</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary email
                  </p>
                </div>
                <Switch
                  checked={emailPrefs?.weeklyDigest ?? false}
                  onCheckedChange={(checked) =>
                    updateEmailPrefs.mutate({ weeklyDigest: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Monthly Report</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a monthly analytics report
                  </p>
                </div>
                <Switch
                  checked={emailPrefs?.monthlyReport ?? false}
                  onCheckedChange={(checked) =>
                    updateEmailPrefs.mutate({ monthlyReport: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Team Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notify about team member changes
                  </p>
                </div>
                <Switch
                  checked={emailPrefs?.teamUpdates ?? true}
                  onCheckedChange={(checked) =>
                    updateEmailPrefs.mutate({ teamUpdates: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Report Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Scheduled Report</DialogTitle>
            <DialogDescription>
              Configure an automated report to be sent on a schedule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                placeholder="Weekly Security Summary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select
                value={formData.reportType}
                onValueChange={(value) => setFormData({ ...formData, reportType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="w-4 h-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getReportTypeInfo(formData.reportType).description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Time (Hour)</Label>
                <Select
                  value={formData.hour.toString()}
                  onValueChange={(value) => setFormData({ ...formData, hour: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={formData.dayOfWeek.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.frequency === "monthly" && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select
                  value={formData.dayOfMonth.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dayOfMonth: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipients">Email Recipients</Label>
              <Input
                id="recipients"
                placeholder="email1@example.com, email2@example.com"
                value={formData.emailRecipients}
                onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple emails with commas
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Include Attachment</p>
                <p className="text-xs text-muted-foreground">
                  Attach report data file
                </p>
              </div>
              <Switch
                checked={formData.includeAttachment}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, includeAttachment: checked })
                }
              />
            </div>

            {formData.includeAttachment && (
              <div className="space-y-2">
                <Label>Attachment Format</Label>
                <Select
                  value={formData.attachmentFormat}
                  onValueChange={(value) => setFormData({ ...formData, attachmentFormat: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.name || !formData.emailRecipients || createReport.isPending}
            >
              {createReport.isPending ? "Creating..." : "Create Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliveries Dialog */}
      <Dialog open={!!showDeliveriesDialog} onOpenChange={() => setShowDeliveriesDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery History</DialogTitle>
            <DialogDescription>Recent report deliveries</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {deliveriesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : deliveries && deliveries.length > 0 ? (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="p-4 border rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {delivery.status === "sent" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={delivery.status === "sent" ? "default" : "destructive"}>
                            {delivery.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {(delivery.recipients as string[]).length} recipient(s)
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {delivery.sentAt ? new Date(delivery.sentAt).toLocaleString() : "Unknown"}
                        </p>
                      </div>
                    </div>
                    {delivery.errorMessage && (
                      <code className="text-xs bg-muted px-2 py-1 rounded max-w-xs truncate">
                        {delivery.errorMessage}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No deliveries yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!showPreviewDialog} onOpenChange={() => setShowPreviewDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>
              Preview of {getReportTypeInfo(showPreviewDialog || "").label} report data
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {previewLoading ? (
              <Skeleton className="h-48" />
            ) : previewData ? (
              <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs max-h-96">
                {JSON.stringify(previewData, null, 2)}
              </pre>
            ) : (
              <p className="text-center text-muted-foreground">No data available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheduled Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scheduled report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && deleteReport.mutate({ reportId: showDeleteDialog })}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
