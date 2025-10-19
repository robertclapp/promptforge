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
import { Plus, Package, Eye, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContextPackages() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: "",
    tags: "",
    isPublic: false,
  });

  const utils = trpc.useUtils();
  const { data: packages, isLoading } = trpc.contextPackages.list.useQuery({});

  const createMutation = trpc.contextPackages.create.useMutation({
    onSuccess: () => {
      toast.success("Context package created successfully!");
      setIsCreateOpen(false);
      setFormData({
        name: "",
        description: "",
        content: "",
        tags: "",
        isPublic: false,
      });
      utils.contextPackages.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create package");
    },
  });

  const deleteMutation = trpc.contextPackages.delete.useMutation({
    onSuccess: () => {
      toast.success("Package deleted successfully!");
      utils.contextPackages.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete package");
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
      isPublic: formData.isPublic,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Content copied to clipboard!");
  };

  const handleView = (pkg: any) => {
    setSelectedPackage(pkg);
    setIsViewOpen(true);
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
          <h1 className="text-3xl font-bold tracking-tight">Context Packages</h1>
          <p className="text-muted-foreground mt-2">
            Manage reusable context and knowledge bases for your prompts
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Package
        </Button>
      </div>

      {/* Packages Grid */}
      {packages && packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg: any) => (
            <Card key={pkg.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {pkg.name}
                    </CardTitle>
                    {pkg.description && (
                      <CardDescription className="mt-1">{pkg.description}</CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {pkg.isPublic && <Badge variant="outline">Public</Badge>}
                  {pkg.tags && pkg.tags.length > 0 && (
                    <Badge variant="secondary">{pkg.tags.length} tags</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleView(pkg)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(pkg.content)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(pkg.id)}
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
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No context packages yet</p>
            <p className="text-muted-foreground mb-4">
              Create your first context package to organize prompt context
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Package
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Context Package</DialogTitle>
            <DialogDescription>
              Create a reusable context package for your prompts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Product Documentation"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter context content here..."
                rows={10}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., documentation, product, help"
              />
            </div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPackage?.name}</DialogTitle>
            <DialogDescription>{selectedPackage?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Content</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{selectedPackage?.content}</pre>
              </div>
            </div>
            {selectedPackage?.tags && selectedPackage.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {selectedPackage.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCopy(selectedPackage?.content || "")}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

