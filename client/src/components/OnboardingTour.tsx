import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X, ChevronLeft, ChevronRight, Sparkles, Download, Upload, BarChart3, Settings, Share2, History, Shield } from "lucide-react";
import { useLocation } from "wouter";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetPath?: string;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: () => void;
}

const TOUR_STORAGE_KEY = "promptforge_onboarding_completed";
const TOUR_PROGRESS_KEY = "promptforge_onboarding_progress";

// Define the export features tour steps
export const exportTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to PromptForge Export Features!",
    description: "Let's take a quick tour of the powerful import/export capabilities. You can export your prompts, schedule automatic backups, and share them securely.",
    icon: <Sparkles className="h-6 w-6 text-yellow-500" />,
    position: "center",
  },
  {
    id: "import-export",
    title: "Import & Export",
    description: "Export your prompts to JSON files with optional compression and encryption. Import prompts from other sources with preview and conflict resolution.",
    icon: <Download className="h-6 w-6 text-blue-500" />,
    targetPath: "/import-export",
  },
  {
    id: "templates",
    title: "Export Templates",
    description: "Save your export configurations as reusable templates. Quickly apply settings for different export scenarios without reconfiguring each time.",
    icon: <Upload className="h-6 w-6 text-green-500" />,
    targetPath: "/import-export",
  },
  {
    id: "scheduling",
    title: "Scheduled Exports",
    description: "Set up automatic backups on a daily, weekly, or monthly schedule. Receive email notifications when exports complete or fail.",
    icon: <History className="h-6 w-6 text-purple-500" />,
    targetPath: "/import-export",
  },
  {
    id: "analytics",
    title: "Export Analytics",
    description: "Track your export activity with detailed charts and statistics. Monitor file sizes, frequency, and template usage over time.",
    icon: <BarChart3 className="h-6 w-6 text-orange-500" />,
    targetPath: "/export-analytics",
  },
  {
    id: "sharing",
    title: "Secure Sharing",
    description: "Generate shareable links for your exports with password protection, expiration dates, and download limits for secure collaboration.",
    icon: <Share2 className="h-6 w-6 text-cyan-500" />,
    targetPath: "/import-export",
  },
  {
    id: "management",
    title: "Export Management",
    description: "Manage export versions, configure webhooks for integrations, and review audit logs for compliance and security monitoring.",
    icon: <Shield className="h-6 w-6 text-red-500" />,
    targetPath: "/export-management",
  },
  {
    id: "settings",
    title: "Export Settings",
    description: "Configure retention policies, alert rules, and webhook integrations all in one place. Customize your export workflow to fit your needs.",
    icon: <Settings className="h-6 w-6 text-gray-500" />,
    targetPath: "/export-settings",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "You've completed the tour! You can restart it anytime from the settings menu. Now go explore and make the most of PromptForge's export features.",
    icon: <Sparkles className="h-6 w-6 text-yellow-500" />,
    position: "center",
  },
];

interface OnboardingTourProps {
  steps?: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  forceShow?: boolean;
}

export function OnboardingTour({ 
  steps = exportTourSteps, 
  onComplete, 
  onSkip,
  forceShow = false 
}: OnboardingTourProps) {
  const [, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Check if tour was already completed
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    const savedProgress = localStorage.getItem(TOUR_PROGRESS_KEY);
    
    if (completed === "true" && !forceShow) {
      setHasCompleted(true);
      setIsVisible(false);
    } else if (savedProgress) {
      setCurrentStep(parseInt(savedProgress, 10));
      setIsVisible(true);
    } else if (forceShow) {
      setIsVisible(true);
      setCurrentStep(0);
    }
  }, [forceShow]);

  // Save progress
  useEffect(() => {
    if (isVisible) {
      localStorage.setItem(TOUR_PROGRESS_KEY, currentStep.toString());
    }
  }, [currentStep, isVisible]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const nextStep = steps[currentStep + 1];
      if (nextStep.targetPath) {
        navigate(nextStep.targetPath);
      }
      if (nextStep.action) {
        nextStep.action();
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps, navigate]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = steps[currentStep - 1];
      if (prevStep.targetPath) {
        navigate(prevStep.targetPath);
      }
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, steps, navigate]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    localStorage.removeItem(TOUR_PROGRESS_KEY);
    setIsVisible(false);
    setHasCompleted(true);
    onComplete?.();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    localStorage.removeItem(TOUR_PROGRESS_KEY);
    setIsVisible(false);
    onSkip?.();
  }, [onSkip]);

  const handleRestart = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.removeItem(TOUR_PROGRESS_KEY);
    setCurrentStep(0);
    setIsVisible(true);
    setHasCompleted(false);
    const firstStep = steps[0];
    if (firstStep.targetPath) {
      navigate(firstStep.targetPath);
    }
  }, [steps, navigate]);

  // Start tour for new users
  const startTour = useCallback(() => {
    setIsVisible(true);
    setCurrentStep(0);
    const firstStep = steps[0];
    if (firstStep.targetPath) {
      navigate(firstStep.targetPath);
    }
  }, [steps, navigate]);

  if (!isVisible) {
    return null;
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" />
      
      {/* Tour Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
          <CardHeader className="relative pb-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                {step.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </p>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-2">
            <Progress value={progress} className="h-1 mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </CardContent>
          
          <CardFooter className="flex justify-between gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tour
              </Button>
              <Button onClick={handleNext} className="gap-1">
                {isLastStep ? "Finish" : "Next"}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

// Hook to control the tour
export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);

  const startTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.removeItem(TOUR_PROGRESS_KEY);
    setShowTour(true);
  }, []);

  const checkShouldShowTour = useCallback(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    return completed !== "true";
  }, []);

  return {
    showTour,
    setShowTour,
    startTour,
    checkShouldShowTour,
  };
}

// Button to restart the tour
interface RestartTourButtonProps {
  className?: string;
}

export function RestartTourButton({ className }: RestartTourButtonProps) {
  const { startTour } = useOnboardingTour();
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={startTour}
      className={className}
    >
      <Sparkles className="h-4 w-4 mr-2" />
      Restart Tour
    </Button>
  );
}

export default OnboardingTour;
