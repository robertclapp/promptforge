import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Zap, Settings } from "lucide-react";
import { toast } from "sonner";

const PROVIDER_INFO = {
  openai: {
    name: "OpenAI",
    icon: "🤖",
    models: [
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
  },
  anthropic: {
    name: "Anthropic",
    icon: "🧠",
    models: [
      { value: "claude-3-opus", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku", label: "Claude 3 Haiku" },
    ],
  },
  google: {
    name: "Google",
    icon: "🔍",
    models: [
      { value: "gemini-pro", label: "Gemini Pro" },
    ],
  },
};

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Step 1: AI Provider
  const [providerData, setProviderData] = useState({
    provider: "openai" as keyof typeof PROVIDER_INFO,
    name: "",
    model: "gpt-4-turbo",
    apiKey: "",
  });

  // Step 2: First Prompt
  const [promptData, setPromptData] = useState({
    name: "",
    description: "",
    content: "",
  });

  // Step 3: Evaluation (auto-created)
  const [createdProviderId, setCreatedProviderId] = useState("");
  const [createdPromptId, setCreatedPromptId] = useState("");

  const createProviderMutation = trpc.aiProviders.create.useMutation({
    onSuccess: (data) => {
      setCreatedProviderId(data.id);
      toast.success("AI Provider added successfully!");
      setStep(2);
      utils.aiProviders.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add provider");
    },
  });

  const createPromptMutation = trpc.prompts.create.useMutation({
    onSuccess: (data) => {
      setCreatedPromptId(data.id);
      toast.success("Prompt created successfully!");
      setStep(3);
      utils.prompts.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create prompt");
    },
  });

  const createEvaluationMutation = trpc.evaluations.create.useMutation({
    onSuccess: () => {
      toast.success("Evaluation created! Check the Evaluations page to see results.");
      utils.evaluations.list.invalidate();
      utils.analytics.getDashboard.invalidate();
      onClose();
      setLocation("/evaluations");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create evaluation");
    },
  });

  const handleStep1Next = () => {
    if (!providerData.name || !providerData.apiKey) {
      toast.error("Please fill in all required fields");
      return;
    }

    createProviderMutation.mutate({
      provider: providerData.provider,
      name: providerData.name,
      model: providerData.model,
      apiKey: providerData.apiKey,
    });
  };

  const handleStep2Next = () => {
    if (!promptData.name || !promptData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    createPromptMutation.mutate({
      name: promptData.name,
      description: promptData.description || undefined,
      content: promptData.content,
      variables: [],
      tags: ["onboarding"],
    });
  };

  const handleStep3Complete = () => {
    // Create a simple evaluation with the prompt and provider
    createEvaluationMutation.mutate({
      name: `${promptData.name} - Initial Test`,
      description: "Automated evaluation created during onboarding",
      promptId: createdPromptId,
      providerIds: [createdProviderId],
      testCases: [
        {
          input: {},
          expectedOutput: undefined,
        },
      ],
    });
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Welcome to PromptForge!
          </DialogTitle>
          <DialogDescription>
            Let's get you set up in 3 quick steps
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  s < step
                    ? "bg-primary text-primary-foreground"
                    : s === step
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    s < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Add AI Provider */}
        {step === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Step 1: Add Your First AI Provider
                </CardTitle>
                <CardDescription>
                  Connect an AI provider to start testing prompts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="provider">Provider *</Label>
                  <Select
                    value={providerData.provider}
                    onValueChange={(value: any) => {
                      const provider = value as keyof typeof PROVIDER_INFO;
                      setProviderData({
                        ...providerData,
                        provider,
                        model: PROVIDER_INFO[provider].models[0].value,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{info.icon}</span>
                            <span>{info.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model">Model *</Label>
                  <Select
                    value={providerData.model}
                    onValueChange={(value) =>
                      setProviderData({ ...providerData, model: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_INFO[providerData.provider].models.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">Display Name *</Label>
                  <Input
                    id="name"
                    value={providerData.name}
                    onChange={(e) =>
                      setProviderData({ ...providerData, name: e.target.value })
                    }
                    placeholder="e.g., My OpenAI Account"
                  />
                </div>

                <div>
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={providerData.apiKey}
                    onChange={(e) =>
                      setProviderData({ ...providerData, apiKey: e.target.value })
                    }
                    placeholder="sk-..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key is encrypted and stored securely
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Create First Prompt */}
        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Step 2: Create Your First Prompt
                </CardTitle>
                <CardDescription>
                  Build a prompt template to test with your AI provider
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="promptName">Prompt Name *</Label>
                  <Input
                    id="promptName"
                    value={promptData.name}
                    onChange={(e) =>
                      setPromptData({ ...promptData, name: e.target.value })
                    }
                    placeholder="e.g., Customer Support Response"
                  />
                </div>

                <div>
                  <Label htmlFor="promptDescription">Description (Optional)</Label>
                  <Input
                    id="promptDescription"
                    value={promptData.description}
                    onChange={(e) =>
                      setPromptData({ ...promptData, description: e.target.value })
                    }
                    placeholder="Brief description of what this prompt does"
                  />
                </div>

                <div>
                  <Label htmlFor="promptContent">Prompt Content *</Label>
                  <Textarea
                    id="promptContent"
                    value={promptData.content}
                    onChange={(e) =>
                      setPromptData({ ...promptData, content: e.target.value })
                    }
                    placeholder="Write your prompt here... e.g., 'You are a helpful assistant that...'"
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This is the actual prompt that will be sent to the AI
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Run First Evaluation */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Step 3: Run Your First Evaluation
                </CardTitle>
                <CardDescription>
                  Test your prompt and see the results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="font-medium">Ready to test!</p>
                  <p className="text-sm text-muted-foreground">
                    We'll create an evaluation that runs your prompt "{promptData.name}" using{" "}
                    {PROVIDER_INFO[providerData.provider].name} ({providerData.model}).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You'll see metrics like response time, token usage, and cost.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Pro tip:</strong> After this evaluation completes, you can add more
                    AI providers and run comparisons to find the best model for your use case!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step === 1 && (
              <Button
                onClick={handleStep1Next}
                disabled={createProviderMutation.isPending}
              >
                {createProviderMutation.isPending ? "Adding..." : "Next"}
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={handleStep2Next}
                disabled={createPromptMutation.isPending}
              >
                {createPromptMutation.isPending ? "Creating..." : "Next"}
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={handleStep3Complete}
                disabled={createEvaluationMutation.isPending}
              >
                {createEvaluationMutation.isPending ? "Running..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
