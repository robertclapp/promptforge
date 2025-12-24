import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  Zap, 
  Key,
  Activity,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function WorkspaceAnalytics() {
  const { activeTeamId } = useWorkspace();

  // Fetch workspace metrics
  const { data: metrics, isLoading: metricsLoading } = trpc.workspaceAnalytics.getMetrics.useQuery(
    undefined,
    { enabled: !!activeTeamId }
  );

  const { data: growth, isLoading: growthLoading } = trpc.workspaceAnalytics.getGrowthMetrics.useQuery(
    undefined,
    { enabled: !!activeTeamId }
  );

  if (!activeTeamId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Workspace Selected</h3>
            <p className="text-muted-foreground">
              Please select a workspace from the header to view analytics
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (metricsLoading || growthLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatGrowth = (value: number) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Workspace Analytics</h1>
        <p className="text-muted-foreground">
          Track your team's activity and growth metrics
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPrompts || 0}</div>
            {growth && formatGrowth(growth.promptsGrowth)}
            <p className="text-xs text-muted-foreground mt-1">
              +{metrics?.recentActivity.promptsCreatedThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEvaluations || 0}</div>
            {growth && formatGrowth(growth.evaluationsGrowth)}
            <p className="text-xs text-muted-foreground mt-1">
              +{metrics?.recentActivity.evaluationsRunThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalMembers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active collaborators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Usage</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.apiUsageCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.totalApiKeys || 0} active keys
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Metrics */}
      {growth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Prompts Growth
              </CardTitle>
              <CardDescription>Month-over-month comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Last Month</span>
                    <span className="font-semibold">{growth.lastMonth.prompts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-semibold">{growth.thisMonth.prompts}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Growth Rate</span>
                    {formatGrowth(growth.promptsGrowth)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Evaluations Growth
              </CardTitle>
              <CardDescription>Month-over-month comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Last Month</span>
                    <span className="font-semibold">{growth.lastMonth.evaluations}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-semibold">{growth.thisMonth.evaluations}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Growth Rate</span>
                    {formatGrowth(growth.evaluationsGrowth)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Prompts Created</span>
              </div>
              <span className="font-semibold">{metrics?.recentActivity.promptsCreatedThisWeek || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>Evaluations Run</span>
              </div>
              <span className="font-semibold">{metrics?.recentActivity.evaluationsRunThisWeek || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
