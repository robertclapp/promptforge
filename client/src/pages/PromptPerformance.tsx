/**
 * Prompt Performance Dashboard
 * Analytics for response times, token usage, and cost comparisons
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, Clock, Zap, DollarSign, TrendingUp, TrendingDown,
  Activity, Cpu, ArrowRight, CheckCircle2, XCircle, RefreshCw
} from "lucide-react";

export default function PromptPerformance() {
  const [, navigate] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

  // Get workspace ID from active team
  const { activeTeamId } = useWorkspace();
  const workspaceId = activeTeamId || "";

  // Fetch workspace summary
  const { data: summary, isLoading: summaryLoading } = trpc.promptPerformance.getWorkspaceSummary.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  // Fetch token usage trends
  const { data: trends, isLoading: trendsLoading } = trpc.promptPerformance.getTokenUsageTrends.useQuery(
    { workspaceId, days: parseInt(selectedPeriod) },
    { enabled: !!workspaceId }
  );

  // Fetch prompt-specific metrics if selected
  const { data: promptMetrics, isLoading: promptMetricsLoading } = trpc.promptPerformance.getPromptMetrics.useQuery(
    { workspaceId, promptId: selectedPrompt || "" },
    { enabled: !!workspaceId && !!selectedPrompt }
  );

  // Get prompts list for selection
  const { data: prompts } = trpc.prompts.list.useQuery({ limit: 100 });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatMs = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Performance Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor response times, token usage, and costs across your prompts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatNumber(summary?.totalRuns || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {summary?.totalPrompts || 0} prompts
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatMs(summary?.avgResponseTime || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Average latency
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatNumber(summary?.totalTokensUsed || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Total consumption
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCost(summary?.totalCost || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    API spending
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="prompts">By Prompt</TabsTrigger>
            <TabsTrigger value="providers">By Provider</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Performing Prompts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performing Prompts</CardTitle>
                  <CardDescription>Ranked by success rate</CardDescription>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : summary?.topPerformingPrompts?.length ? (
                    <div className="space-y-3">
                      {summary.topPerformingPrompts.map((prompt, index) => (
                        <div
                          key={prompt.promptId}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => setSelectedPrompt(prompt.promptId)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{prompt.promptName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatMs(prompt.avgResponseTime)} avg
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={prompt.successRate >= 80 ? "default" : "secondary"}>
                              {prompt.successRate.toFixed(0)}%
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No evaluation data yet. Run some evaluations to see performance metrics.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Provider Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Provider Comparison</CardTitle>
                  <CardDescription>Performance by AI provider</CardDescription>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : summary?.providerComparison?.length ? (
                    <div className="space-y-3">
                      {summary.providerComparison.map((provider) => (
                        <div
                          key={provider.providerId}
                          className="p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{provider.providerName}</p>
                            <Badge variant="outline">{provider.totalRuns} runs</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-muted-foreground">Avg Response</p>
                              <p className="font-medium">{formatMs(provider.avgResponseTime)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Cost/1K tokens</p>
                              <p className="font-medium">{formatCost(provider.avgCostPer1kTokens)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No provider data yet. Connect providers and run evaluations.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* By Prompt Tab */}
          <TabsContent value="prompts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Prompt Performance Details</CardTitle>
                <CardDescription>Select a prompt to view detailed metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedPrompt || ""} onValueChange={setSelectedPrompt}>
                  <SelectTrigger className="w-full md:w-[300px] mb-4">
                    <SelectValue placeholder="Select a prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts?.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPrompt && promptMetrics && (
                  <div className="space-y-6">
                    {/* Prompt Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Total Runs</p>
                        <p className="text-2xl font-bold">{promptMetrics.totalRuns}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">{promptMetrics.successRate.toFixed(1)}%</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Avg Response</p>
                        <p className="text-2xl font-bold">{formatMs(promptMetrics.avgResponseTime)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-2xl font-bold">{formatCost(promptMetrics.totalCost)}</p>
                      </div>
                    </div>

                    {/* Response Time Range */}
                    <div>
                      <p className="text-sm font-medium mb-2">Response Time Range</p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Min: {formatMs(promptMetrics.minResponseTime)}</span>
                            <span>Max: {formatMs(promptMetrics.maxResponseTime)}</span>
                          </div>
                          <Progress 
                            value={(promptMetrics.avgResponseTime / promptMetrics.maxResponseTime) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Provider Breakdown */}
                    {promptMetrics.providerBreakdown.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-3">Provider Breakdown</p>
                        <div className="space-y-2">
                          {promptMetrics.providerBreakdown.map((provider) => (
                            <div
                              key={provider.providerId}
                              className="flex items-center justify-between p-3 rounded-lg border"
                            >
                              <div>
                                <p className="font-medium text-sm">{provider.providerName}</p>
                                <p className="text-xs text-muted-foreground">{provider.model}</p>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-right">
                                  <p className="text-muted-foreground text-xs">Runs</p>
                                  <p className="font-medium">{provider.runs}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground text-xs">Avg Time</p>
                                  <p className="font-medium">{formatMs(provider.avgResponseTime)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground text-xs">Success</p>
                                  <p className="font-medium">{provider.successRate.toFixed(0)}%</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedPrompt && promptMetricsLoading && (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                )}

                {!selectedPrompt && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select a prompt above to view detailed performance metrics
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Provider Tab */}
          <TabsContent value="providers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Provider Performance Analysis</CardTitle>
                <CardDescription>Compare AI providers across all your prompts</CardDescription>
              </CardHeader>
              <CardContent>
                {summaryLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : summary?.providerComparison?.length ? (
                  <div className="space-y-4">
                    {summary.providerComparison.map((provider, index) => {
                      const isFirst = index === 0;
                      return (
                        <div
                          key={provider.providerId}
                          className={`p-4 rounded-lg border ${isFirst ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Cpu className="h-5 w-5 text-muted-foreground" />
                              <p className="font-medium">{provider.providerName}</p>
                              {isFirst && <Badge>Fastest</Badge>}
                            </div>
                            <Badge variant="outline">{provider.totalRuns} total runs</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Avg Response Time</p>
                              <p className="text-lg font-bold">{formatMs(provider.avgResponseTime)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Cost per 1K Tokens</p>
                              <p className="text-lg font-bold">{formatCost(provider.avgCostPer1kTokens)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total Runs</p>
                              <p className="text-lg font-bold">{provider.totalRuns}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Efficiency Score</p>
                              <p className="text-lg font-bold">
                                {Math.max(0, 100 - (provider.avgResponseTime / 100)).toFixed(0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No provider data available. Run evaluations with different providers to compare.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage Trends</CardTitle>
                <CardDescription>Token usage and costs over time</CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : trends?.length ? (
                  <div className="space-y-6">
                    {/* Simple bar chart representation */}
                    <div>
                      <p className="text-sm font-medium mb-3">Daily Token Usage</p>
                      <div className="flex items-end gap-1 h-32">
                        {trends.slice(-14).map((day, index) => {
                          const maxTokens = Math.max(...trends.map(t => t.tokens));
                          const height = maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
                          return (
                            <div
                              key={day.date}
                              className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors cursor-pointer"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${day.date}: ${formatNumber(day.tokens)} tokens`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{trends.slice(-14)[0]?.date}</span>
                        <span>{trends.slice(-1)[0]?.date}</span>
                      </div>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total Tokens</p>
                        <p className="text-lg font-bold">
                          {formatNumber(trends.reduce((sum, t) => sum + t.tokens, 0))}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="text-lg font-bold">
                          {formatCost(trends.reduce((sum, t) => sum + t.cost, 0))}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Total Runs</p>
                        <p className="text-lg font-bold">
                          {formatNumber(trends.reduce((sum, t) => sum + t.runs, 0))}
                        </p>
                      </div>
                    </div>

                    {/* Daily breakdown table */}
                    <div>
                      <p className="text-sm font-medium mb-3">Daily Breakdown</p>
                      <div className="max-h-64 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-background">
                            <tr className="border-b">
                              <th className="text-left py-2">Date</th>
                              <th className="text-right py-2">Runs</th>
                              <th className="text-right py-2">Tokens</th>
                              <th className="text-right py-2">Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trends.slice().reverse().map((day) => (
                              <tr key={day.date} className="border-b">
                                <td className="py-2">{day.date}</td>
                                <td className="text-right py-2">{day.runs}</td>
                                <td className="text-right py-2">{formatNumber(day.tokens)}</td>
                                <td className="text-right py-2">{formatCost(day.cost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No trend data available for the selected period.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
