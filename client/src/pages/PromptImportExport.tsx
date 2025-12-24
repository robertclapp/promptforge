import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Package,
  RefreshCw,
  Calendar,
  Clock,
  History,
  Play,
  Pause,
  Trash2,
  Plus,
  Edit,
  ExternalLink,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function PromptImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Export state
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [exportAll, setExportAll] = useState(true);
  const [enableCompression, setEnableCompression] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [importPrefix, setImportPrefix] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Schedule state
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    description: "",
    frequency: "daily" as "daily" | "weekly" | "monthly",
    dayOfWeek: 1,
    dayOfMonth: 1,
    hour: 0,
    minute: 0,
    exportAll: true,
    promptIds: [] as string[],
    notifyOnSuccess: true,
    notifyOnFailure: true,
    enableCompression: false,
  });

  // Fetch prompts for selection
  const { data: promptsData } = trpc.prompts.list.useQuery({
    limit: 1000,
    offset: 0,
  });

  // Fetch schedules
  const { data: schedulesData, isLoading: schedulesLoading } = trpc.exportSchedules.list.useQuery();

  // Fetch history
  const { data: historyData, isLoading: historyLoading } = trpc.importExportHistory.list.useQuery({
    limit: 50,
    offset: 0,
  });

  // Fetch history stats
  const { data: historyStats } = trpc.importExportHistory.stats.useQuery();

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = trpc.exportTemplates.list.useQuery();
  const { data: templateStats } = trpc.exportTemplates.stats.useQuery();

  // Template state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    exportAll: true,
    promptIds: [] as string[],
    includeVersions: true,
    includeVariables: true,
    enableCompression: false,
    notifyOnSuccess: true,
    notifyOnFailure: true,
  });

  // Export mutation
  const exportMutation = trpc.promptImportExport.export.useMutation({
    onSuccess: (data) => {
      toast.success("Export successful", {
        description: "Your prompts have been exported. Download will start automatically.",
      });
      window.open(data.url, "_blank");
      setIsExporting(false);
      utils.importExportHistory.list.invalidate();
      utils.importExportHistory.stats.invalidate();
    },
    onError: (error) => {
      toast.error("Export failed", {
        description: error.message,
      });
      setIsExporting(false);
    },
  });

  // Import mutation
  const importMutation = trpc.promptImportExport.import.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      setIsImporting(false);
      utils.importExportHistory.list.invalidate();
      utils.importExportHistory.stats.invalidate();
      if (data.success) {
        toast.success("Import successful", {
          description: `Imported ${data.imported} prompts, skipped ${data.skipped}.`,
        });
      } else {
        toast.error("Import completed with errors", {
          description: `Imported ${data.imported} prompts with ${data.errors.length} errors.`,
        });
      }
    },
    onError: (error) => {
      toast.error("Import failed", {
        description: error.message,
      });
      setIsImporting(false);
    },
  });

  // Schedule mutations
  const createScheduleMutation = trpc.exportSchedules.create.useMutation({
    onSuccess: () => {
      toast.success("Schedule created");
      setShowScheduleDialog(false);
      resetScheduleForm();
      utils.exportSchedules.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to create schedule", { description: error.message });
    },
  });

  const updateScheduleMutation = trpc.exportSchedules.update.useMutation({
    onSuccess: () => {
      toast.success("Schedule updated");
      setShowScheduleDialog(false);
      setEditingSchedule(null);
      resetScheduleForm();
      utils.exportSchedules.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update schedule", { description: error.message });
    },
  });

  const deleteScheduleMutation = trpc.exportSchedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      utils.exportSchedules.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete schedule", { description: error.message });
    },
  });

  const toggleScheduleMutation = trpc.exportSchedules.toggle.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "Schedule activated" : "Schedule paused");
      utils.exportSchedules.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to toggle schedule", { description: error.message });
    },
  });

  const runNowMutation = trpc.exportSchedules.runNow.useMutation({
    onSuccess: (data) => {
      toast.success("Export started", {
        description: "The scheduled export is running now.",
      });
      if (data.url) {
        window.open(data.url, "_blank");
      }
      utils.exportSchedules.list.invalidate();
      utils.importExportHistory.list.invalidate();
    },
    onError: (error) => {
      toast.error("Export failed", { description: error.message });
    },
  });

  // Template mutations
  const createTemplateMutation = trpc.exportTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      setShowTemplateDialog(false);
      resetTemplateForm();
      utils.exportTemplates.list.invalidate();
      utils.exportTemplates.stats.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to create template", { description: error.message });
    },
  });

  const updateTemplateMutation = trpc.exportTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetTemplateForm();
      utils.exportTemplates.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update template", { description: error.message });
    },
  });

  const deleteTemplateMutation = trpc.exportTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.exportTemplates.list.invalidate();
      utils.exportTemplates.stats.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete template", { description: error.message });
    },
  });

  const duplicateTemplateMutation = trpc.exportTemplates.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Template duplicated");
      utils.exportTemplates.list.invalidate();
      utils.exportTemplates.stats.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to duplicate template", { description: error.message });
    },
  });

  const markTemplateUsedMutation = trpc.exportTemplates.markUsed.useMutation({
    onSuccess: () => {
      utils.exportTemplates.list.invalidate();
    },
  });

  // Helper functions
  const resetScheduleForm = () => {
    setScheduleForm({
      name: "",
      description: "",
      frequency: "daily",
      dayOfWeek: 1,
      dayOfMonth: 1,
      hour: 0,
      minute: 0,
      exportAll: true,
      promptIds: [],
      notifyOnSuccess: true,
      notifyOnFailure: true,
      enableCompression: false,
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      exportAll: true,
      promptIds: [],
      includeVersions: true,
      includeVariables: true,
      enableCompression: false,
      notifyOnSuccess: true,
      notifyOnFailure: true,
    });
  };

  const handleCreateTemplate = () => {
    createTemplateMutation.mutate({
      name: templateForm.name,
      description: templateForm.description || undefined,
      exportAll: templateForm.exportAll,
      promptIds: templateForm.exportAll ? undefined : templateForm.promptIds,
      includeVersions: templateForm.includeVersions,
      includeVariables: templateForm.includeVariables,
      enableCompression: templateForm.enableCompression,
      notifyOnSuccess: templateForm.notifyOnSuccess,
      notifyOnFailure: templateForm.notifyOnFailure,
    });
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      name: templateForm.name,
      description: templateForm.description || undefined,
      exportAll: templateForm.exportAll,
      promptIds: templateForm.exportAll ? undefined : templateForm.promptIds,
      includeVersions: templateForm.includeVersions,
      includeVariables: templateForm.includeVariables,
      enableCompression: templateForm.enableCompression,
      notifyOnSuccess: templateForm.notifyOnSuccess,
      notifyOnFailure: templateForm.notifyOnFailure,
    });
  };

  const openEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      exportAll: template.exportAll,
      promptIds: template.promptIds || [],
      includeVersions: template.includeVersions,
      includeVariables: template.includeVariables,
      enableCompression: template.enableCompression,
      notifyOnSuccess: template.notifyOnSuccess,
      notifyOnFailure: template.notifyOnFailure,
    });
    setShowTemplateDialog(true);
  };

  const useTemplate = (template: any) => {
    // Apply template settings to export
    setExportAll(template.exportAll);
    if (!template.exportAll && template.promptIds) {
      setSelectedPromptIds(template.promptIds);
    }
    setEnableCompression(template.enableCompression);
    markTemplateUsedMutation.mutate({ id: template.id });
    toast.success("Template applied", {
      description: `Settings from "${template.name}" have been applied.`,
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    exportMutation.mutate({
      promptIds: exportAll ? undefined : selectedPromptIds,
      enableCompression,
    });
  };

  const processFile = async (file: File) => {
    const isJson = file.name.endsWith(".json");
    const isGzip = file.name.endsWith(".json.gz") || file.name.endsWith(".gz");
    
    if (!isJson && !isGzip) {
      toast.error("Invalid file type", {
        description: "Please select a JSON or compressed (.json.gz) file.",
      });
      return;
    }

    setImportFile(file);
    setImportResult(null);

    try {
      let text: string;
      
      if (isGzip) {
        // For gzip files, we'll send the raw content to the server for decompression
        // Just show a preview message
        setImportPreview({
          formatVersion: "compressed",
          promptCount: "?",
          prompts: [],
          isCompressed: true,
          fileName: file.name,
        });
        return;
      }
      
      text = await file.text();
      const data = JSON.parse(text);
      setImportPreview(data);
    } catch (error) {
      toast.error("Invalid file", {
        description: "The selected file is not valid JSON.",
      });
      setImportFile(null);
      setImportPreview(null);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    
    // For gzip files, read as base64 to preserve binary data
    const isGzip = importFile.name.endsWith(".json.gz") || importFile.name.endsWith(".gz");
    let content: string;
    
    if (isGzip) {
      const arrayBuffer = await importFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // Convert to base64 without spread operator for compatibility
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      content = btoa(binary);
    } else {
      content = await importFile.text();
    }

    importMutation.mutate({
      jsonContent: content,
      overwriteExisting,
      prefix: importPrefix || undefined,
    });
  };

  const togglePromptSelection = (promptId: string) => {
    setSelectedPromptIds((prev) =>
      prev.includes(promptId)
        ? prev.filter((id) => id !== promptId)
        : [...prev, promptId]
    );
  };

  const selectAllPrompts = () => {
    if (promptsData) {
      setSelectedPromptIds(promptsData.map((p) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedPromptIds([]);
  };

  const handleCreateSchedule = () => {
    createScheduleMutation.mutate({
      name: scheduleForm.name,
      description: scheduleForm.description || undefined,
      frequency: scheduleForm.frequency,
      dayOfWeek: scheduleForm.frequency === "weekly" ? scheduleForm.dayOfWeek : undefined,
      dayOfMonth: scheduleForm.frequency === "monthly" ? scheduleForm.dayOfMonth : undefined,
      hour: scheduleForm.hour,
      minute: scheduleForm.minute,
      exportAll: scheduleForm.exportAll,
      promptIds: scheduleForm.exportAll ? undefined : scheduleForm.promptIds,
      notifyOnSuccess: scheduleForm.notifyOnSuccess,
      notifyOnFailure: scheduleForm.notifyOnFailure,
      enableCompression: scheduleForm.enableCompression,
    });
  };

  const handleUpdateSchedule = () => {
    if (!editingSchedule) return;
    updateScheduleMutation.mutate({
      id: editingSchedule.id,
      name: scheduleForm.name,
      description: scheduleForm.description || undefined,
      frequency: scheduleForm.frequency,
      dayOfWeek: scheduleForm.frequency === "weekly" ? scheduleForm.dayOfWeek : undefined,
      dayOfMonth: scheduleForm.frequency === "monthly" ? scheduleForm.dayOfMonth : undefined,
      hour: scheduleForm.hour,
      minute: scheduleForm.minute,
      exportAll: scheduleForm.exportAll,
      promptIds: scheduleForm.exportAll ? undefined : scheduleForm.promptIds,
      notifyOnSuccess: scheduleForm.notifyOnSuccess,
      notifyOnFailure: scheduleForm.notifyOnFailure,
      enableCompression: scheduleForm.enableCompression,
    });
  };

  const openEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      name: schedule.name,
      description: schedule.description || "",
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek ?? 1,
      dayOfMonth: schedule.dayOfMonth ?? 1,
      hour: schedule.hour,
      minute: schedule.minute,
      exportAll: schedule.exportAll,
      promptIds: schedule.promptIds || [],
      notifyOnSuccess: schedule.notifyOnSuccess ?? true,
      notifyOnFailure: schedule.notifyOnFailure ?? true,
      enableCompression: schedule.enableCompression ?? false,
    });
    setShowScheduleDialog(true);
  };

  const formatScheduleTime = (schedule: any) => {
    const hour = schedule.hour.toString().padStart(2, "0");
    const minute = schedule.minute.toString().padStart(2, "0");
    const time = `${hour}:${minute} UTC`;

    switch (schedule.frequency) {
      case "daily":
        return `Daily at ${time}`;
      case "weekly":
        const day = DAYS_OF_WEEK.find((d) => d.value === schedule.dayOfWeek)?.label || "Unknown";
        return `Every ${day} at ${time}`;
      case "monthly":
        return `Monthly on day ${schedule.dayOfMonth} at ${time}`;
      default:
        return time;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge className="bg-blue-500">Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import / Export Prompts</h1>
        <p className="text-muted-foreground mt-2">
          Bulk import and export prompts in JSON format for backup, migration, or sharing.
        </p>
      </div>

      {/* Stats Cards */}
      {historyStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{historyStats.exports.total}</p>
                  <p className="text-sm text-muted-foreground">Total Exports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{historyStats.imports.total}</p>
                  <p className="text-sm text-muted-foreground">Total Imports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {historyStats.exports.completed + historyStats.imports.completed}
                  </p>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{schedulesData?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active Schedules</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="export" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Export Prompts
              </CardTitle>
              <CardDescription>
                Export your prompts to a JSON file. Includes all versions, variables, and metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="export-all"
                    checked={exportAll}
                    onCheckedChange={setExportAll}
                  />
                  <Label htmlFor="export-all">Export all prompts</Label>
                </div>

                {!exportAll && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Select prompts to export:</Label>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={selectAllPrompts}>
                          Select All
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearSelection}>
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg max-h-64 overflow-y-auto p-4 space-y-2">
                      {promptsData?.map((prompt) => (
                        <div
                          key={prompt.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                        >
                          <Checkbox
                            id={prompt.id}
                            checked={selectedPromptIds.includes(prompt.id)}
                            onCheckedChange={() => togglePromptSelection(prompt.id)}
                          />
                          <Label htmlFor={prompt.id} className="flex-1 cursor-pointer">
                            {prompt.name}
                          </Label>
                          <Badge variant="outline">v{prompt.version}</Badge>
                        </div>
                      ))}

                      {(!promptsData || promptsData.length === 0) && (
                        <p className="text-muted-foreground text-center py-4">
                          No prompts available to export.
                        </p>
                      )}
                    </div>

                    {selectedPromptIds.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {selectedPromptIds.length} prompt(s) selected
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-compression"
                  checked={enableCompression}
                  onCheckedChange={setEnableCompression}
                />
                <Label htmlFor="enable-compression">Enable gzip compression</Label>
                <span className="text-xs text-muted-foreground">(Reduces file size for large exports)</span>
              </div>

              <Separator />

              <Button
                onClick={handleExport}
                disabled={isExporting || (!exportAll && selectedPromptIds.length === 0)}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export {exportAll ? "All Prompts" : `${selectedPromptIds.length} Prompt(s)`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Export Format
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">The export file includes:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Prompt name, description, and tags</li>
                <li>All versions with content and commit messages</li>
                <li>Variable definitions (name, type, default value)</li>
                <li>System prompts for each version</li>
                <li>Export metadata (date, user, workspace)</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Prompts
              </CardTitle>
              <CardDescription>
                Import prompts from a JSON export file. Supports PromptForge export format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                    isDragOver
                      ? "border-primary bg-primary/10 scale-[1.02]"
                      : "hover:border-primary hover:bg-muted/50"
                  }`}
                >
                  {importFile ? (
                    <div className="space-y-2">
                      <FileText className="h-12 w-12 mx-auto text-primary" />
                      <p className="font-medium">{importFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(importFile.size / 1024).toFixed(2)} KB
                      </p>
                      <Button variant="outline" size="sm">
                        Choose Different File
                      </Button>
                    </div>
                  ) : isDragOver ? (
                    <div className="space-y-2">
                      <Download className="h-12 w-12 mx-auto text-primary animate-bounce" />
                      <p className="font-medium text-primary">Drop your file here</p>
                      <p className="text-sm text-muted-foreground">Release to upload</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="font-medium">Click to select a JSON file</p>
                      <p className="text-sm text-muted-foreground">
                        Or drag and drop your export file here
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {importPreview && (
                <div className="space-y-4">
                  <Alert>
                    <FileJson className="h-4 w-4" />
                    <AlertTitle>File Preview</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        <p>Format Version: {importPreview.formatVersion || "Unknown"}</p>
                        <p>
                          Exported:{" "}
                          {importPreview.exportedAt
                            ? new Date(importPreview.exportedAt).toLocaleString()
                            : "Unknown"}
                        </p>
                        <p>Prompts: {importPreview.prompts?.length || 0}</p>
                        {importPreview.workspaceName && (
                          <p>From Workspace: {importPreview.workspaceName}</p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg max-h-48 overflow-y-auto p-4">
                    <p className="font-medium mb-2">Prompts to import:</p>
                    <ul className="space-y-1">
                      {importPreview.prompts?.map((prompt: any, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{prompt.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            {prompt.versions?.length || 0} version(s)
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {importPreview && (
                <div className="space-y-4">
                  <Separator />

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="overwrite"
                      checked={overwriteExisting}
                      onCheckedChange={setOverwriteExisting}
                    />
                    <Label htmlFor="overwrite">Overwrite existing prompts with same name</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prefix">Name prefix (optional)</Label>
                    <Input
                      id="prefix"
                      placeholder="e.g., imported_"
                      value={importPrefix}
                      onChange={(e) => setImportPrefix(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add a prefix to all imported prompt names to avoid conflicts
                    </p>
                  </div>
                </div>
              )}

              {importResult && (
                <Alert variant={importResult.success ? "default" : "destructive"}>
                  {importResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{importResult.success ? "Import Complete" : "Import Issues"}</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>Imported: {importResult.imported} prompt(s)</p>
                      <p>Skipped: {importResult.skipped} prompt(s)</p>
                      {importResult.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">Errors:</p>
                          <ul className="list-disc list-inside text-sm">
                            {importResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {importPreview && (
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {importPreview.prompts?.length || 0} Prompt(s)
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Import Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Only PromptForge JSON export format is supported</li>
                <li>Prompts with duplicate names will be skipped unless overwrite is enabled</li>
                <li>All versions and variables will be imported</li>
                <li>Use a prefix to avoid naming conflicts</li>
                <li>Large imports may take a few moments to process</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Export Templates
                  </CardTitle>
                  <CardDescription>
                    Save and reuse export configurations for quick access.
                  </CardDescription>
                </div>
                <Dialog open={showTemplateDialog} onOpenChange={(open) => {
                  setShowTemplateDialog(open);
                  if (!open) {
                    setEditingTemplate(null);
                    resetTemplateForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? "Edit Template" : "Create Export Template"}
                      </DialogTitle>
                      <DialogDescription>
                        Save your export settings as a reusable template.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Name</Label>
                        <Input
                          id="template-name"
                          placeholder="e.g., Full Backup Template"
                          value={templateForm.name}
                          onChange={(e) =>
                            setTemplateForm({ ...templateForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-description">Description (optional)</Label>
                        <Textarea
                          id="template-description"
                          placeholder="Describe this template..."
                          value={templateForm.description}
                          onChange={(e) =>
                            setTemplateForm({ ...templateForm, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="template-export-all"
                          checked={templateForm.exportAll}
                          onCheckedChange={(checked) =>
                            setTemplateForm({ ...templateForm, exportAll: checked })
                          }
                        />
                        <Label htmlFor="template-export-all">Export all prompts</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="template-compression"
                          checked={templateForm.enableCompression}
                          onCheckedChange={(checked) =>
                            setTemplateForm({ ...templateForm, enableCompression: checked })
                          }
                        />
                        <Label htmlFor="template-compression">Enable gzip compression</Label>
                      </div>
                      <Separator className="my-2" />
                      <Label className="text-sm font-medium">Notification Preferences</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="template-notify-success"
                          checked={templateForm.notifyOnSuccess}
                          onCheckedChange={(checked) =>
                            setTemplateForm({ ...templateForm, notifyOnSuccess: checked })
                          }
                        />
                        <Label htmlFor="template-notify-success">Notify on success</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="template-notify-failure"
                          checked={templateForm.notifyOnFailure}
                          onCheckedChange={(checked) =>
                            setTemplateForm({ ...templateForm, notifyOnFailure: checked })
                          }
                        />
                        <Label htmlFor="template-notify-failure">Notify on failure</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTemplateDialog(false);
                          setEditingTemplate(null);
                          resetTemplateForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                        disabled={!templateForm.name}
                      >
                        {editingTemplate ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : templatesData && templatesData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Options</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templatesData.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {template.description || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {template.exportAll && <Badge variant="outline">All</Badge>}
                            {template.enableCompression && <Badge variant="secondary">Gzip</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{template.usageCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => useTemplate(template)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => duplicateTemplateMutation.mutate({ id: template.id })}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditTemplate(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteTemplateMutation.mutate({ id: template.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-sm">Create a template to save your export settings for quick access.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {templateStats && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{templateStats.totalTemplates}</div>
                  <p className="text-xs text-muted-foreground">Total Templates</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{templateStats.totalUsage}</div>
                  <p className="text-xs text-muted-foreground">Total Usage</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{templateStats.withCompression}</div>
                  <p className="text-xs text-muted-foreground">With Compression</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{templateStats.withScheduleConfig}</div>
                  <p className="text-xs text-muted-foreground">With Schedule Config</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Export Schedules
                  </CardTitle>
                  <CardDescription>
                    Set up automatic periodic backups of your prompts.
                  </CardDescription>
                </div>
                <Dialog open={showScheduleDialog} onOpenChange={(open) => {
                  setShowScheduleDialog(open);
                  if (!open) {
                    setEditingSchedule(null);
                    resetScheduleForm();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingSchedule ? "Edit Schedule" : "Create Export Schedule"}
                      </DialogTitle>
                      <DialogDescription>
                        Configure automatic exports of your prompts.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="schedule-name">Name</Label>
                        <Input
                          id="schedule-name"
                          placeholder="e.g., Daily Backup"
                          value={scheduleForm.name}
                          onChange={(e) =>
                            setScheduleForm({ ...scheduleForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedule-description">Description (optional)</Label>
                        <Textarea
                          id="schedule-description"
                          placeholder="Describe this schedule..."
                          value={scheduleForm.description}
                          onChange={(e) =>
                            setScheduleForm({ ...scheduleForm, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select
                          value={scheduleForm.frequency}
                          onValueChange={(value: "daily" | "weekly" | "monthly") =>
                            setScheduleForm({ ...scheduleForm, frequency: value })
                          }
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
                      {scheduleForm.frequency === "weekly" && (
                        <div className="space-y-2">
                          <Label>Day of Week</Label>
                          <Select
                            value={scheduleForm.dayOfWeek.toString()}
                            onValueChange={(value) =>
                              setScheduleForm({ ...scheduleForm, dayOfWeek: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {scheduleForm.frequency === "monthly" && (
                        <div className="space-y-2">
                          <Label>Day of Month</Label>
                          <Select
                            value={scheduleForm.dayOfMonth.toString()}
                            onValueChange={(value) =>
                              setScheduleForm({ ...scheduleForm, dayOfMonth: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Hour (UTC)</Label>
                          <Select
                            value={scheduleForm.hour.toString()}
                            onValueChange={(value) =>
                              setScheduleForm({ ...scheduleForm, hour: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                <SelectItem key={hour} value={hour.toString()}>
                                  {hour.toString().padStart(2, "0")}:00
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Minute</Label>
                          <Select
                            value={scheduleForm.minute.toString()}
                            onValueChange={(value) =>
                              setScheduleForm({ ...scheduleForm, minute: parseInt(value) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 15, 30, 45].map((minute) => (
                                <SelectItem key={minute} value={minute.toString()}>
                                  :{minute.toString().padStart(2, "0")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="schedule-export-all"
                          checked={scheduleForm.exportAll}
                          onCheckedChange={(checked) =>
                            setScheduleForm({ ...scheduleForm, exportAll: checked })
                          }
                        />
                        <Label htmlFor="schedule-export-all">Export all prompts</Label>
                      </div>
                      
                      <Separator className="my-2" />
                      <Label className="text-sm font-medium">Options</Label>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="schedule-compression"
                          checked={scheduleForm.enableCompression}
                          onCheckedChange={(checked) =>
                            setScheduleForm({ ...scheduleForm, enableCompression: checked })
                          }
                        />
                        <Label htmlFor="schedule-compression">Enable gzip compression</Label>
                      </div>
                      
                      <Separator className="my-2" />
                      <Label className="text-sm font-medium">Notifications</Label>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="schedule-notify-success"
                          checked={scheduleForm.notifyOnSuccess}
                          onCheckedChange={(checked) =>
                            setScheduleForm({ ...scheduleForm, notifyOnSuccess: checked })
                          }
                        />
                        <Label htmlFor="schedule-notify-success">Notify on success</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="schedule-notify-failure"
                          checked={scheduleForm.notifyOnFailure}
                          onCheckedChange={(checked) =>
                            setScheduleForm({ ...scheduleForm, notifyOnFailure: checked })
                          }
                        />
                        <Label htmlFor="schedule-notify-failure">Notify on failure</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowScheduleDialog(false);
                          setEditingSchedule(null);
                          resetScheduleForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                        disabled={
                          !scheduleForm.name ||
                          createScheduleMutation.isPending ||
                          updateScheduleMutation.isPending
                        }
                      >
                        {createScheduleMutation.isPending || updateScheduleMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {editingSchedule ? "Update" : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : schedulesData && schedulesData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulesData.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{schedule.name}</p>
                            {schedule.description && (
                              <p className="text-sm text-muted-foreground">
                                {schedule.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatScheduleTime(schedule)}</TableCell>
                        <TableCell>{formatDate(schedule.lastRunAt)}</TableCell>
                        <TableCell>{formatDate(schedule.nextRunAt)}</TableCell>
                        <TableCell>
                          {schedule.isActive ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="outline">Paused</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => runNowMutation.mutate({ id: schedule.id })}
                              disabled={runNowMutation.isPending}
                              title="Run now"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleScheduleMutation.mutate({ id: schedule.id })}
                              title={schedule.isActive ? "Pause" : "Activate"}
                            >
                              {schedule.isActive ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditSchedule(schedule)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteScheduleMutation.mutate({ id: schedule.id })}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No export schedules configured.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a schedule to automatically backup your prompts.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Import/Export History
              </CardTitle>
              <CardDescription>
                View past import and export operations. Download previous exports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : historyData && historyData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {entry.operationType === "export" ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Download className="h-3 w-3" />
                              Export
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <Upload className="h-3 w-3" />
                              Import
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate">
                            {entry.exportFileName || entry.importFileName || "N/A"}
                          </div>
                          {(entry.exportFileSize || entry.importFileSize) && (
                            <p className="text-xs text-muted-foreground">
                              {(
                                (entry.exportFileSize || entry.importFileSize || 0) / 1024
                              ).toFixed(2)}{" "}
                              KB
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.operationType === "export" ? (
                            <span className="text-sm">
                              {entry.exportPromptCount} prompts, {entry.exportVersionCount} versions
                            </span>
                          ) : (
                            <span className="text-sm">
                              {entry.importedCount} imported, {entry.skippedCount} skipped
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>{formatDate(entry.startedAt)}</TableCell>
                        <TableCell className="text-right">
                          {entry.operationType === "export" &&
                            entry.status === "completed" &&
                            entry.exportUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(entry.exportUrl!, "_blank")}
                                title="Download"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No import/export history yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your import and export operations will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
