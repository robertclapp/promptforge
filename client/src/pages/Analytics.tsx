import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Activity, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Analytics() {
  const { data: stats, isLoading } = trpc.analytics.getDashboard.useQuery({});
  const { data: eventBreakdown } = trpc.analytics.getEventBreakdown.useQuery({});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const eventTypesList = eventBreakdown || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your usage and activity over the past 30 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activity
            </CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Events in the last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prompts Created
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalPrompts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">New prompts this period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Evaluations Run
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalEvaluations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Tests completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Types Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
          <CardDescription>Distribution of events by type</CardDescription>
        </CardHeader>
        <CardContent>
          {eventTypesList.length > 0 ? (
            <div className="space-y-4">
              {eventTypesList.map(({ eventType, count }) => (
                <div key={eventType} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {eventType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-48 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{
                          width: `${((count as number) / (stats?.totalEvents || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No activity data available</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions</CardDescription>
        </CardHeader>
        <CardContent>
          {eventTypesList && eventTypesList.length > 0 ? (
            <div className="space-y-3">
              {eventTypesList.slice(0, 10).map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div>
                      <p className="text-sm font-medium">
                        {item.eventType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.count} occurrences
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No recent activity</p>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Usage Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              💡
            </div>
            <div>
              <p className="font-medium">Track Your Progress</p>
              <p className="text-sm text-muted-foreground mt-1">
                You've created {stats?.totalPrompts || 0} prompts and run{" "}
                {stats?.totalEvaluations || 0} evaluations. Keep testing to find the best prompts
                for your use case!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              📊
            </div>
            <div>
              <p className="font-medium">Optimize Your Workflow</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use evaluations to compare different AI providers and models. Find the best
                balance of cost, speed, and quality for your needs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

