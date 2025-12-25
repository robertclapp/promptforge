import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  Lock,
  FileJson,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  Eye,
} from "lucide-react";

export default function SharedExport() {
  const params = useParams<{ shareCode: string }>();
  const shareCode = params.shareCode || "";
  
  const [password, setPassword] = useState("");
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Query the shared export
  const { data, isLoading, error, refetch } = trpc.exportSharing.access.useQuery(
    { shareCode, password: passwordSubmitted ? password : undefined },
    { 
      enabled: !!shareCode,
      retry: false,
    }
  );

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSubmitted(true);
    refetch();
  };

  const handleDownload = () => {
    if (data?.exportUrl) {
      setDownloadStarted(true);
      window.open(data.exportUrl, "_blank");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password required state
  if (data?.requiresPassword && !data?.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Password Protected</CardTitle>
            <CardDescription>
              This export is password protected. Enter the password to access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              {passwordSubmitted && error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Invalid password. Please try again.
                  </AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full">
                <Lock className="h-4 w-4 mr-2" />
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Share Not Available</CardTitle>
            <CardDescription>
              {data?.error || "This share link is invalid, expired, or has reached its download limit."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact the person who shared this link with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - show export details
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <CardTitle>Shared Export</CardTitle>
          <CardDescription>
            Download the exported prompts file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileJson className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{data.fileName}</p>
                <p className="text-xs text-muted-foreground">Export file</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{data.promptCount} prompts</p>
                <p className="text-xs text-muted-foreground">Included in export</p>
              </div>
            </div>
            
            {data.exportedAt && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {new Date(data.exportedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">Export date</p>
                </div>
              </div>
            )}
          </div>

          {/* Download Button */}
          <Button 
            onClick={handleDownload} 
            className="w-full" 
            size="lg"
            disabled={downloadStarted}
          >
            {downloadStarted ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Download Started
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Export
              </>
            )}
          </Button>

          {downloadStarted && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your download should start automatically. If it doesn't, click the button again.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Powered by PromptForge
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
