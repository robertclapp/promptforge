import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, Circle, ChevronRight, X, Sparkles, 
  FileText, Settings, Zap, Store, Users, ArrowRight,
  PartyPopper
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const stepIcons: Record<string, React.ElementType> = {
  create_prompt: FileText,
  connect_provider: Settings,
  run_evaluation: Zap,
  explore_marketplace: Store,
  setup_team: Users
};

export function GettingStartedWizard() {
  const [, navigate] = useLocation();
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  const { data: progress, isLoading } = trpc.onboarding.getProgress.useQuery();
  const dismissMutation = trpc.onboarding.dismissWizard.useMutation();
  const completeMutation = trpc.onboarding.completeStep.useMutation();
  const syncMutation = trpc.onboarding.syncProgress.useMutation();
  const utils = trpc.useUtils();

  // Sync progress on mount
  useEffect(() => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        utils.onboarding.getProgress.invalidate();
      }
    });
  }, []);

  // Show completion modal when all steps are done
  useEffect(() => {
    if (progress?.percentComplete === 100 && !progress.isWizardDismissed) {
      setShowCompletionModal(true);
    }
  }, [progress?.percentComplete, progress?.isWizardDismissed]);

  if (isLoading) {
    return null;
  }

  if (!progress || progress.isWizardDismissed || progress.percentComplete === 100) {
    return null;
  }

  const handleDismiss = () => {
    dismissMutation.mutate(undefined, {
      onSuccess: () => {
        utils.onboarding.getProgress.invalidate();
      }
    });
  };

  const handleStepClick = (actionUrl: string) => {
    navigate(actionUrl);
  };

  const completedCount = progress.steps.filter(s => s.isCompleted).length;
  const currentStep = progress.steps.find(s => !s.isCompleted);

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Getting Started</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Complete these steps to get the most out of PromptForge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedCount} of {progress.steps.length} completed</span>
            </div>
            <Progress value={progress.percentComplete} className="h-2" />
          </div>

          {/* Steps list */}
          <div className="space-y-2">
            {progress.steps.map((step, index) => {
              const Icon = stepIcons[step.id] || Circle;
              const isCurrentStep = currentStep?.id === step.id;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                    step.isCompleted 
                      ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                      : isCurrentStep
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                  }`}
                  onClick={() => !step.isCompleted && handleStepClick(step.actionUrl)}
                >
                  <div className={`flex-shrink-0 ${step.isCompleted ? "text-green-500" : isCurrentStep ? "text-primary" : "text-muted-foreground"}`}>
                    {step.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${step.isCompleted ? "line-through opacity-70" : ""}`}>
                        {step.title}
                      </span>
                      {isCurrentStep && (
                        <Badge variant="secondary" className="text-xs">
                          Next
                        </Badge>
                      )}
                    </div>
                    {!step.isCompleted && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {step.description}
                      </p>
                    )}
                  </div>
                  {!step.isCompleted && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current step action */}
          {currentStep && (
            <Button 
              className="w-full" 
              onClick={() => handleStepClick(currentStep.actionUrl)}
            >
              {currentStep.action}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <PartyPopper className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl">Congratulations!</DialogTitle>
            <DialogDescription className="text-base">
              You've completed all the getting started steps. You're now ready to build amazing prompts with PromptForge!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={() => {
              setShowCompletionModal(false);
              handleDismiss();
            }}>
              Start Building
            </Button>
            <Button variant="outline" onClick={() => setShowCompletionModal(false)}>
              Keep Wizard Open
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact version for sidebar or smaller spaces
export function GettingStartedCompact() {
  const [, navigate] = useLocation();
  const { data: progress, isLoading } = trpc.onboarding.getProgress.useQuery();
  const dismissMutation = trpc.onboarding.dismissWizard.useMutation();
  const utils = trpc.useUtils();

  if (isLoading || !progress || progress.isWizardDismissed || progress.percentComplete === 100) {
    return null;
  }

  const currentStep = progress.steps.find(s => !s.isCompleted);

  return (
    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Getting Started</span>
        </div>
        <span className="text-xs text-muted-foreground">{progress.percentComplete}%</span>
      </div>
      <Progress value={progress.percentComplete} className="h-1.5 mb-2" />
      {currentStep && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs h-8"
          onClick={() => navigate(currentStep.actionUrl)}
        >
          <ChevronRight className="h-3 w-3 mr-1" />
          {currentStep.title}
        </Button>
      )}
    </div>
  );
}
