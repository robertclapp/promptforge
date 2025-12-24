import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Key,
  Clock,
  CheckCircle,
  XCircle,
  Zap
} from "lucide-react";

export default function ApiDashboard() {
  const [days, setDays] = useState(30);
  const [rateLimitDays, setRateLimitDays] = useState(7);

  const { data: usageStats, isLoading: usageLoading } = trpc.apiAnalytics.getUsageStats.useQuery({ days });
  const { data: rateLimitStats, isLoading: rateLimitLoading } = trpc.apiAnalytics.getRateLimitStats.useQuery({ days: rateLimitDays });
  const { data: topConsumers, isLoading: consumersLoading } = trpc.apiAnalytics.getTopConsumers.useQuery({ days });
  const { data: hourlyPattern, isLoading: hourlyLoading } = trpc.apiAnalytics.getHourlyPattern.useQuery({ days: 7 });
  const { data: summary, isLoading: summaryLoading } = trpc.apiAnalytics.getSummary.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor API usage patterns, rate limits, and top consumers
          </p>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Requests</p>
                  <p className="text-3xl font-bold">{summary.todayRequests.toLocaleString()}</p>
                </div>
                <div className={`flex items-center gap-1 text-sm ${summary.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {Math.abs(summary.trend)}%
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Week's Requests</p>
                  <p className="text-3xl font-bold">{summary.weekRequests.toLocaleString()}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rate Limit Hits</p>
                  <p className="text-3xl font-bold">{summary.todayRateLimitHits}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${summary.todayRateLimitHits > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active API Keys</p>
                  <p className="text-3xl font-bold">{summary.activeApiKeys}</p>
                </div>
                <Key className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Overview</TabsTrigger>
          <TabsTrigger value="ratelimits">Rate Limits</TabsTrigger>
          <TabsTrigger value="consumers">Top Consumers</TabsTrigger>
          <TabsTrigger value="patterns">Usage Patterns</TabsTrigger>
        </TabsList>

        {/* Usage Overview Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>API Statistics</CardTitle>
                <CardDescription>Overview of API usage for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : usageStats && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Requests</span>
                      <span className="text-2xl font-bold">{usageStats.totalRequests.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Success Rate</span>
                      <div className="flex items-center gap-2">
                        <Progress value={usageStats.successRate} className="w-24" />
                        <span className="font-medium">{usageStats.successRate}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Error Count</span>
                      <Badge variant={usageStats.errorCount > 0 ? "destructive" : "secondary"}>
                        {usageStats.errorCount}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg Response Time</span>
                      <span className="font-medium">{usageStats.avgResponseTime}ms</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Breakdown Card */}
            <Card>
              <CardHeader>
                <CardTitle>Response Status Breakdown</CardTitle>
                <CardDescription>Distribution of HTTP status codes</CardDescription>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : usageStats && usageStats.statusBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {usageStats.statusBreakdown.map((status) => {
                      const percentage = Math.round((status.count / usageStats.totalRequests) * 100);
                      const isSuccess = status.statusCode >= 200 && status.statusCode < 300;
                      const isError = status.statusCode >= 400;
                      
                      return (
                        <div key={status.statusCode} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isSuccess ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : isError ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-yellow-500" />
                              )}
                              <span className="font-medium">{status.statusCode}</span>
                            </div>
                            <span className="text-muted-foreground">{status.count.toLocaleString()} ({percentage}%)</span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className={`h-2 ${isSuccess ? '[&>div]:bg-green-500' : isError ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No API usage data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Endpoint Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Top Endpoints</CardTitle>
              <CardDescription>Most frequently accessed API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : usageStats && usageStats.endpointBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {usageStats.endpointBreakdown.map((endpoint, index) => {
                    const percentage = Math.round((endpoint.count / usageStats.totalRequests) * 100);
                    return (
                      <div key={endpoint.endpoint} className="flex items-center gap-4">
                        <span className="text-muted-foreground w-6">{index + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-sm bg-muted px-2 py-1 rounded">{endpoint.endpoint}</code>
                            <span className="text-muted-foreground">{endpoint.count.toLocaleString()} ({percentage}%)</span>
                          </div>
                          <Progress value={percentage} className="h-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No endpoint data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rate Limits Tab */}
        <TabsContent value="ratelimits" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Rate Limit Analysis</h3>
            <Select value={rateLimitDays.toString()} onValueChange={(v) => setRateLimitDays(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Hits Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Rate Limit Hits
                </CardTitle>
                <CardDescription>Total rate limit violations in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {rateLimitLoading ? (
                  <Skeleton className="h-20" />
                ) : rateLimitStats && (
                  <div className="text-center py-4">
                    <p className="text-5xl font-bold">{rateLimitStats.totalHits}</p>
                    <p className="text-muted-foreground mt-2">hits in {rateLimitStats.period}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hits by Key Card */}
            <Card>
              <CardHeader>
                <CardTitle>Hits by API Key</CardTitle>
                <CardDescription>Rate limit violations per API key</CardDescription>
              </CardHeader>
              <CardContent>
                {rateLimitLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : rateLimitStats && rateLimitStats.hitsByKey.length > 0 ? (
                  <div className="space-y-4">
                    {rateLimitStats.hitsByKey.map((key) => (
                      <div key={key.apiKeyId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{key.keyName}</p>
                          <p className="text-sm text-muted-foreground">{key.keyPrefix}...</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive">{key.hitCount} hits</Badge>
                          <p className="text-xs text-muted-foreground mt-1">Limit: {key.rateLimit}/hr</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    No rate limit hits recorded
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Consumers Tab */}
        <TabsContent value="consumers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top API Consumers</CardTitle>
              <CardDescription>API keys with the highest request volume</CardDescription>
            </CardHeader>
            <CardContent>
              {consumersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : topConsumers && topConsumers.length > 0 ? (
                <div className="space-y-4">
                  {topConsumers.map((consumer, index) => (
                    <div key={consumer.apiKeyId} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{consumer.keyName}</span>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">{consumer.keyPrefix}...</code>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {consumer.requestCount.toLocaleString()} requests
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {consumer.avgResponseTime}ms avg
                          </span>
                          {consumer.lastUsedAt && (
                            <span>Last used: {new Date(consumer.lastUsedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Rate Limit</p>
                        <p className="font-medium">{consumer.rateLimit}/hr</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No API usage data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Usage Pattern</CardTitle>
              <CardDescription>API request distribution by hour of day (last 7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyLoading ? (
                <Skeleton className="h-64" />
              ) : hourlyPattern && hourlyPattern.length > 0 ? (
                <div className="space-y-2">
                  {hourlyPattern.map((hour) => {
                    const maxCount = Math.max(...hourlyPattern.map(h => h.count));
                    const percentage = maxCount > 0 ? (hour.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={hour.hour} className="flex items-center gap-2">
                        <span className="w-12 text-sm text-muted-foreground">
                          {hour.hour.toString().padStart(2, '0')}:00
                        </span>
                        <div className="flex-1">
                          <div 
                            className="h-6 bg-primary/80 rounded"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          />
                        </div>
                        <span className="w-16 text-sm text-right">{hour.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No usage pattern data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Request Trend</CardTitle>
              <CardDescription>API requests per day for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Skeleton className="h-48" />
              ) : usageStats && usageStats.dailyUsage.length > 0 ? (
                <div className="space-y-2">
                  {usageStats.dailyUsage.slice(-14).map((day) => {
                    const maxCount = Math.max(...usageStats.dailyUsage.map(d => d.count));
                    const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={day.date} className="flex items-center gap-2">
                        <span className="w-24 text-sm text-muted-foreground">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1">
                          <div 
                            className="h-6 bg-blue-500/80 rounded"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          />
                        </div>
                        <span className="w-16 text-sm text-right">{day.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No daily trend data yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
