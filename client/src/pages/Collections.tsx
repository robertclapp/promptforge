/**
 * Collections Page
 * Manage prompt collections/folders
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Folder,
  FolderPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  FileText,
  ChevronRight,
  ChevronDown,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

const COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];

interface CollectionNode {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  parentId: string | null;
  isShared: boolean | null;
  children: CollectionNode[];
}

export default function Collections() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionNode | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [parentId, setParentId] = useState<string | undefined>();

  const utils = trpc.useUtils();

  const { data: collections = [], isLoading } = trpc.collections.list.useQuery();

  const { data: selectedCollection } = trpc.collections.getById.useQuery(
    { collectionId: selectedId! },
    { enabled: !!selectedId }
  );

  const createMutation = trpc.collections.create.useMutation({
    onSuccess: () => {
      setIsCreateOpen(false);
      resetForm();
      utils.collections.list.invalidate();
      toast.success("Collection created");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create collection");
    },
  });

  const updateMutation = trpc.collections.update.useMutation({
    onSuccess: () => {
      setEditingCollection(null);
      resetForm();
      utils.collections.list.invalidate();
      utils.collections.getById.invalidate();
      toast.success("Collection updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update collection");
    },
  });

  const deleteMutation = trpc.collections.delete.useMutation({
    onSuccess: () => {
      if (selectedId === editingCollection?.id) {
        setSelectedId(null);
      }
      utils.collections.list.invalidate();
      toast.success("Collection deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete collection");
    },
  });

  const removePromptMutation = trpc.collections.removePrompt.useMutation({
    onSuccess: () => {
      utils.collections.getById.invalidate();
      toast.success("Prompt removed from collection");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove prompt");
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor("#6366f1");
    setParentId(undefined);
  };

  const handleCreate = () => {
    createMutation.mutate({
      name,
      description: description || undefined,
      color,
      parentId,
    });
  };

  const handleUpdate = () => {
    if (!editingCollection) return;
    updateMutation.mutate({
      id: editingCollection.id,
      name,
      description: description || undefined,
      color,
    });
  };

  const handleDelete = (collection: CollectionNode) => {
    if (confirm(`Delete "${collection.name}"? This will not delete the prompts inside.`)) {
      deleteMutation.mutate({ collectionId: collection.id });
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openEditDialog = (collection: CollectionNode) => {
    setEditingCollection(collection);
    setName(collection.name);
    setDescription(collection.description || "");
    setColor(collection.color || "#6366f1");
  };

  const renderCollectionTree = (nodes: CollectionNode[], depth = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedIds.has(node.id);
      const isSelected = selectedId === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
            onClick={() => setSelectedId(node.id)}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-0.5 hover:bg-muted-foreground/10 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <Folder
              className="h-4 w-4 flex-shrink-0"
              style={{ color: node.color || "#6366f1" }}
            />

            <span className="flex-1 truncate text-sm font-medium">
              {node.name}
            </span>

            {node.isShared && (
              <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => openEditDialog(node)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(node)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {hasChildren && isExpanded && (
            <div>{renderCollectionTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Collection Tree */}
        <div className="w-72 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Collections</h2>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Collection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My Collection"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional description..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Color</label>
                      <div className="flex gap-2 mt-2">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full transition-transform ${
                              color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateOpen(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreate}
                        disabled={!name.trim() || createMutation.isPending}
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Loading...
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No collections yet</p>
                <p className="text-xs mt-1">Create one to organize your prompts</p>
              </div>
            ) : (
              <div className="space-y-1">
                {renderCollectionTree(collections as CollectionNode[])}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Selected Collection */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedCollection ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Folder
                  className="h-8 w-8"
                  style={{ color: selectedCollection.color || "#6366f1" }}
                />
                <div>
                  <h1 className="text-2xl font-bold">{selectedCollection.name}</h1>
                  {selectedCollection.description && (
                    <p className="text-muted-foreground">
                      {selectedCollection.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-semibold">
                  Prompts ({selectedCollection.prompts?.length || 0})
                </h2>

                {selectedCollection.prompts?.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No prompts in this collection</p>
                      <p className="text-sm mt-1">
                        Add prompts from the Prompts page
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {selectedCollection.prompts?.map((prompt: any) => (
                      <Card key={prompt.id} className="group">
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <Link href={`/prompts/${prompt.id}`}>
                              <CardTitle className="text-base hover:text-primary cursor-pointer">
                                {prompt.name}
                              </CardTitle>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100"
                              onClick={() =>
                                removePromptMutation.mutate({
                                  promptId: prompt.id,
                                  collectionId: selectedCollection.id,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {prompt.description && (
                            <CardDescription className="line-clamp-2">
                              {prompt.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a collection to view its prompts</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingCollection}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCollection(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Collection"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 mt-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCollection(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!name.trim() || updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
