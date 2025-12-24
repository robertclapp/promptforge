import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Plus, 
  Download,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  BarChart3,
  ClipboardCheck,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, subDays, subMonths } from "date-fns";

type ReportType = "security_audit" | "access_patterns" | "compliance_summary";
type ReportFormat = "pdf" | "csv" | "json";

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: "security_audit", 
    label: "Security Audit", 
    icon: <Shield className="h-4 w-4" />,
    description: "Comprehensive security analysis including 2FA adoption, permission denials, and login failures"
  },
  { 
    value: "access_patterns", 
    label: "Access Patterns", 
    icon: <BarChart3 className="h-4 w-4" />,
    description: "User activity breakdown by resource type, action, and frequency"
  },
  { 
    value: "compliance_summary", 
    label: "Compliance Summary", 
    icon: <ClipboardCheck className="h-4 w-4" />,
    description: "Overall compliance status with security best practices and recommendations"
  },
];

const REPORT_FORMATS: { value: ReportFormat; label: string }[] = [
  { value: "pdf", label: "PDF Document" },
  { value: "csv", label: "CSV Spreadsheet" },
  { value: "json", label: "JSON Data" },
];

const PERIOD_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "180d", label: "Last 6 months" },
  { value: "365d", label: "Last year" },
];

export default function ComplianceReports() {
  const utils = trpc.useUtils();
  
  // State
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>("security_audit");
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>("pdf");
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  // Queries
  const { data: reportsData, isLoading } = trpc.complianceReport.list.useQuery();

  // Mutations
  const createMutation = trpc.complianceReport.create.useMutation({
    onSuccess: () => {
      utils.complianceReport.list.invalidate();
      setCreateDialogOpen(false);
      toast.success("Report generation started. This may take a few minutes.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.complianceReport.delete.useMutation({
    onSuccess: () => {
      utils.complianceReport.list.invalidate();
      toast.success("Report deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateReport = () => {
    const periodEnd = new Date();
    let periodStart: Date;

    switch (selectedPeriod) {
      case "7d":
        periodStart = subDays(periodEnd, 7);
        break;
      case "30d":
        periodStart = subDays(periodEnd, 30);
        break;
      case "90d":
        periodStart = subDays(periodEnd, 90);
        break;
      case "180d":
        periodStart = subMonths(periodEnd, 6);
        break;
      case "365d":
        periodStart = subMonths(periodEnd, 12);
        break;
      default:
        periodStart = subDays(periodEnd, 30);
    }

    createMutation.mutate({
      reportType: selectedType,
      format: selectedFormat,
      periodStart,
      periodEnd,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "generating":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getReportTypeInfo = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type) || REPORT_TYPES[0];
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Compliance Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate security and compliance reports for audits
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Generate Compliance Report</DialogTitle>
                <DialogDescription>
                  Create a new security or compliance report for your workspace
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Report Type */}
                <div className="space-y-3">
                  <Label>Report Type</Label>
                  <div className="grid gap-3">
                    {REPORT_TYPES.map((type) => (
                      <div
                        key={type.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedType === type.value 
                            ? "border-primary bg-primary/5" 
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedType(type.value)}
                      >
                        <div className={`p-2 rounded-lg ${
                          selectedType === type.value 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          {type.icon}
                        </div>
                        <div>
                          <p className="font-medium">{type.label}</p>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Period */}
                <div className="space-y-2">
                  <Label>Time Period</Label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger>
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format */}
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ReportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateReport} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>
              {reportsData?.total || 0} reports generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reportsData?.reports && reportsData.reports.length > 0 ? (
              <div className="space-y-3">
                {reportsData.reports.map((report) => {
                  const typeInfo = getReportTypeInfo(report.reportType);
                  return (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          {typeInfo.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{typeInfo.label}</p>
                            {getStatusBadge(report.status)}
                            <Badge variant="outline" className="text-xs">
                              {report.format.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(report.periodStart), "MMM d, yyyy")} - {format(new Date(report.periodEnd), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.status === "completed" && report.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(report.fileUrl!, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                        {report.status === "failed" && report.errorMessage && (
                          <span className="text-sm text-red-500 max-w-xs truncate">
                            {report.errorMessage}
                          </span>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Report?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this compliance report.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate({ id: report.id })}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No compliance reports generated yet</p>
                <p className="text-sm">Click "Generate Report" to create your first report</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Compliance Reports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Security Audit</p>
                <p>Analyzes 2FA adoption, permission denials, login failures, and calculates an overall security score with recommendations.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Access Patterns</p>
                <p>Shows user activity breakdown by resource type, action frequency, and identifies the most active users.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardCheck className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Compliance Summary</p>
                <p>Provides an overview of compliance status with security best practices, including 2FA, IP allowlisting, and audit logging.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
