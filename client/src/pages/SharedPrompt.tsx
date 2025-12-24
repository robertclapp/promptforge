/**
 * Shared Prompt View Page
 * Public page for viewing shared prompts
 */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Lock, Eye, GitFork, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SharedPrompt() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();

  const {
    data,
    isLoading,
    error,
    refetch,
  } = trpc.promptSharing.get.useQuery(
    { shareCode: shareCode || "", password: showPasswordInput ? password : undefined },
    { enabled: !!shareCode }
  );

  const recordViewMutation = trpc.promptSharing.recordView.useMutation();

  const forkMutation = trpc.promptSharing.fork.useMutation({
    onSuccess: (result) => {
      toast.success(`Prompt forked successfully!`);
      navigate(`/prompts/${result.forkedPromptId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to fork prompt");
    },
  });

  // Record view on mount
  useEffect(() => {
    if (shareCode && data && !data.requiresPassword) {
      recordViewMutation.mutate({ shareCode });
    }
  }, [shareCode, data?.requiresPassword]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const handleCopyContent = async () => {
    if (data?.prompt?.content) {
      await navigator.clipboard.writeText(data.prompt.content);
      setCopied(true);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFork = () => {
    if (!user) {
      toast.error("Please log in to fork this prompt");
      return;
    }
    if (shareCode) {
      forkMutation.mutate({ shareCode });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 mb-4">
              <Lock className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password required
  if (data?.requiresPassword && !showPasswordInput) {
    setShowPasswordInput(true);
  }

  if (showPasswordInput && data?.requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Password Protected</CardTitle>
            <CardDescription>
              This shared prompt requires a password to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" className="w-full">
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.share || !data?.prompt) {
    return null;
  }

  const { share, prompt } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">PromptForge</span>
            <Badge variant="outline">Shared</Badge>
          </div>
          {!user && (
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{share.title}</CardTitle>
                {share.description && (
                  <CardDescription className="mt-2">
                    {share.description}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {share.viewCount}
                </Badge>
                {share.accessLevel === "fork" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" />
                    {share.forkCount}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Variables */}
            {prompt.variables && (prompt.variables as string[]).length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Variables</h3>
                <div className="flex flex-wrap gap-2">
                  {(prompt.variables as string[]).map((v) => (
                    <Badge key={v} variant="outline">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {prompt.tags && (prompt.tags as string[]).length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(prompt.tags as string[]).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Content */}
            <div>
              <h3 className="text-sm font-medium mb-2">Prompt Content</h3>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto whitespace-pre-wrap text-sm font-mono">
                  {prompt.content}
                </pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCopyContent}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy Prompt"}
              </Button>

              {share.accessLevel === "fork" && (
                <Button
                  onClick={handleFork}
                  disabled={forkMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {forkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitFork className="h-4 w-4" />
                  )}
                  Fork to My Prompts
                </Button>
              )}

              {user && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/prompts")}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
