/**
 * CommentThread Component
 * Threaded comment system with replies, reactions, and @mentions
 */

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Reply,
  MoreHorizontal,
  Edit,
  Trash2,
  Send,
  Smile,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Comment {
  id: string;
  promptId: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  content: string;
  parentId: string | null;
  depth: number | null;
  mentions: string[];
  reactions: Record<string, string[]>;
  isEdited: boolean | null;
  isDeleted: boolean | null;
  createdAt: Date | null;
  replies: Comment[];
}

interface CommentThreadProps {
  promptId: string;
}

const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "🤔", "👀"];

export function CommentThread({ promptId }: CommentThreadProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const { data: comments = [], isLoading } = trpc.comments.getByPrompt.useQuery(
    { promptId },
    { enabled: !!promptId }
  );

  const createMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
      utils.comments.getByPrompt.invalidate({ promptId });
      toast.success("Comment posted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to post comment");
    },
  });

  const updateMutation = trpc.comments.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setEditContent("");
      utils.comments.getByPrompt.invalidate({ promptId });
      toast.success("Comment updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update comment");
    },
  });

  const deleteMutation = trpc.comments.deleteComment.useMutation({
    onSuccess: () => {
      utils.comments.getByPrompt.invalidate({ promptId });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete comment");
    },
  });

  const reactionMutation = trpc.comments.addReaction.useMutation({
    onSuccess: () => {
      utils.comments.getByPrompt.invalidate({ promptId });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createMutation.mutate({
      promptId,
      content: newComment.trim(),
    });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    createMutation.mutate({
      promptId,
      content: replyContent.trim(),
      parentId,
    });
  };

  const handleUpdate = (commentId: string) => {
    if (!editContent.trim()) return;
    updateMutation.mutate({
      commentId,
      content: editContent.trim(),
    });
  };

  const handleDelete = (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteMutation.mutate({ commentId });
    }
  };

  const handleReaction = (commentId: string, emoji: string) => {
    reactionMutation.mutate({ commentId, emoji });
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const isOwner = user?.id === comment.userId;
    const isEditing = editingId === comment.id;
    const isReplying = replyingTo === comment.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedThreads.has(comment.id);

    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-8 border-l-2 border-muted pl-4" : ""}`}
      >
        <div className="flex gap-3 py-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs">
              {comment.userName?.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {comment.userName || "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">
                {comment.createdAt
                  ? formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })
                  : ""}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(comment.id)}
                    disabled={updateMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEditContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                  {comment.content}
                </p>

                {/* Reactions */}
                {Object.keys(comment.reactions || {}).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(comment.reactions || {}).map(
                      ([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(comment.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                            users.includes(user?.id || "")
                              ? "bg-primary/10 border-primary"
                              : "bg-muted border-transparent hover:border-muted-foreground/20"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{users.length}</span>
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        <Smile className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <div className="flex gap-1 p-1">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(comment.id, emoji)}
                            className="p-1.5 hover:bg-muted rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setReplyingTo(comment.id);
                      setReplyContent("");
                    }}
                  >
                    <Reply className="h-3.5 w-3.5 mr-1" />
                    Reply
                  </Button>

                  {hasReplies && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleThread(comment.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5 mr-1" />
                          Hide {comment.replies.length} replies
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5 mr-1" />
                          Show {comment.replies.length} replies
                        </>
                      )}
                    </Button>
                  )}

                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditContent(comment.content);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(comment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Reply input */}
                {isReplying && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        disabled={createMutation.isPending}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Nested replies */}
        {hasReplies && isExpanded && (
          <div className="space-y-0">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading comments...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New comment input */}
      {user && (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || createMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="divide-y">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment: Comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}

export default CommentThread;
