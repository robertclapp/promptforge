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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Settings, Trash2, Key, CheckCircle2, XCircle, Edit, Cpu } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const PROVIDER_INFO = {
  openai: {
    name: "OpenAI",
    description: "GPT-4, GPT-3.5, and other OpenAI models",
    icon: "🤖",
    color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    models: [
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4", label: "GPT-4" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3.5 and Claude 3 models",
    icon: "🧠",
    color: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
      { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    ],
  },
  google: {
    name: "Google",
    description: "Gemini models",
    icon: "🔍",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    models: [
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "gemini-pro", label: "Gemini Pro" },
    ],
  },
  mistral: {
    name: "Mistral AI",
    description: "Mistral and Mixtral models",
    icon: "⚡",
    color: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
    models: [
      { value: "mistral-large-latest", label: "Mistral Large" },
      { value: "mistral-medium-latest", label: "Mistral Medium" },
      { value: "mistral-small-latest", label: "Mistral Small" },
      { value: "mixtral-8x7b-instruct", label: "Mixtral 8x7B" },
    ],
  },
  custom: {
    name: "Custom",
    description: "Custom API endpoint",
    icon: "🔧",
    color: "bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-400",
    models: [
      { value: "custom-model", label: "Custom Model" },
    ],
  },
};

interface FormData {
  provider: keyof typeof PROVIDER_INFO;
  name: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}

const initialFormData: FormData = {
  provider: "openai",
  name: "",
  model: "gpt-4-turbo",
  apiKey: "",
  baseUrl: "",
};

export default function AIProviders() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editFormData, setEditFormData] = useState<FormData & { id: string; updateApiKey: boolean }>({
    ...initialFormData,
    id: "",
    updateApiKey: false,
  });

  const utils = trpc.useUtils();
  const { data: providers, isLoading } = trpc.aiProviders.list.useQuery({});

  const createMutation = trpc.aiProviders.create.useMutation({
    onSuccess: () => {
      toast.success("AI Provider added successfully!");
      setIsCreateOpen(false);
      setFormData(initialFormData);
      utils.aiProviders.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add provider");
    },
  });

  const updateMutation = trpc.aiProviders.update.useMutation({
    onSuccess: () => {
      toast.success("Provider updated successfully!");
      setIsEditOpen(false);
      setEditFormData({ ...initialFormData, id: "", updateApiKey: false });
      utils.aiProviders.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update provider");
    },
  });

  const deleteMutation = trpc.aiProviders.delete.useMutation({
    onSuccess: () => {
      toast.success("Provider deleted successfully!");
      setDeleteProviderId(null);
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

  const handleEdit = (provider: any) => {
    setEditFormData({
      id: provider.id,
      provider: provider.provider,
      name: provider.name,
      model: provider.model || PROVIDER_INFO[provider.provider as keyof typeof PROVIDER_INFO]?.models[0]?.value || "",
      apiKey: "",
      baseUrl: provider.baseUrl || "",
      updateApiKey: false,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editFormData.name) {
      toast.error("Name is required");
      return;
    }

    if (editFormData.updateApiKey && !editFormData.apiKey) {
      toast.error("Please enter a new API key or uncheck 'Update API Key'");
      return;
    }

    updateMutation.mutate({
      id: editFormData.id,
      name: editFormData.name,
      model: editFormData.model,
      baseUrl: editFormData.baseUrl || undefined,
      ...(editFormData.updateApiKey && editFormData.apiKey ? { apiKey: editFormData.apiKey } : {}),
    });
  };

  const handleDelete = () => {
    if (deleteProviderId) {
      deleteMutation.mutate({ id: deleteProviderId });
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
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Secure API Key Storage</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                All API keys are encrypted with AES-256 and stored securely. They are never exposed in the
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
            const info = PROVIDER_INFO[provider.provider as keyof typeof PROVIDER_INFO] || PROVIDER_INFO.custom;
            const modelLabel = info.models.find(m => m.value === provider.model)?.label || provider.model;
            return (
              <Card key={provider.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${info.color}`}>
                        {info.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{provider.name}</CardTitle>
                        <CardDescription>{info.name}</CardDescription>
                      </div>
                    </div>
                    {provider.isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400 shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        {modelLabel}
                      </Badge>
                    </div>
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
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(provider)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteProviderId(provider.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
              <Label htmlFor="create-provider">Provider *</Label>
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
                <SelectTrigger id="create-provider">
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
              <Label htmlFor="create-name">Display Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My OpenAI Account"
              />
            </div>
            <div>
              <Label htmlFor="create-model">Model *</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData({ ...formData, model: value })}
              >
                <SelectTrigger id="create-model">
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
              <Label htmlFor="create-apiKey">API Key *</Label>
              <Input
                id="create-apiKey"
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
                <Label htmlFor="create-baseUrl">Base URL *</Label>
                <Input
                  id="create-baseUrl"
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update your AI provider configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider</Label>
              <div className="flex items-center gap-2 mt-1.5 p-2 bg-muted rounded-md">
                <span>{PROVIDER_INFO[editFormData.provider]?.icon}</span>
                <span>{PROVIDER_INFO[editFormData.provider]?.name}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-name">Display Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="e.g., My OpenAI Account"
              />
            </div>
            <div>
              <Label htmlFor="edit-model">Model *</Label>
              <Select
                value={editFormData.model}
                onValueChange={(value) => setEditFormData({ ...editFormData, model: value })}
              >
                <SelectTrigger id="edit-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_INFO[editFormData.provider]?.models.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editFormData.provider === "custom" && (
              <div>
                <Label htmlFor="edit-baseUrl">Base URL</Label>
                <Input
                  id="edit-baseUrl"
                  value={editFormData.baseUrl}
                  onChange={(e) => setEditFormData({ ...editFormData, baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
            )}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-updateApiKey"
                  checked={editFormData.updateApiKey}
                  onChange={(e) => setEditFormData({ ...editFormData, updateApiKey: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-updateApiKey" className="cursor-pointer">
                  Update API Key
                </Label>
              </div>
              {editFormData.updateApiKey && (
                <div>
                  <Label htmlFor="edit-apiKey">New API Key *</Label>
                  <Input
                    id="edit-apiKey"
                    type="password"
                    value={editFormData.apiKey}
                    onChange={(e) => setEditFormData({ ...editFormData, apiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProviderId} onOpenChange={(open) => !open && setDeleteProviderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this AI provider? This action cannot be undone, and any evaluations using this provider will no longer be able to run.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
