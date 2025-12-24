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
import { Plus, Key, Copy, Trash2, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function APIKeys() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ id: string; key: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rateLimit: 1000,
  });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const { data: apiKeys, isLoading } = trpc.apiKeys.list.useQuery();
  const { data: usageStats } = trpc.apiKeys.getUsageStats.useQuery({ hours: 24 });

  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewKeyData(data);
      toast.success("API key created successfully!");
      setFormData({ name: "", rateLimit: 1000 });
      utils.apiKeys.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API key");
    },
  });

  const deleteMutation = trpc.apiKeys.deleteKey.useMutation({
    onSuccess: () => {
      toast.success("API key deleted successfully!");
      utils.apiKeys.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete API key");
    },
  });

  const handleCreate = () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      rateLimit: formData.rateLimit,
    });
  };

  const handleDelete = (keyId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate({ keyId });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const closeNewKeyDialog = () => {
    setNewKeyData(null);
    setIsCreateOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48" />
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
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys for programmatic access to PromptForge
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {/* Usage Stats */}
      {usageStats && usageStats.totalRequests > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics (Last 24 Hours)</CardTitle>
            <CardDescription>API request activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{usageStats.totalRequests}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Endpoints</p>
                <p className="text-2xl font-bold">{Object.keys(usageStats.byEndpoint).length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    ((usageStats.byStatus[200] || 0) / usageStats.totalRequests) * 100
                  )}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      {apiKeys && apiKeys.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      {key.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Created {new Date(key.createdAt!).toLocaleDateString()}
                      {key.lastUsedAt && ` • Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {key.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Revoked</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={visibleKeys.has(key.id) ? key.keyPrefix.replace("...", "••••••••••••••••") : key.keyPrefix}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleKeyVisibility(key.id)}
                    >
                      {visibleKeys.has(key.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(key.keyPrefix)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Rate Limit</p>
                    <p className="font-medium">{key.rateLimit} req/hour</p>
                  </div>
                  {key.expiresAt && (
                    <div>
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-medium">{new Date(key.expiresAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(key.id, key.name)}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No API keys yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first API key to start integrating with PromptForge
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Developer Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Developer Documentation</CardTitle>
          <CardDescription>Quick start guide for API integration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Authentication</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the Authorization header:
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              Authorization: Bearer pk_live_your_api_key_here
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Example: Create Prompt (cURL)</h4>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs whitespace-pre-wrap overflow-x-auto">
{`curl -X POST https://api.promptforge.com/v1/prompts \\
  -H "Authorization: Bearer pk_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Customer Support",
    "content": "You are a helpful assistant...",
    "tags": ["support", "customer"]
  }'`}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Example: Run Evaluation (Python)</h4>
            <div className="bg-muted p-3 rounded-lg font-mono text-xs whitespace-pre-wrap overflow-x-auto">
{`import requests

api_key = "pk_live_your_api_key"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://api.promptforge.com/v1/evaluations",
    headers=headers,
    json={
        "promptId": "prompt_123",
        "providerId": "provider_456",
        "testCases": [...]
    }
)

print(response.json())`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Production Server, CI/CD Pipeline"
              />
            </div>
            <div>
              <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={formData.rateLimit}
                onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
                min={100}
                max={10000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: 1000 requests per hour
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create API Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Created Dialog */}
      <Dialog open={!!newKeyData} onOpenChange={closeNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Save this key now - you won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Copy your API key now. For security reasons, we cannot show it again.
            </AlertDescription>
          </Alert>
          <div className="space-y-3">
            <div>
              <Label>API Key</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newKeyData?.key || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(newKeyData?.key || "")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeNewKeyDialog}>I've saved my key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
