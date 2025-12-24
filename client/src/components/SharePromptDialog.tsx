/**
 * Share Prompt Dialog Component
 * Dialog for creating and managing shared links
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, Copy, Check, Link, Eye, GitFork, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SharePromptDialogProps {
  promptId: string;
  promptName: string;
  children?: React.ReactNode;
}

export function SharePromptDialog({
  promptId,
  promptName,
  children,
}: SharePromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(promptName);
  const [description, setDescription] = useState("");
  const [accessLevel, setAccessLevel] = useState<"view" | "fork">("view");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("never");
  const [copied, setCopied] = useState(false);
  const [newShareUrl, setNewShareUrl] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: myShares, isLoading: sharesLoading } =
    trpc.promptSharing.myShares.useQuery(undefined, {
      enabled: open,
    });

  const createMutation = trpc.promptSharing.create.useMutation({
    onSuccess: (result) => {
      const fullUrl = `${window.location.origin}${result.shareUrl}`;
      setNewShareUrl(fullUrl);
      toast.success("Share link created!");
      utils.promptSharing.myShares.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create share link");
    },
  });

  const deleteMutation = trpc.promptSharing.delete.useMutation({
    onSuccess: () => {
      toast.success("Share link deleted");
      utils.promptSharing.myShares.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete share link");
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      promptId,
      title,
      description: description || undefined,
      accessLevel,
      password: usePassword ? password : undefined,
      expiresInDays: expiresInDays !== "never" ? parseInt(expiresInDays) : undefined,
    });
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const existingShares = myShares?.filter(
    (s) => s.shareUrl.includes(promptId) || s.title === promptName
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Prompt</DialogTitle>
          <DialogDescription>
            Create a public link to share this prompt with others.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* New Share URL */}
          {newShareUrl && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">
                  Share link created!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input value={newShareUrl} readOnly className="text-sm" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(newShareUrl)}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Create New Share Form */}
          {!newShareUrl && (
            <>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Prompt title"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this prompt"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={accessLevel}
                  onValueChange={(v) => setAccessLevel(v as "view" | "fork")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Only
                      </div>
                    </SelectItem>
                    <SelectItem value="fork">
                      <div className="flex items-center gap-2">
                        <GitFork className="h-4 w-4" />
                        Allow Forking
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Password Protection</Label>
                  <p className="text-xs text-muted-foreground">
                    Require a password to view
                  </p>
                </div>
                <Switch checked={usePassword} onCheckedChange={setUsePassword} />
              </div>

              {usePassword && (
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              )}

              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never expires</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Link className="h-4 w-4 mr-2" />
                Create Share Link
              </Button>
            </>
          )}

          {/* Existing Shares */}
          {existingShares && existingShares.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Existing Share Links</h4>
              <div className="space-y-2">
                {existingShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {share.accessLevel === "fork" ? (
                          <GitFork className="h-3 w-3 mr-1" />
                        ) : (
                          <Eye className="h-3 w-3 mr-1" />
                        )}
                        {share.accessLevel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {share.viewCount} views
                      </span>
                      {share.expiresAt && (
                        <span className="text-xs text-muted-foreground">
                          Expires{" "}
                          {format(new Date(share.expiresAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(`${window.location.origin}${share.shareUrl}`)
                        }
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ shareId: share.id })}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
