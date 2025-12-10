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
import { Plus, Settings, Trash2, Key, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const PROVIDER_INFO = {
  openai: {
    name: "OpenAI",
    description: "GPT-4, GPT-3.5, and other OpenAI models",
    icon: "🤖",
    color: "bg-green-50 text-green-700",
    models: [
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3 and Claude 2 models",
    icon: "🧠",
    color: "bg-orange-50 text-orange-700",
    models: [
      { value: "claude-3-opus", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku", label: "Claude 3 Haiku" },
      { value: "claude-2.1", label: "Claude 2.1" },
    ],
  },
  google: {
    name: "Google",
    description: "Gemini and PaLM models",
    icon: "🔍",
    color: "bg-blue-50 text-blue-700",
    models: [
      { value: "gemini-pro", label: "Gemini Pro" },
      { value: "gemini-pro-vision", label: "Gemini Pro Vision" },
    ],
  },
  mistral: {
    name: "Mistral AI",
    description: "Mistral and Mixtral models",
    icon: "⚡",
    color: "bg-purple-50 text-purple-700",
    models: [
      { value: "mistral-large", label: "Mistral Large" },
      { value: "mistral-medium", label: "Mistral Medium" },
      { value: "mistral-small", label: "Mistral Small" },
    ],
  },
  custom: {
    name: "Custom",
    description: "Custom API endpoint",
    icon: "🔧",
    color: "bg-gray-50 text-gray-700",
    models: [
      { value: "custom-model", label: "Custom Model" },
    ],
  },
};

export default function AIProviders() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    provider: "openai" as keyof typeof PROVIDER_INFO,
    name: "",
    model: "gpt-4-turbo",
    apiKey: "",
    baseUrl: "",
  });

  const utils = trpc.useUtils();
  const { data: providers, isLoading } = trpc.aiProviders.list.useQuery({});

  const createMutation = trpc.aiProviders.create.useMutation({
    onSuccess: () => {
      toast.success("AI Provider added successfully!");
      setIsCreateOpen(false);
      setFormData({
        provider: "openai",
        name: "",
        model: "gpt-4-turbo",
        apiKey: "",
        baseUrl: "",
      });
      utils.aiProviders.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add provider");
    },
  });

  const deleteMutation = trpc.aiProviders.delete.useMutation({
    onSuccess: () => {
      toast.success("Provider deleted successfully!");
      utils.aiProviders.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete provider");
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.apiKey) {
      toast.error("Name and API key are required");
      return;
    }

    if (formData.provider === "custom" && !formData.baseUrl) {
      toast.error("Base URL is required for custom providers");
      return;
    }

    createMutation.mutate({
      provider: formData.provider,
      name: formData.name,
      model: formData.model,
      apiKey: formData.apiKey,
      baseUrl: formData.baseUrl || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this provider?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-3xl font-bold tracking-tight">AI Providers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI provider API keys and configurations
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Secure API Key Storage</p>
              <p className="text-sm text-blue-700 mt-1">
                All API keys are encrypted and stored securely. They are never exposed in the
                frontend or logs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Providers Grid */}
      {providers && providers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider: any) => {
            const info = PROVIDER_INFO[provider.provider as keyof typeof PROVIDER_INFO];
            return (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${info.color}`}>
                        {info.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{provider.name}</CardTitle>
                        <CardDescription>{info.name}</CardDescription>
                      </div>
                    </div>
                    {provider.isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">API Key: ••••••••</span>
                    </div>
                    {provider.baseUrl && (
                      <div className="text-sm text-muted-foreground truncate">
                        {provider.baseUrl}
                      </div>
                    )}
                    {provider.lastUsedAt && (
                      <div className="text-xs text-muted-foreground">
                        Last used: {new Date(provider.lastUsedAt).toLocaleDateString()}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(provider.id)}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No AI providers configured</p>
            <p className="text-muted-foreground mb-4">
              Add your first AI provider to start using prompts
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add AI Provider</DialogTitle>
            <DialogDescription>
              Connect a new AI provider by providing your API key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={formData.provider}
                onValueChange={(value: any) => {
                  const provider = value as keyof typeof PROVIDER_INFO;
                  setFormData({ 
                    ...formData, 
                    provider,
                    model: PROVIDER_INFO[provider].models[0].value
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
              <Label htmlFor="name">Display Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My OpenAI Account"
              />
            </div>
            <div>
              <Label htmlFor="model">Model *</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData({ ...formData, model: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_INFO[formData.provider].models.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select the specific model to use with this provider
              </p>
            </div>
            <div>
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your API key is encrypted and stored securely
              </p>
            </div>
            {formData.provider === "custom" && (
              <div>
                <Label htmlFor="baseUrl">Base URL *</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

