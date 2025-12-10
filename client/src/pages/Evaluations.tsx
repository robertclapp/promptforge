import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Zap, Play, Eye, Clock, CheckCircle2, XCircle, Loader2, Download, FileText } from "lucide-react";
import { exportEvaluationToPDF, exportEvaluationToCSV } from "@/utils/exportPDF";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function Evaluations() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    promptId: "",
    testCases: [{ input: { variable: "" }, expectedOutput: "" }],
  });

  const utils = trpc.useUtils();
  const { data: evaluations, isLoading } = trpc.evaluations.list.useQuery(
    {},
    {
      // Poll every 3 seconds to get real-time status updates
      refetchInterval: 3000,
    }
  );
  const { data: prompts } = trpc.prompts.list.useQuery({ limit: 100 });
  const { data: providers } = trpc.aiProviders.list.useQuery({});
  const { data: results } = trpc.evaluations.getResults.useQuery(
    { evaluationId: selectedEvaluation?.id || "" },
    { 
      enabled: !!selectedEvaluation,
      // Poll results if evaluation is still running
      refetchInterval: (data) => {
        return selectedEvaluation?.status === 'running' || selectedEvaluation?.status === 'pending' ? 3000 : false;
      },
    }
  );

  const createMutation = trpc.evaluations.create.useMutation({
    onSuccess: () => {
      toast.success("Evaluation created successfully!");
      setIsCreateOpen(false);
      setFormData({
        name: "",
        description: "",
        promptId: "",
        testCases: [{ input: { variable: "" }, expectedOutput: "" }],
      });
      utils.evaluations.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create evaluation");
    },
  });

  const runMutation = trpc.evaluations.run.useMutation({
    onSuccess: () => {
      toast.success("Evaluation completed successfully!");
      utils.evaluations.list.invalidate();
      utils.evaluations.getResults.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to run evaluation");
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.promptId) {
      toast.error("Name and prompt are required");
      return;
    }

    if (!providers || providers.length === 0) {
      toast.error("Please add at least one AI provider first");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      promptId: formData.promptId,
      providerIds: providers.map((p: any) => p.id),
      testCases: formData.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput || undefined,
      })),
    });
  };

  const handleRun = (evaluationId: string) => {
    if (!providers || providers.length === 0) {
      toast.error("Please add at least one AI provider first");
      return;
    }

    runMutation.mutate({
      id: evaluationId,
    });
  };

  const handleViewResults = (evaluation: any) => {
    setSelectedEvaluation(evaluation);
    setIsResultsOpen(true);
  };

  const handleExportPDF = () => {
    if (!selectedEvaluation || !results || results.length === 0) {
      toast.error("No results to export");
      return;
    }

    const prompt = prompts?.find((p: any) => p.id === selectedEvaluation.promptId);
    const exportData = {
      evaluationName: selectedEvaluation.name,
      promptName: prompt?.name || "Unknown Prompt",
      createdAt: selectedEvaluation.createdAt,
      results: results.map((r: any) => {
        const provider = providers?.find((p: any) => p.id === r.providerId);
        return {
          providerName: provider?.name || "Unknown Provider",
          model: r.model || provider?.model || "Unknown Model",
          tokensUsed: r.tokensUsed,
          latencyMs: r.latencyMs,
          cost: r.cost / 100, // Convert from cents to dollars
          quality: r.quality || 0,
          output: r.output,
        };
      }),
    };

    exportEvaluationToPDF(exportData);
    toast.success("PDF exported successfully!");
  };

  const handleExportCSV = () => {
    if (!selectedEvaluation || !results || results.length === 0) {
      toast.error("No results to export");
      return;
    }

    const prompt = prompts?.find((p: any) => p.id === selectedEvaluation.promptId);
    const exportData = {
      evaluationName: selectedEvaluation.name,
      promptName: prompt?.name || "Unknown Prompt",
      createdAt: selectedEvaluation.createdAt,
      results: results.map((r: any) => {
        const provider = providers?.find((p: any) => p.id === r.providerId);
        return {
          providerName: provider?.name || "Unknown Provider",
          model: r.model || provider?.model || "Unknown Model",
          tokensUsed: r.tokensUsed,
          latencyMs: r.latencyMs,
          cost: r.cost / 100, // Convert from cents to dollars
          quality: r.quality || 0,
          output: r.output,
        };
      }),
    };

    exportEvaluationToCSV(exportData);
    toast.success("CSV exported successfully!");
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [...formData.testCases, { input: { variable: "" }, expectedOutput: "" }],
    });
  };

  const updateTestCase = (index: number, field: string, value: string) => {
    const newTestCases = [...formData.testCases];
    if (field === "input") {
      newTestCases[index].input = { variable: value };
    } else {
      newTestCases[index].expectedOutput = value;
    }
    setFormData({ ...formData, testCases: newTestCases });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
          <p className="text-muted-foreground mt-2">
            Test and compare prompt performance across different AI models
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Evaluation
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Key Differentiator</p>
              <p className="text-sm text-yellow-700 mt-1">
                Our comprehensive evaluation system is what sets PromptForge apart. Test prompts
                across multiple providers, compare costs, latency, and quality metrics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evaluations Grid */}
      {evaluations && evaluations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluations.map((evaluation: any) => (
            <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      {evaluation.name}
                    </CardTitle>
                    {evaluation.description && (
                      <CardDescription className="mt-1">{evaluation.description}</CardDescription>
                    )}
                  </div>
                  {getStatusIcon(evaluation.status)}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge
                    variant={
                      evaluation.status === "completed"
                        ? "default"
                        : evaluation.status === "running"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {evaluation.status}
                  </Badge>
                  <Badge variant="outline">{evaluation.testCases.length} test cases</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {evaluation.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => handleRun(evaluation.id)}
                      disabled={runMutation.isPending}
                      className="flex-1"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Run Evaluation
                    </Button>
                  )}
                  {evaluation.status === "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewResults(evaluation)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Results
                    </Button>
                  )}
                  {evaluation.status === "running" && (
                    <Button size="sm" disabled className="flex-1">
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Running...
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  Created: {new Date(evaluation.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No evaluations yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first evaluation to test prompt performance
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Evaluation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Evaluation</DialogTitle>
            <DialogDescription>
              Test your prompt across multiple test cases and AI providers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Support Prompt Test"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label htmlFor="prompt">Prompt *</Label>
              <Select value={formData.promptId} onValueChange={(value) => setFormData({ ...formData, promptId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a prompt" />
                </SelectTrigger>
                <SelectContent>
                  {prompts?.map((prompt: any) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Test Cases</Label>
                <Button size="sm" variant="outline" onClick={addTestCase}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Test Case
                </Button>
              </div>
              <div className="space-y-3">
                {formData.testCases.map((tc, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4 space-y-2">
                      <div>
                        <Label className="text-xs">Input</Label>
                        <Textarea
                          value={tc.input.variable}
                          onChange={(e) => updateTestCase(index, "input", e.target.value)}
                          placeholder="Test input..."
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Expected Output (optional)</Label>
                        <Textarea
                          value={tc.expectedOutput}
                          onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                          placeholder="Expected output..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Evaluation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvaluation?.name} - Results</DialogTitle>
            <DialogDescription>Evaluation results across all test cases</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {results && results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result: any, index: number) => (
                  <Card key={result.id}>
                    <CardHeader>
                      <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Output</Label>
                        <p className="text-sm mt-1">{result.output}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Tokens</Label>
                          <p className="font-medium">{result.tokensUsed}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Latency</Label>
                          <p className="font-medium">{result.latencyMs}ms</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Cost</Label>
                          <p className="font-medium">${(result.cost / 100).toFixed(4)}</p>
                        </div>
                      </div>
                      {result.quality && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Quality Score</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2"
                                style={{ width: `${result.quality}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{result.quality}%</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No results available</p>
            )}
          </div>
          <DialogFooter>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => handleExportPDF()}
                disabled={!results || results.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportCSV()}
                disabled={!results || results.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <div className="flex-1" />
              <Button onClick={() => setIsResultsOpen(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

