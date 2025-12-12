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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, FileText, Edit, Trash2, Copy, Eye, History } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface FormData {
  name: string;
  description: string;
  content: string;
  tags: string;
  isTemplate: boolean;
  isPublic: boolean;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  content: "",
  tags: "",
  isTemplate: false,
  isPublic: false,
};

export default function Prompts() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editFormData, setEditFormData] = useState<FormData & { id: string; changeMessage: string }>({
    ...initialFormData,
    id: "",
    changeMessage: "",
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
      setFormData(initialFormData);
      utils.prompts.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create prompt");
    },
  });

  const updateMutation = trpc.prompts.update.useMutation({
    onSuccess: () => {
      toast.success("Prompt updated successfully!");
      setIsEditOpen(false);
      setEditFormData({ ...initialFormData, id: "", changeMessage: "" });
      utils.prompts.list.invalidate();
      utils.analytics.getDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update prompt");
    },
  });

  const deleteMutation = trpc.prompts.delete.useMutation({
    onSuccess: () => {
      toast.success("Prompt deleted successfully!");
      setDeletePromptId(null);
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
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      isTemplate: formData.isTemplate,
      isPublic: formData.isPublic,
    });
  };

  const handleEdit = (prompt: any) => {
    setEditFormData({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description || "",
      content: prompt.content,
      tags: prompt.tags?.join(", ") || "",
      isTemplate: prompt.isTemplate,
      isPublic: prompt.isPublic,
      changeMessage: "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editFormData.name || !editFormData.content) {
      toast.error("Name and content are required");
      return;
    }

    updateMutation.mutate({
      id: editFormData.id,
      name: editFormData.name,
      description: editFormData.description || undefined,
      content: editFormData.content,
      tags: editFormData.tags ? editFormData.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
      isTemplate: editFormData.isTemplate,
      isPublic: editFormData.isPublic,
      changeMessage: editFormData.changeMessage || undefined,
    });
  };

  const handleDelete = () => {
    if (deletePromptId) {
      deleteMutation.mutate({ id: deletePromptId });
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
            <Card key={prompt.id} className="hover:shadow-md transition-shadow group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{prompt.name}</span>
                    </CardTitle>
                    {prompt.description && (
                      <CardDescription className="mt-1 line-clamp-2">{prompt.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {prompt.isTemplate && <Badge variant="secondary">Template</Badge>}
                  {prompt.isPublic && <Badge variant="outline">Public</Badge>}
                  <Badge variant="outline" className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    v{prompt.version}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
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
                    onClick={() => handleEdit(prompt)}
                  >
                    <Edit className="w-4 h-4" />
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
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletePromptId(prompt.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>
              Create a reusable prompt template with variables. Use {"{{variableName}}"} syntax for dynamic content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Customer Support Response"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this prompt"
              />
            </div>
            <div>
              <Label htmlFor="create-content">Prompt Content *</Label>
              <Textarea
                id="create-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter your prompt template here. Use {{variable}} for dynamic values..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="create-tags">Tags (comma-separated)</Label>
              <Input
                id="create-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., support, customer-service, email"
              />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-template"
                  checked={formData.isTemplate}
                  onCheckedChange={(checked) => setFormData({ ...formData, isTemplate: !!checked })}
                />
                <Label htmlFor="create-template" className="text-sm cursor-pointer">
                  Save as template
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-public"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: !!checked })}
                />
                <Label htmlFor="create-public" className="text-sm cursor-pointer">
                  Make public
                </Label>
              </div>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription>
              Update your prompt. Content changes will create a new version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="e.g., Customer Support Response"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Brief description of this prompt"
              />
            </div>
            <div>
              <Label htmlFor="edit-content">Prompt Content *</Label>
              <Textarea
                id="edit-content"
                value={editFormData.content}
                onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                placeholder="Enter your prompt template here..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editFormData.tags}
                onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
                placeholder="e.g., support, customer-service, email"
              />
            </div>
            <div>
              <Label htmlFor="edit-change-message">Change Message (optional)</Label>
              <Input
                id="edit-change-message"
                value={editFormData.changeMessage}
                onChange={(e) => setEditFormData({ ...editFormData, changeMessage: e.target.value })}
                placeholder="Describe what changed in this version"
              />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-template"
                  checked={editFormData.isTemplate}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isTemplate: !!checked })}
                />
                <Label htmlFor="edit-template" className="text-sm cursor-pointer">
                  Save as template
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-public"
                  checked={editFormData.isPublic}
                  onCheckedChange={(checked) => setEditFormData({ ...editFormData, isPublic: !!checked })}
                />
                <Label htmlFor="edit-public" className="text-sm cursor-pointer">
                  Make public
                </Label>
              </div>
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

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {selectedPrompt?.name}
            </DialogTitle>
            <DialogDescription>{selectedPrompt?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Content</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg max-h-80 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">{selectedPrompt?.content}</pre>
              </div>
            </div>
            {selectedPrompt?.tags && selectedPrompt.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPrompt.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
              <span className="flex items-center gap-1">
                <History className="w-4 h-4" />
                Version: {selectedPrompt?.version}
              </span>
              <span>
                Created: {selectedPrompt?.createdAt && new Date(selectedPrompt.createdAt).toLocaleDateString()}
              </span>
              <span>
                Updated: {selectedPrompt?.updatedAt && new Date(selectedPrompt.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => handleCopy(selectedPrompt?.content || "")} className="w-full sm:w-auto">
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsViewOpen(false);
                handleEdit(selectedPrompt);
              }}
              className="w-full sm:w-auto"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Prompt
            </Button>
            <Button onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePromptId} onOpenChange={(open) => !open && setDeletePromptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this prompt? This action cannot be undone, and all associated versions will be lost.
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
