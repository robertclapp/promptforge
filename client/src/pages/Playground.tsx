import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Playground Page
 * Interactive environment for testing prompts across multiple AI providers
 */
export default function Playground() {
  const [prompt, setPrompt] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: "", description: "", tags: "" });

  // Fetch user's AI providers
  const { data: providers = [], isLoading: loadingProviders } = trpc.aiProviders.list.useQuery({});

  // Execute prompt mutation
  const executeMutation = trpc.playground.execute.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      setIsExecuting(false);
      toast.success(`Executed across ${data.successCount} providers`);
    },
    onError: (error) => {
      setIsExecuting(false);
      toast.error(`Execution failed: ${error.message}`);
    },
  });

  // Save as template mutation
  const saveTemplateMutation = trpc.playground.saveAsTemplate.useMutation({
    onSuccess: () => {
      toast.success("Prompt saved as template!");
      setShowSaveDialog(false);
      setSaveForm({ name: "", description: "", tags: "" });
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleProviderToggle = (providerId: string) => {
    setSelectedProviders((prev) =>
      prev.includes(providerId) ? prev.filter((id) => id !== providerId) : [...prev, providerId]
    );
  };

  const handleExecute = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (selectedProviders.length === 0) {
      toast.error("Please select at least one provider");
      return;
    }

    setIsExecuting(true);
    setResults([]);
    executeMutation.mutate({
      prompt,
      providerIds: selectedProviders,
    });
  };

  const handleSaveTemplate = () => {
    if (!saveForm.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    saveTemplateMutation.mutate({
      name: saveForm.name,
      description: saveForm.description,
      content: prompt,
      tags: saveForm.tags ? saveForm.tags.split(",").map((t) => t.trim()) : [],
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Prompt Playground
            </h1>
            <p className="text-muted-foreground mt-1">
              Test your prompts across multiple AI providers in real-time
            </p>
          </div>
          <Button
            onClick={() => setShowSaveDialog(true)}
            disabled={!prompt.trim()}
            variant="outline"
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Template
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Prompt Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prompt Editor</CardTitle>
                <CardDescription>
                  Write your prompt below. Use {"{{variable}}"} syntax for dynamic values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Editor
                    height="400px"
                    defaultLanguage="markdown"
                    value={prompt}
                    onChange={(value) => setPrompt(value || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      wordWrap: "on",
                      padding: { top: 16, bottom: 16 },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    Comparison across {results.length} providers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{result.providerName}</span>
                          <Badge variant="outline">{result.model}</Badge>
                          {result.success ? (
                            <Badge variant="default" className="bg-green-500">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{result.tokensUsed} tokens</span>
                          <span>{result.latency}ms</span>
                          <span>${result.cost.toFixed(4)}</span>
                        </div>
                      </div>
                      {result.success ? (
                        <div className="bg-muted p-3 rounded text-sm whitespace-pre-wrap">
                          {result.output}
                        </div>
                      ) : (
                        <div className="bg-destructive/10 text-destructive p-3 rounded text-sm">
                          {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel - Provider Selection & Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Providers</CardTitle>
                <CardDescription>
                  Select providers to test against
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingProviders ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : providers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No providers configured</p>
                    <Button variant="link" className="mt-2">
                      Add Provider
                    </Button>
                  </div>
                ) : (
                  providers.map((provider) => (
                    <div key={provider.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={provider.id}
                        checked={selectedProviders.includes(provider.id)}
                        onCheckedChange={() => handleProviderToggle(provider.id)}
                      />
                      <label
                        htmlFor={provider.id}
                        className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span>{provider.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {provider.model}
                          </Badge>
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Button
              onClick={handleExecute}
              disabled={isExecuting || selectedProviders.length === 0 || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Run Prompt
                </>
              )}
            </Button>

            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-semibold">
                      ${results.reduce((sum, r) => sum + r.cost, 0).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Latency:</span>
                    <span className="font-semibold">
                      {(results.reduce((sum, r) => sum + r.latency, 0) / results.length).toFixed(0)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Tokens:</span>
                    <span className="font-semibold">
                      {results.reduce((sum, r) => sum + r.tokensUsed, 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this prompt as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={saveForm.name}
                onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
                placeholder="e.g., Customer Support Response"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={saveForm.description}
                onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
                placeholder="Describe what this template does..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (optional)</Label>
              <Input
                id="tags"
                value={saveForm.tags}
                onChange={(e) => setSaveForm({ ...saveForm, tags: e.target.value })}
                placeholder="customer-support, email, response"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate tags with commas
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
              {saveTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
