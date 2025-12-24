import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Send, Trash2, Edit, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface CommentsSectionProps {
  promptId: string;
}

export function CommentsSection({ promptId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const utils = trpc.useUtils();
  const { data: comments, isLoading } = trpc.comments.getByPrompt.useQuery({ promptId });

  const createMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      toast.success("Comment added!");
      setNewComment("");
      utils.comments.getByPrompt.invalidate({ promptId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  const updateMutation = trpc.comments.update.useMutation({
    onSuccess: () => {
      toast.success("Comment updated!");
      setEditingId(null);
      setEditContent("");
      utils.comments.getByPrompt.invalidate({ promptId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update comment");
    },
  });

  const deleteMutation = trpc.comments.deleteComment.useMutation({
    onSuccess: () => {
      toast.success("Comment deleted!");
      utils.comments.getByPrompt.invalidate({ promptId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createMutation.mutate({ promptId, content: newComment });
  };

  const handleEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditContent(content);
  };

  const handleUpdate = (commentId: string) => {
    if (!editContent.trim()) return;
    updateMutation.mutate({ commentId, content: editContent });
  };

  const handleDelete = (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteMutation.mutate({ commentId });
    }
  };

  const formatTimestamp = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-lg font-semibold">
          Comments {comments && comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... (Use @username to mention someone)"
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!newComment.trim() || createMutation.isPending}>
            <Send className="w-4 h-4 mr-2" />
            {createMutation.isPending ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                {editingId === comment.id ? (
                  // Edit Mode
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(comment.id)}
                        disabled={!editContent.trim() || updateMutation.isPending}
                      >
                        {updateMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {comment.userName?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{comment.userName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(comment.createdAt)}
                            {comment.updatedAt && " (edited)"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(comment.id, comment.content)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
