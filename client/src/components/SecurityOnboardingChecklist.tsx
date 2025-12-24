import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Check, 
  ChevronRight,
  X,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { useLocation } from "wouter";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
  actionUrl: string;
  priority: "high" | "medium" | "low";
}

interface SecurityOnboardingChecklistProps {
  compact?: boolean;
}

export default function SecurityOnboardingChecklist({ compact = false }: SecurityOnboardingChecklistProps) {
  const [, setLocation] = useLocation();
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  // Query
  const { data: progress, isLoading } = trpc.securityOnboarding.getProgress.useQuery();

  // Mutations
  const markCompletedMutation = trpc.securityOnboarding.markStepCompleted.useMutation({
    onSuccess: () => {
      utils.securityOnboarding.getProgress.invalidate();
    },
  });

  const dismissMutation = trpc.securityOnboarding.dismiss.useMutation({
    onSuccess: () => {
      utils.securityOnboarding.getProgress.invalidate();
      setDismissDialogOpen(false);
    },
  });

  const resetMutation = trpc.securityOnboarding.reset.useMutation({
    onSuccess: () => {
      utils.securityOnboarding.getProgress.invalidate();
    },
  });

  if (isLoading || !progress) {
    return null;
  }

  // Don't show if dismissed or completed
  if (progress.isDismissed || progress.isCompleted) {
    return null;
  }

  const handleStepClick = (step: OnboardingStep) => {
    // Navigate to the action URL
    setLocation(step.actionUrl);
    
    // Mark manual steps as completed when clicked
    if (step.id === "team_roles" || step.id === "audit_logging") {
      markCompletedMutation.mutate({ stepId: step.id });
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="text-xs">High Priority</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  // Compact version for dashboard widget
  if (compact) {
    const incompleteSteps = progress.steps.filter(s => !s.completed);
    const highPriorityIncomplete = incompleteSteps.filter(s => s.priority === "high");

    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              Security Setup
            </CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {progress.percentComplete}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress.percentComplete} className="h-2" />
          
          {highPriorityIncomplete.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                {highPriorityIncomplete.length} high priority {highPriorityIncomplete.length === 1 ? "step" : "steps"} remaining
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => {
                const nextStep = incompleteSteps[0];
                if (nextStep) handleStepClick(nextStep);
              }}
            >
              Continue Setup
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setDismissDialogOpen(true)}
            >
              Dismiss
            </Button>
          </div>
        </CardContent>

        {/* Dismiss Dialog */}
        <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dismiss Security Setup?</DialogTitle>
              <DialogDescription>
                You can always access security settings from the sidebar. 
                Are you sure you want to hide the setup checklist?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDismissDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => dismissMutation.mutate()}>
                Dismiss
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  // Full version
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Setup Checklist
            </CardTitle>
            <CardDescription className="mt-1">
              Complete these steps to secure your workspace
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {progress.completedCount}/{progress.totalCount} Complete
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDismissDialogOpen(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={progress.percentComplete} className="h-2 mt-4" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {progress.steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                step.completed 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                  : "hover:bg-muted"
              }`}
              onClick={() => !step.completed && handleStepClick(step)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" 
                    : "bg-muted"
                }`}>
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">
                      {progress.steps.indexOf(step) + 1}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${step.completed ? "line-through text-muted-foreground" : ""}`}>
                      {step.title}
                    </p>
                    {!step.completed && getPriorityBadge(step.priority)}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {!step.completed && (
                <Button size="sm" variant="ghost">
                  {step.action}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {progress.isCompleted && (
          <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
            <Sparkles className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-400">
              Security Setup Complete!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Your workspace is now configured with enterprise-grade security.
            </p>
          </div>
        )}
      </CardContent>

      {/* Dismiss Dialog */}
      <Dialog open={dismissDialogOpen} onOpenChange={setDismissDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Security Setup?</DialogTitle>
            <DialogDescription>
              You can always access security settings from the sidebar. 
              Are you sure you want to hide the setup checklist?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => dismissMutation.mutate()}>
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
