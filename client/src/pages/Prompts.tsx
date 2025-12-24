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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Edit, Trash2, Copy, Eye, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizationDialog } from "@/components/OptimizationDialog";
import { CommentsSection } from "@/components/CommentsSection";

export default function Prompts() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isOptimizeOpen, setIsOptimizeOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
    tags: "",
    isTemplate: false,
    isPublic: false,
  });

  const utils = trpc.useUtils();
  const { data: prompts, isLoading } = trpc.prompts.list.useQuery({
    search: search || undefined,
    limit: 50,
  });

  const createMutation = trpc.prompts.create.useMutation({
    onSuccess: () => {
      toast.success("Prompt created successfully!");
      setIsCreateOpen(false);
      setFormData({
        name: "",
        description: "",
        content: "",
        tags: "",
        isTemplate: false,
        isPublic: false,
      });
      utils.prompts.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create prompt");
    },
  });

  const deleteMutation = trpc.prompts.delete.useMutation({
    onSuccess: () => {
      toast.success("Prompt deleted successfully!");
      utils.prompts.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete prompt");
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.content) {
      toast.error("Name and content are required");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      content: formData.content,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : undefined,
      isTemplate: formData.isTemplate,
      isPublic: formData.isPublic,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Prompt copied to clipboard!");
  };

  const handleView = (prompt: any) => {
    setSelectedPrompt(prompt);
    setIsViewOpen(true);
  };

  const handleOptimize = (prompt: any) => {
    setSelectedPrompt(prompt);
    setIsOptimizeOpen(true);
  };

  const publishMutation = trpc.marketplace.publishTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template published to marketplace!");
      setIsPublishOpen(false);
      utils.prompts.list.invalidate();
      utils.marketplace.getTemplates.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish template");
    },
  });

  const handlePublish = (prompt: any) => {
    setSelectedPrompt(prompt);
    setIsPublishOpen(true);
  };

  const confirmPublish = () => {
    if (!selectedPrompt) return;
    publishMutation.mutate({ promptId: selectedPrompt.id });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your prompt templates with version control
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Prompt
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search prompts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Prompts Grid */}
      {prompts && prompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {prompt.name}
                    </CardTitle>
                    {prompt.description && (
                      <CardDescription className="mt-1">{prompt.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {prompt.isTemplate && <Badge variant="secondary">Template</Badge>}
                  {prompt.isPublic && <Badge variant="outline">Public</Badge>}
                  <Badge variant="outline">v{prompt.version}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOptimize(prompt)}
                      variant="default"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Optimize
                    </Button>
                    {!prompt.isPublic && (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(prompt)}
                        variant="outline"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Publish
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(prompt)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(prompt.content)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(prompt.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No prompts yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first prompt template to get started
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Prompt
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>
              Create a reusable prompt template with variables and version control
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Support Response"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this prompt"
              />
            </div>
            <div>
              <Label htmlFor="content">Prompt Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your prompt template here..."
                rows={8}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., support, customer-service, email"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTemplate}
                  onChange={(e) => setFormData({ ...formData, isTemplate: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Save as template</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Make public</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Prompt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPrompt?.name}</DialogTitle>
            <DialogDescription>{selectedPrompt?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Content</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{selectedPrompt?.content}</pre>
              </div>
            </div>
            {selectedPrompt?.tags && selectedPrompt.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-2">
                  {selectedPrompt.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Version: {selectedPrompt?.version}</span>
              <span>
                Created: {selectedPrompt?.createdAt && new Date(selectedPrompt.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Comments Section */}
            {selectedPrompt && (
              <div className="border-t pt-4">
                <CommentsSection promptId={selectedPrompt.id} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCopy(selectedPrompt?.content || "")}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optimization Dialog */}
      {selectedPrompt && (
        <OptimizationDialog
          open={isOptimizeOpen}
          onOpenChange={setIsOptimizeOpen}
          promptId={selectedPrompt.id}
          promptName={selectedPrompt.name}
          originalContent={selectedPrompt.content}
        />
      )}

      {/* Publish Confirmation Dialog */}
      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to Marketplace</DialogTitle>
            <DialogDescription>
              Make this prompt available to all users in the Template Marketplace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{selectedPrompt?.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedPrompt?.description || "No description"}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>By publishing this template, you agree to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Make it publicly visible to all users</li>
                <li>Allow others to use and rate it</li>
                <li>Keep it available in the marketplace</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPublishOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPublish} disabled={publishMutation.isPending}>
              {publishMutation.isPending ? "Publishing..." : "Publish Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

