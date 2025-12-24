import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Download, 
  Trash2, 
  FileJson, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FileText,
  Database,
  Activity,
  Settings,
  Package,
  Key,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

export default function DataPortability() {
  const [activeTab, setActiveTab] = useState("export");
  const [exportType, setExportType] = useState<"full" | "prompts" | "evaluations" | "settings" | "activity">("full");
  const [deletionType, setDeletionType] = useState<"full" | "prompts" | "evaluations" | "activity">("prompts");
  const [pendingDeletion, setPendingDeletion] = useState<{ requestId: string; confirmationCode: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: summary, isLoading: summaryLoading } = trpc.dataExport.getDataSummary.useQuery();
  const { data: exportHistory, isLoading: exportHistoryLoading, refetch: refetchExports } = trpc.dataExport.getExportHistory.useQuery();
  const { data: deletionHistory, isLoading: deletionHistoryLoading, refetch: refetchDeletions } = trpc.dataExport.getDeletionHistory.useQuery();

  const createExport = trpc.dataExport.createExport.useMutation({
    onSuccess: () => {
      toast.success("Export request created. Processing will begin shortly.");
      refetchExports();
    },
    onError: (error) => {
      toast.error(`Failed to create export: ${error.message}`);
    },
  });

  const getDownloadUrl = trpc.dataExport.getDownloadUrl.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(`Failed to get download URL: ${error.message}`);
    },
  });

  const createDeletion = trpc.dataExport.createDeletionRequest.useMutation({
    onSuccess: (data) => {
      if (data) {
        setPendingDeletion(data);
        setShowDeleteConfirm(true);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create deletion request: ${error.message}`);
    },
  });

  const confirmDeletion = trpc.dataExport.confirmDeletion.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Successfully deleted ${data.deletedRecords} records.`);
        setPendingDeletion(null);
        setShowDeleteConfirm(false);
        setConfirmCode("");
        refetchDeletions();
      } else {
        toast.error(data.error || "Deletion failed");
      }
    },
    onError: (error) => {
      toast.error(`Deletion failed: ${error.message}`);
    },
  });

  function getStatusBadge(status: string | null) {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="gap-1 border-green-500 text-green-600"><CheckCircle className="w-3 h-3" /> Completed</Badge>;
      case "processing":
        return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600"><RefreshCw className="w-3 h-3 animate-spin" /> Processing</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
      case "expired":
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Expired</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
    }
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Portability</h1>
        <p className="text-muted-foreground mt-2">
          Export your data or request deletion for GDPR compliance
        </p>
      </div>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Your Data Summary
          </CardTitle>
          <CardDescription>Overview of data stored in your account</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <FileText className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{summary.prompts}</p>
                <p className="text-sm text-muted-foreground">Prompts</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <Activity className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{summary.evaluations}</p>
                <p className="text-sm text-muted-foreground">Evaluations</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <Package className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">{summary.contextPackages}</p>
                <p className="text-sm text-muted-foreground">Context Packages</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{summary.activityEvents}</p>
                <p className="text-sm text-muted-foreground">Activity Events</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <Key className="w-6 h-6 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold">{summary.apiKeys}</p>
                <p className="text-sm text-muted-foreground">API Keys</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="delete" className="gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Data
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Data Export</CardTitle>
              <CardDescription>
                Download a copy of your data in JSON format. Exports are available for 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>What would you like to export?</Label>
                <RadioGroup value={exportType} onValueChange={(v) => setExportType(v as typeof exportType)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      <span className="font-medium">Full Export</span>
                      <p className="text-sm text-muted-foreground">All your data including prompts, evaluations, settings, and activity</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="prompts" id="prompts" />
                    <Label htmlFor="prompts" className="flex-1 cursor-pointer">
                      <span className="font-medium">Prompts Only</span>
                      <p className="text-sm text-muted-foreground">All your prompts and their versions</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="evaluations" id="evaluations" />
                    <Label htmlFor="evaluations" className="flex-1 cursor-pointer">
                      <span className="font-medium">Evaluations Only</span>
                      <p className="text-sm text-muted-foreground">All your evaluations and results</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="settings" id="settings" />
                    <Label htmlFor="settings" className="flex-1 cursor-pointer">
                      <span className="font-medium">Settings & API Keys</span>
                      <p className="text-sm text-muted-foreground">Your profile, API keys, and configuration</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="activity" id="activity" />
                    <Label htmlFor="activity" className="flex-1 cursor-pointer">
                      <span className="font-medium">Activity Log</span>
                      <p className="text-sm text-muted-foreground">Your activity history and login records</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                onClick={() => createExport.mutate({ exportType, format: "json" })}
                disabled={createExport.isPending}
                className="gap-2"
              >
                {createExport.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Request Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delete Tab */}
        <TabsContent value="delete" className="space-y-4">
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Request Data Deletion
              </CardTitle>
              <CardDescription>
                Permanently delete your data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Data deletion is permanent and cannot be reversed. 
                  Please export your data before proceeding if you need a backup.
                </p>
              </div>

              <div className="space-y-4">
                <Label>What would you like to delete?</Label>
                <RadioGroup value={deletionType} onValueChange={(v) => setDeletionType(v as typeof deletionType)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg border-red-200">
                    <RadioGroupItem value="prompts" id="del-prompts" />
                    <Label htmlFor="del-prompts" className="flex-1 cursor-pointer">
                      <span className="font-medium">Prompts</span>
                      <p className="text-sm text-muted-foreground">Delete all your prompts and versions</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg border-red-200">
                    <RadioGroupItem value="evaluations" id="del-evaluations" />
                    <Label htmlFor="del-evaluations" className="flex-1 cursor-pointer">
                      <span className="font-medium">Evaluations</span>
                      <p className="text-sm text-muted-foreground">Delete all your evaluations and results</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg border-red-200">
                    <RadioGroupItem value="activity" id="del-activity" />
                    <Label htmlFor="del-activity" className="flex-1 cursor-pointer">
                      <span className="font-medium">Activity Log</span>
                      <p className="text-sm text-muted-foreground">Delete your activity history and login records</p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg border-red-300 bg-red-50">
                    <RadioGroupItem value="full" id="del-full" />
                    <Label htmlFor="del-full" className="flex-1 cursor-pointer">
                      <span className="font-medium text-red-600">Delete Everything</span>
                      <p className="text-sm text-red-600">Permanently delete all your data (except account)</p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                variant="destructive"
                onClick={() => createDeletion.mutate({ deletionType })}
                disabled={createDeletion.isPending}
                className="gap-2"
              >
                {createDeletion.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Request Deletion
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Export History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {exportHistoryLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : exportHistory && exportHistory.length > 0 ? (
                  <div className="space-y-4">
                    {exportHistory.map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileJson className="w-4 h-4 text-blue-500" />
                            <span className="font-medium capitalize">{request.exportType} Export</span>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        {request.status === "processing" && request.progress !== null && (
                          <div className="space-y-1">
                            <Progress value={request.progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">{request.progress}% complete</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "Unknown"}</span>
                          <span>{formatBytes(request.fileSize)}</span>
                        </div>

                        {request.status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => getDownloadUrl.mutate({ requestId: request.id })}
                            disabled={getDownloadUrl.isPending}
                            className="w-full gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        )}

                        {request.status === "failed" && request.errorMessage && (
                          <p className="text-sm text-red-500">{request.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No export history yet</p>
                )}
              </CardContent>
            </Card>

            {/* Deletion History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Deletion History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deletionHistoryLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : deletionHistory && deletionHistory.length > 0 ? (
                  <div className="space-y-4">
                    {deletionHistory.map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{request.deletionType} Deletion</span>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : "Unknown"}</span>
                          {request.status === "completed" && (
                            <span>{request.deletedRecords} records deleted</span>
                          )}
                        </div>
                        {request.status === "failed" && request.errorMessage && (
                          <p className="text-sm text-red-500 mt-2">{request.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No deletion history yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Deletion Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Data Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                To confirm deletion, please enter the following confirmation code:
              </p>
              <div className="p-3 bg-muted rounded-lg text-center">
                <code className="text-lg font-mono font-bold">{pendingDeletion?.confirmationCode}</code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-code">Enter confirmation code:</Label>
                <Input
                  id="confirm-code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingDeletion(null);
              setConfirmCode("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeletion) {
                  confirmDeletion.mutate({
                    requestId: pendingDeletion.requestId,
                    confirmationCode: confirmCode,
                  });
                }
              }}
              disabled={confirmCode !== pendingDeletion?.confirmationCode || confirmDeletion.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {confirmDeletion.isPending ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
