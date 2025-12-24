import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  AlertTriangle, 
  Trash2, 
  Users, 
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  Settings2
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface SecurityWidgetProps {
  className?: string;
}

export function SecurityWidget({ className }: SecurityWidgetProps) {
  const { data: securitySummary, isLoading: securityLoading } = 
    trpc.securityAlerts.getSummary.useQuery();

  const { data: permissionOverrides, isLoading: overridesLoading } = 
    trpc.workspacePermissions.list.useQuery(undefined, {
      retry: false,
    });

  const isLoading = securityLoading || overridesLoading;

  // Calculate security score (simplified)
  const calculateSecurityScore = () => {
    if (!securitySummary) return 100;
    
    let score = 100;
    
    // Deduct points for recent issues
    if (securitySummary.permissionDenials24h > 0) {
      score -= Math.min(securitySummary.permissionDenials24h * 2, 20);
    }
    if (securitySummary.recentAlerts > 0) {
      score -= Math.min(securitySummary.recentAlerts * 5, 30);
    }
    if (securitySummary.deletions24h > 10) {
      score -= 10;
    }
    
    return Math.max(score, 0);
  };

  const securityScore = calculateSecurityScore();
  const scoreColor = securityScore >= 80 ? "text-green-600" : securityScore >= 50 ? "text-yellow-600" : "text-red-600";
  const scoreBg = securityScore >= 80 ? "bg-green-100 dark:bg-green-900" : securityScore >= 50 ? "bg-yellow-100 dark:bg-yellow-900" : "bg-red-100 dark:bg-red-900";

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Security Overview</CardTitle>
          </div>
          <Link href="/audit-logs">
            <Button variant="ghost" size="sm" className="text-xs">
              View Logs
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <CardDescription>Workspace security status and recent activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Score */}
        <div className={`rounded-lg p-4 ${scoreBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Security Score</p>
              <p className={`text-3xl font-bold ${scoreColor}`}>{securityScore}</p>
            </div>
            <div className="text-right">
              {securityScore >= 80 ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Good</span>
                </div>
              ) : securityScore >= 50 ? (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">Attention</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Critical</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Permission Denials */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Access Denied</span>
            </div>
            <p className="text-xl font-semibold">
              {securitySummary?.permissionDenials24h || 0}
            </p>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </div>

          {/* Deletions */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Deletions</span>
            </div>
            <p className="text-xl font-semibold">
              {securitySummary?.deletions24h || 0}
            </p>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </div>

          {/* Role Changes */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Role Changes</span>
            </div>
            <p className="text-xl font-semibold">
              {securitySummary?.roleChanges7d || 0}
            </p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>

          {/* Security Alerts */}
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Alerts</span>
            </div>
            <p className="text-xl font-semibold">
              {securitySummary?.recentAlerts || 0}
            </p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
        </div>

        {/* Permission Overrides Status */}
        {permissionOverrides && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Custom Permissions</span>
              </div>
              {permissionOverrides.length > 0 ? (
                <Badge variant="outline" className="text-xs">
                  {permissionOverrides.length} overrides
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Using defaults
                </Badge>
              )}
            </div>
            {permissionOverrides.length > 0 && (
              <Link href="/workspace-permissions">
                <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">
                  Manage permissions
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Last Alert */}
        {securitySummary?.lastAlertTime && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Last alert: {formatDistanceToNow(new Date(securitySummary.lastAlertTime), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Link href="/audit-logs" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Audit Logs
            </Button>
          </Link>
          <Link href="/workspace-permissions" className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <Settings2 className="h-3 w-3 mr-1" />
              Permissions
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default SecurityWidget;
