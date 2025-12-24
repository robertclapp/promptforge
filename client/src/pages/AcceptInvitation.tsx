import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function AcceptInvitation() {
  const [, params] = useRoute("/accept-invitation");
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  // Get token from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  // Validate invitation
  const { data: validation, isLoading: isValidating } = trpc.invitations.validate.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  // Accept invitation mutation
  const acceptMutation = trpc.invitations.accept.useMutation({
    onSuccess: () => {
      setStatus("success");
      toast.success("Successfully joined the team!");
      setTimeout(() => {
        setLocation("/teams");
      }, 2000);
    },
    onError: (error) => {
      setStatus("error");
      setErrorMessage(error.message);
      toast.error(`Failed to accept invitation: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No invitation token provided");
      return;
    }

    if (!isValidating && validation) {
      if (!validation.valid) {
        setStatus("error");
        setErrorMessage(validation.error || "Invalid invitation");
      }
    }
  }, [token, validation, isValidating]);

  const handleAccept = () => {
    if (token) {
      acceptMutation.mutate({ token });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <XCircle className="h-6 w-6" />
              <CardTitle>Invalid Link</CardTitle>
            </div>
            <CardDescription>
              This invitation link is invalid or incomplete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidating || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <CardTitle>Validating Invitation</CardTitle>
            </div>
            <CardDescription>
              Please wait while we verify your invitation...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <XCircle className="h-6 w-6" />
              <CardTitle>Invitation Error</CardTitle>
            </div>
            <CardDescription>
              {errorMessage || "This invitation is no longer valid"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Common reasons:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside mt-2">
                <li>The invitation has expired (7 days)</li>
                <li>The invitation has already been accepted</li>
                <li>The invitation has been revoked</li>
              </ul>
            </div>
            <Button onClick={() => setLocation("/")} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Welcome to the Team!</CardTitle>
            </div>
            <CardDescription>
              You've successfully joined the team. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show invitation details and accept button
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-6 w-6 text-primary" />
            <CardTitle>Team Invitation</CardTitle>
          </div>
          <CardDescription>
            You've been invited to join a team on PromptForge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {validation?.invitation && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{validation.invitation.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {validation.invitation.role}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Expires</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(validation.invitation.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
          <Button
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
            className="w-full"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept Invitation"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            className="w-full"
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
