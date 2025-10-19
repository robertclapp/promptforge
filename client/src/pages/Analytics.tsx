import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Activity, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Analytics() {
  const { data: stats, isLoading } = trpc.analytics.dashboard.useQuery({ days: 30 });
  const { data: events } = trpc.analytics.events.useQuery({ days: 30 });

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

  const eventTypes = events?.reduce(
    (acc: Record<string, number>, event: any) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    },
    {}
  );

  const eventTypesList = eventTypes
    ? Object.entries(eventTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => (b.count as number) - (a.count as number))
    : [];

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
            <div className="text-3xl font-bold">{events?.length || 0}</div>
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
              {eventTypesList.map(({ type, count }) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-48 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2"
                        style={{
                          width: `${((count as number) / (events?.length || 1)) * 100}%`,
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
          {events && events.length > 0 ? (
            <div className="space-y-3">
              {events.slice(0, 10).map((event: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div>
                      <p className="text-sm font-medium">
                        {event.eventType.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      {event.eventData && (
                        <p className="text-xs text-muted-foreground">
                          {JSON.stringify(event.eventData).slice(0, 50)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(event.createdAt).toLocaleDateString()}
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

