import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, Sparkles, CheckCircle2, ArrowRight, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface OptimizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
  promptName: string;
  originalContent: string;
}

export function OptimizationDialog({
  open,
  onOpenChange,
  promptId,
  promptName,
  originalContent,
}: OptimizationDialogProps) {
  const [optimization, setOptimization] = useState<any>(null);
  const utils = trpc.useUtils();

  const optimizeMutation = trpc.optimization.optimize.useMutation({
    onSuccess: (data) => {
      setOptimization(data);
      toast.success("Optimization complete!");
    },
    onError: (error) => {
      toast.error("Failed to optimize: " + error.message);
    },
  });

  const applyMutation = trpc.optimization.applyOptimization.useMutation({
    onSuccess: () => {
      toast.success("Optimization applied! New version created.");
      utils.prompts.list.invalidate();
      onOpenChange(false);
      setOptimization(null);
    },
    onError: (error) => {
      toast.error("Failed to apply: " + error.message);
    },
  });

  const handleOptimize = () => {
    setOptimization(null);
    optimizeMutation.mutate({ promptId });
  };

  const handleApply = () => {
    if (optimization && optimization.id) {
      applyMutation.mutate({ optimizationId: optimization.id });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setOptimization(null);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      clarity: "bg-blue-100 text-blue-800",
      specificity: "bg-green-100 text-green-800",
      structure: "bg-purple-100 text-purple-800",
      context: "bg-orange-100 text-orange-800",
      constraints: "bg-pink-100 text-pink-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Prompt Optimization
          </DialogTitle>
          <DialogDescription>
            Improve "{promptName}" with AI-powered suggestions
          </DialogDescription>
        </DialogHeader>

        {!optimization && !optimizeMutation.isPending && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                  {originalContent}
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">What will be analyzed:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• <strong>Clarity:</strong> Is the instruction clear and unambiguous?</li>
                <li>• <strong>Specificity:</strong> Does it provide enough detail and constraints?</li>
                <li>• <strong>Structure:</strong> Is it well-organized with clear sections?</li>
                <li>• <strong>Context:</strong> Does it provide necessary background information?</li>
                <li>• <strong>Constraints:</strong> Are output format, length, and style requirements clear?</li>
              </ul>
            </div>

            <Button onClick={handleOptimize} className="w-full" size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze & Optimize with AI
            </Button>
          </div>
        )}

        {optimizeMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            <p className="text-lg font-medium">Analyzing your prompt...</p>
            <p className="text-sm text-muted-foreground">
              Our AI is reviewing clarity, specificity, structure, context, and constraints
            </p>
          </div>
        )}

        {optimization && (
          <div className="space-y-6">
            {/* Quality Improvement Estimate */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-700">Estimated Quality Improvement</p>
                      <p className="text-3xl font-bold text-green-900">
                        +{optimization.estimatedQualityImprovement}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explanation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Optimization Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{optimization.explanation}</p>
              </CardContent>
            </Card>

            {/* Improvements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specific Improvements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {optimization.improvements.map((improvement: any, index: number) => (
                  <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getCategoryColor(improvement.category)}>
                        {improvement.category}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      <strong>Issue:</strong> {improvement.issue}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Fix:</strong> {improvement.fix}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Before/After Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Before</CardTitle>
                  <CardDescription>Original prompt</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {originalContent}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    After
                  </CardTitle>
                  <CardDescription>Optimized prompt</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto border border-green-200">
                    {optimization.improvedPrompt}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {optimization && (
            <Button onClick={handleApply} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Apply Optimization
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
