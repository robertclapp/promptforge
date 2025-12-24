import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  LogOut,
  MapPin,
  Clock,
  Shield,
  Loader2,
  Globe,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function SessionManagement() {
  const utils = trpc.useUtils();
  
  // Queries
  const { data: sessionsData, isLoading } = trpc.sessions.list.useQuery();
  const { data: statsData } = trpc.sessions.stats.useQuery();

  // Mutations
  const revokeMutation = trpc.sessions.revoke.useMutation({
    onSuccess: () => {
      utils.sessions.list.invalidate();
      utils.sessions.stats.invalidate();
      toast.success("Session revoked successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeAllOtherMutation = trpc.sessions.revokeAllOther.useMutation({
    onSuccess: (data) => {
      utils.sessions.list.invalidate();
      utils.sessions.stats.invalidate();
      toast.success(`Revoked ${data.revokedCount} other sessions`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeAllMutation = trpc.sessions.revokeAll.useMutation({
    onSuccess: () => {
      utils.sessions.list.invalidate();
      utils.sessions.stats.invalidate();
      toast.success("All sessions revoked. You will be logged out.");
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const currentSession = sessionsData?.sessions.find(s => s.isCurrent);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Session Management
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage your active login sessions across devices
            </p>
          </div>
          <div className="flex gap-2">
            {currentSession && sessionsData && sessionsData.sessions.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out Other Devices
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out other devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will end all sessions except your current one. You'll remain logged in on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => revokeAllOtherMutation.mutate({ currentSessionId: currentSession.id })}
                    >
                      Sign Out Others
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Sign Out Everywhere
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out everywhere?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will end ALL sessions including your current one. You will be logged out immediately.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => revokeAllMutation.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sign Out Everywhere
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats */}
        {statsData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{statsData.totalActiveSessions}</p>
                    <p className="text-sm text-muted-foreground">Active Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                    <Globe className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{Object.keys(statsData.locations || {}).length}</p>
                    <p className="text-sm text-muted-foreground">Locations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsData.mostRecentActivity 
                        ? formatDistanceToNow(new Date(statsData.mostRecentActivity), { addSuffix: true })
                        : "N/A"
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Last Activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Devices where you're currently logged in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
              <div className="space-y-4">
                {sessionsData.sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      session.isCurrent ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        session.isCurrent ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {getDeviceIcon(session.deviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.deviceName || "Unknown Device"}</p>
                          {session.isCurrent && (
                            <Badge variant="default" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.city && session.country 
                              ? `${session.city}, ${session.country}`
                              : session.ipAddress || "Unknown location"
                            }
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.lastActivityAt 
                              ? formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })
                              : "Unknown"
                            }
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {session.browser} on {session.os}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={revokeMutation.isPending}
                          >
                            {revokeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>End this session?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will sign out the device "{session.deviceName || "Unknown Device"}". 
                              The user will need to log in again to access their account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeMutation.mutate({ sessionId: session.id })}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              End Session
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active sessions found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Session Management</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Session Duration:</strong> Sessions automatically expire after 30 days of inactivity 
              or 24 hours without any activity.
            </p>
            <p>
              <strong>Security Tip:</strong> If you see any unfamiliar devices or locations, 
              revoke those sessions immediately and consider changing your password.
            </p>
            <p>
              <strong>Current Session:</strong> Your current session is highlighted and cannot be revoked 
              from this page. Use "Sign Out Everywhere" to end all sessions including this one.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
