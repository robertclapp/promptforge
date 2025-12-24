import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Loader2, Plus, Play, Trash2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function RegressionTestingPage() {
  const utils = trpc.useUtils();

  // State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);

  // Queries
  const { data: testSuites, isLoading: isLoadingSuites } = trpc.testSuites.list.useQuery();
  const { data: prompts } = trpc.prompts.list.useQuery({});
  const { data: providers } = trpc.aiProviders.list.useQuery({});
  const { data: testRuns, isLoading: isLoadingRuns } = trpc.testSuites.listRuns.useQuery();

  // Mutations
  const createSuite = trpc.testSuites.create.useMutation({
    onSuccess: () => {
      toast.success("Test suite created successfully");
      setIsCreateDialogOpen(false);
      utils.testSuites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to create test suite: " + error.message);
    },
  });

  const runSuite = trpc.testSuites.run.useMutation({
    onSuccess: () => {
      toast.success("Test suite started");
      utils.testSuites.listRuns.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to run test suite: " + error.message);
    },
  });

  const deleteSuite = trpc.testSuites.delete.useMutation({
    onSuccess: () => {
      toast.success("Test suite deleted");
      utils.testSuites.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete test suite: " + error.message);
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    promptId: "",
    name: "",
    description: "",
    qualityThreshold: "80",
    testCases: [{ input: "{}", expectedOutput: "", minQuality: "" }],
  });

  const handleCreateSuite = () => {
    if (!formData.promptId || !formData.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const testCases = formData.testCases.map((tc) => ({
        input: JSON.parse(tc.input),
        expectedOutput: tc.expectedOutput || undefined,
        minQuality: tc.minQuality ? parseFloat(tc.minQuality) : undefined,
      }));

      createSuite.mutate({
        promptId: formData.promptId,
        name: formData.name,
        description: formData.description || undefined,
        qualityThreshold: parseFloat(formData.qualityThreshold),
        testCases,
      });
    } catch (error) {
      toast.error("Invalid test case input. Please check your JSON format");
    }
  };

  const handleRunSuite = (suiteId: string, providerId?: string) => {
    runSuite.mutate({ suiteId, providerId });
  };

  const handleDeleteSuite = (suiteId: string) => {
    if (confirm("Are you sure you want to delete this test suite?")) {
      deleteSuite.mutate({ id: suiteId });
    }
  };

  const addTestCase = () => {
    setFormData({
      ...formData,
      testCases: [...formData.testCases, { input: "{}", expectedOutput: "", minQuality: "" }],
    });
  };

  const removeTestCase = (index: number) => {
    setFormData({
      ...formData,
      testCases: formData.testCases.filter((_, i) => i !== index),
    });
  };

  const updateTestCase = (index: number, field: string, value: string) => {
    const newTestCases = [...formData.testCases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData({ ...formData, testCases: newTestCases });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      passed: "default",
      failed: "destructive",
      running: "secondary",
      error: "destructive",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (isLoadingSuites) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regression Testing</h1>
          <p className="text-muted-foreground mt-1">
            Automate quality assurance and prevent prompt degradation
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Test Suite
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Test Suite</DialogTitle>
              <DialogDescription>
                Define test cases and quality thresholds for automated regression testing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promptId">Prompt Template *</Label>
                <Select value={formData.promptId} onValueChange={(value) => setFormData({ ...formData, promptId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts?.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Suite Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Quality Tests"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this test suite validates..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualityThreshold">Quality Threshold (%)</Label>
                <Input
                  id="qualityThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.qualityThreshold}
                  onChange={(e) => setFormData({ ...formData, qualityThreshold: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Test suite fails if average quality drops below this threshold
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Test Cases</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Test Case
                  </Button>
                </div>
                {formData.testCases.map((testCase, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Test Case {index + 1}</Label>
                        {formData.testCases.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestCase(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Input Variables (JSON) *</Label>
                        <Textarea
                          value={testCase.input}
                          onChange={(e) => updateTestCase(index, "input", e.target.value)}
                          placeholder='{"customer_name": "John", "issue": "billing"}'
                          rows={3}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Output (optional)</Label>
                        <Textarea
                          value={testCase.expectedOutput}
                          onChange={(e) => updateTestCase(index, "expectedOutput", e.target.value)}
                          placeholder="Expected response content..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Quality Score (optional)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={testCase.minQuality}
                          onChange={(e) => updateTestCase(index, "minQuality", e.target.value)}
                          placeholder="80"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSuite} disabled={createSuite.isPending}>
                {createSuite.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Suite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Test Suites */}
      <div className="grid gap-6 md:grid-cols-2">
        {testSuites?.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No test suites yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first test suite to start automated regression testing
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Test Suite
              </Button>
            </CardContent>
          </Card>
        ) : (
          testSuites?.map((suite) => (
            <Card key={suite.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{suite.name}</CardTitle>
                    {suite.description && (
                      <CardDescription className="mt-1">{suite.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSuite(suite.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Test Cases</p>
                    <p className="font-semibold">{suite.testCases.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quality Threshold</p>
                    <p className="font-semibold">{suite.qualityThreshold}%</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) => handleRunSuite(suite.id, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select provider to run" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers?.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleRunSuite(suite.id)}
                    disabled={runSuite.isPending}
                  >
                    {runSuite.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recent Test Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Runs</CardTitle>
          <CardDescription>View results from automated regression tests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRuns ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : testRuns?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No test runs yet. Run a test suite to see results here.
            </div>
          ) : (
            <div className="space-y-4">
              {testRuns?.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(run.status)}
                    <div>
                      <p className="font-semibold">
                        {testSuites?.find((s) => s.id === run.suiteId)?.name || "Unknown Suite"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {run.createdAt ? new Date(run.createdAt).toLocaleString() : 'N/A'}
                        {run.gitBranch && ` • ${run.gitBranch}`}
                        {run.gitCommit && ` • ${run.gitCommit.substring(0, 7)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {run.status !== "running" && (
                      <div className="text-right text-sm">
                        <p className="font-semibold">
                          {run.passedTests}/{run.passedTests + run.failedTests} passed
                        </p>
                        {run.averageQuality && (
                          <p className="text-muted-foreground">
                            Quality: {run.averageQuality.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    )}
                    {getStatusBadge(run.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CI/CD Integration */}
      <Card>
        <CardHeader>
          <CardTitle>CI/CD Integration</CardTitle>
          <CardDescription>
            Integrate regression testing into your deployment pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Webhook Endpoint</h4>
            <code className="text-sm bg-background px-2 py-1 rounded">
              POST /api/trpc/testSuites.ciWebhook
            </code>
            <p className="text-sm text-muted-foreground mt-2">
              Call this endpoint from your CI/CD pipeline to run tests automatically on each deployment.
              The endpoint will block until tests complete and return pass/fail status.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Example: GitHub Actions</h4>
            <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`- name: Run Regression Tests
  run: |
    curl -X POST https://your-app.com/api/trpc/testSuites.ciWebhook \\
      -H "Content-Type: application/json" \\
      -d '{
        "suiteId": "suite-id-here",
        "gitCommit": "\${{ github.sha }}",
        "gitBranch": "\${{ github.ref_name }}"
      }'`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
