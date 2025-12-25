import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  GitCompare,
  Plus,
  Minus,
  Edit,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Calendar,
  HardDrive,
  Layers,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiffLine {
  type: "unchanged" | "added" | "removed";
  text: string;
}

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const { data: diffLines, isLoading } = trpc.exportDiff.inlineDiff.useQuery(
    { oldText, newText },
    { enabled: !!oldText && !!newText }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!diffLines) {
    return <div className="text-muted-foreground text-sm">No diff available</div>;
  }

  return (
    <div className="font-mono text-sm border rounded-lg overflow-hidden">
      {diffLines.map((line, index) => (
        <div
          key={index}
          className={cn(
            "px-4 py-1 flex items-start gap-2 border-l-2",
            line.type === "added" && "bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-l-green-500",
            line.type === "removed" && "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-l-red-500",
            line.type === "unchanged" && "bg-muted/30 border-l-transparent"
          )}
        >
          <span className="w-5 flex-shrink-0 text-muted-foreground">
            {line.type === "added" && <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />}
            {line.type === "removed" && <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />}
            {line.type === "unchanged" && <span className="text-xs">&nbsp;</span>}
          </span>
          <span className="whitespace-pre-wrap break-all">{line.text || " "}</span>
        </div>
      ))}
    </div>
  );
}

function PromptDiffCard({
  prompt,
  isExpanded,
  onToggle,
}: {
  prompt: {
    id: string;
    name: string;
    status: "added" | "removed" | "modified" | "unchanged";
    oldValue?: { content: string; description?: string };
    newValue?: { content: string; description?: string };
    changes?: { field: string; oldValue: string; newValue: string }[];
  };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = {
    added: {
      icon: Plus,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/30",
      badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    removed: {
      icon: Minus,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/30",
      badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
    modified: {
      icon: Edit,
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/30",
      badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    },
    unchanged: {
      icon: Check,
      color: "text-gray-500",
      bg: "bg-gray-100 dark:bg-gray-800",
      badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    },
  };

  const config = statusConfig[prompt.status];
  const Icon = config.icon;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors",
          config.bg
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", config.color)} />
          <div>
            <span className="font-medium">{prompt.name}</span>
            <span className="text-xs text-muted-foreground ml-2">({prompt.id})</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={config.badge}>{prompt.status}</Badge>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 border-t bg-background">
          {prompt.status === "added" && prompt.newValue && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-green-600">New Content</h4>
              <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {prompt.newValue.content}
              </div>
            </div>
          )}

          {prompt.status === "removed" && prompt.oldValue && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-red-600">Removed Content</h4>
              <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap">
                {prompt.oldValue.content}
              </div>
            </div>
          )}

          {prompt.status === "modified" && prompt.oldValue && prompt.newValue && (
            <Tabs defaultValue="diff" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="diff">Diff View</TabsTrigger>
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                {prompt.changes && prompt.changes.length > 0 && (
                  <TabsTrigger value="changes">
                    Field Changes ({prompt.changes.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="diff">
                <DiffViewer
                  oldText={prompt.oldValue.content}
                  newText={prompt.newValue.content}
                />
              </TabsContent>

              <TabsContent value="side-by-side">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600 flex items-center gap-1">
                      <Minus className="h-4 w-4" /> Old Version
                    </h4>
                    <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                      {prompt.oldValue.content}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-600 flex items-center gap-1">
                      <Plus className="h-4 w-4" /> New Version
                    </h4>
                    <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                      {prompt.newValue.content}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {prompt.changes && prompt.changes.length > 0 && (
                <TabsContent value="changes">
                  <div className="space-y-3">
                    {prompt.changes.map((change, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="text-sm font-medium mb-2 capitalize">
                          {change.field}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-red-50 dark:bg-red-950/30 p-2 rounded">
                            <span className="text-xs text-red-600 block mb-1">Old</span>
                            <span className="font-mono text-xs break-all">
                              {change.oldValue || "(empty)"}
                            </span>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded">
                            <span className="text-xs text-green-600 block mb-1">New</span>
                            <span className="font-mono text-xs break-all">
                              {change.newValue || "(empty)"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}

          {prompt.status === "unchanged" && prompt.oldValue && (
            <div className="text-muted-foreground text-sm">
              No changes detected in this prompt.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExportDiffViewer() {
  const [version1, setVersion1] = useState<string>("");
  const [version2, setVersion2] = useState<string>("");
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: versions, isLoading: loadingVersions } = trpc.exportDiff.getVersions.useQuery();

  const {
    data: diffResult,
    isLoading: loadingDiff,
    error: diffError,
  } = trpc.exportDiff.compare.useQuery(
    { version1Id: version1, version2Id: version2 },
    { enabled: !!version1 && !!version2 && version1 !== version2 }
  );

  const filteredPrompts = useMemo(() => {
    if (!diffResult) return [];
    if (filterStatus === "all") return diffResult.prompts;
    return diffResult.prompts.filter((p) => p.status === filterStatus);
  }, [diffResult, filterStatus]);

  const togglePrompt = (id: string) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (diffResult) {
      setExpandedPrompts(new Set(diffResult.prompts.map((p) => p.id)));
    }
  };

  const collapseAll = () => {
    setExpandedPrompts(new Set());
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitCompare className="h-6 w-6" />
            Export Version Comparison
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare two export versions to see what changed
          </p>
        </div>

        {/* Version Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Versions to Compare</CardTitle>
            <CardDescription>
              Choose two export versions to see the differences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="text-sm font-medium mb-2 block">Base Version (Old)</label>
                <Select value={version1} onValueChange={setVersion1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select base version..." />
                  </SelectTrigger>
                  <SelectContent>
                    {versions?.map((v) => (
                      <SelectItem key={v.id} value={v.id} disabled={v.id === version2}>
                        v{v.versionNumber} - {formatDate(v.createdAt)}
                        {v.description && ` (${v.description})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ArrowRight className="h-6 w-6 text-muted-foreground hidden sm:block" />

              <div className="flex-1 w-full">
                <label className="text-sm font-medium mb-2 block">Compare Version (New)</label>
                <Select value={version2} onValueChange={setVersion2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select compare version..." />
                  </SelectTrigger>
                  <SelectContent>
                    {versions?.map((v) => (
                      <SelectItem key={v.id} value={v.id} disabled={v.id === version1}>
                        v{v.versionNumber} - {formatDate(v.createdAt)}
                        {v.description && ` (${v.description})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loadingDiff && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {diffError && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                <span>Error loading diff: {diffError.message}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Diff Results */}
        {diffResult && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Prompts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{diffResult.summary.total}</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Added</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    +{diffResult.summary.added}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-600">Removed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    -{diffResult.summary.removed}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-600">Modified</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {diffResult.summary.modified}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Unchanged
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {diffResult.summary.unchanged}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Version Metadata */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Minus className="h-4 w-4 text-red-500" />
                    Base Version (v{diffResult.metadata.version1.versionNumber})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(diffResult.metadata.version1.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      {formatSize(diffResult.metadata.version1.fileSize)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-500" />
                    Compare Version (v{diffResult.metadata.version2.versionNumber})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(diffResult.metadata.version2.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      {formatSize(diffResult.metadata.version2.fileSize)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prompt Diffs */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Prompt Changes</CardTitle>
                    <CardDescription>
                      {filteredPrompts.length} of {diffResult.prompts.length} prompts shown
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Changes</SelectItem>
                        <SelectItem value="added">Added Only</SelectItem>
                        <SelectItem value="removed">Removed Only</SelectItem>
                        <SelectItem value="modified">Modified Only</SelectItem>
                        <SelectItem value="unchanged">Unchanged Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={expandAll}>
                      Expand All
                    </Button>
                    <Button variant="outline" size="sm" onClick={collapseAll}>
                      Collapse All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPrompts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No prompts match the selected filter.
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-3">
                      {filteredPrompts.map((prompt) => (
                        <PromptDiffCard
                          key={prompt.id}
                          prompt={prompt}
                          isExpanded={expandedPrompts.has(prompt.id)}
                          onToggle={() => togglePrompt(prompt.id)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!loadingDiff && !diffResult && version1 && version2 && version1 === version2 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                Please select two different versions to compare.
              </div>
            </CardContent>
          </Card>
        )}

        {!loadingDiff && !diffResult && (!version1 || !version2) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                Select two versions above to see the comparison.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
