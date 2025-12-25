import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  TrendingUp,
  FileDown,
  FileUp,
  HardDrive,
  Clock,
  Calendar,
  CheckCircle2,
  Activity,
  PieChart,
  LayoutTemplate,
} from "lucide-react";

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ExportAnalytics() {
  const [timeRange, setTimeRange] = useState<string>("30");

  // Fetch analytics data
  const { data: summary, isLoading: summaryLoading } = trpc.exportAnalytics.summary.useQuery({
    days: parseInt(timeRange),
  });

  const { data: frequency, isLoading: frequencyLoading } = trpc.exportAnalytics.frequency.useQuery({
    days: parseInt(timeRange),
  });

  const { data: fileSizeTrends, isLoading: sizeTrendsLoading } = trpc.exportAnalytics.fileSizeTrends.useQuery({
    days: parseInt(timeRange),
  });

  const { data: typeBreakdown, isLoading: typeLoading } = trpc.exportAnalytics.typeBreakdown.useQuery({
    days: parseInt(timeRange),
  });

  const { data: templateUsage, isLoading: templateLoading } = trpc.exportAnalytics.templateUsage.useQuery({
    limit: 10,
  });

  const { data: hourlyDistribution, isLoading: hourlyLoading } = trpc.exportAnalytics.hourlyDistribution.useQuery({
    days: parseInt(timeRange),
  });

  // Calculate max values for chart scaling
  const maxFrequency = Math.max(
    ...(frequency?.map((d) => Math.max(d.exports, d.imports)) || [1])
  );
  const maxFileSize = Math.max(...(fileSizeTrends?.map((d) => d.totalSize) || [1]));
  const maxHourly = Math.max(...(hourlyDistribution?.map((d) => d.count) || [1]));

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Export Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your export and import activity over time
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exports</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.totalExports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  In the last {timeRange} days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.totalImports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  In the last {timeRange} days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Exported</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatBytes(summary?.totalDataExported || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatBytes(summary?.averageFileSize || 0)} per export
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{summary?.successRate || 100}%</div>
                <p className="text-xs text-muted-foreground">
                  {summary?.activeSchedules || 0} active schedules
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="frequency" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="frequency" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="size" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            File Sizes
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <PieChart className="h-4 w-4" />
            Breakdown
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="hourly" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Clock className="h-4 w-4" />
            Hourly
          </TabsTrigger>
        </TabsList>

        {/* Activity Chart */}
        <TabsContent value="frequency">
          <Card>
            <CardHeader>
              <CardTitle>Export & Import Activity</CardTitle>
              <CardDescription>
                Number of exports and imports over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {frequencyLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <div className="h-64">
                  <div className="flex items-end gap-1 h-48 border-b border-l p-4">
                    {frequency?.slice(-30).map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex gap-0.5 items-end h-40">
                          <div
                            className="w-2 bg-blue-500 dark:bg-blue-400 rounded-t"
                            style={{
                              height: `${(day.exports / maxFrequency) * 100}%`,
                              minHeight: day.exports > 0 ? "4px" : "0",
                            }}
                            title={`${day.exports} exports`}
                          />
                          <div
                            className="w-2 bg-green-500 dark:bg-green-400 rounded-t"
                            style={{
                              height: `${(day.imports / maxFrequency) * 100}%`,
                              minHeight: day.imports > 0 ? "4px" : "0",
                            }}
                            title={`${day.imports} imports`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between px-4 mt-2 text-xs text-muted-foreground">
                    <span>{frequency?.[0] ? formatDate(frequency[0].date) : ""}</span>
                    <span>{frequency?.[frequency.length - 1] ? formatDate(frequency[frequency.length - 1].date) : ""}</span>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded" />
                      <span className="text-sm">Exports</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 dark:bg-green-400 rounded" />
                      <span className="text-sm">Imports</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* File Size Trends */}
        <TabsContent value="size">
          <Card>
            <CardHeader>
              <CardTitle>File Size Trends</CardTitle>
              <CardDescription>
                Total exported data size over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sizeTrendsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <div className="h-64">
                  <div className="flex items-end gap-1 h-48 border-b border-l p-4">
                    {fileSizeTrends?.slice(-30).map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-purple-500 dark:bg-purple-400 rounded-t"
                          style={{
                            height: `${(day.totalSize / maxFileSize) * 100}%`,
                            minHeight: day.totalSize > 0 ? "4px" : "0",
                          }}
                          title={`${formatBytes(day.totalSize)} (${day.count} exports)`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between px-4 mt-2 text-xs text-muted-foreground">
                    <span>{fileSizeTrends?.[0] ? formatDate(fileSizeTrends[0].date) : ""}</span>
                    <span>{fileSizeTrends?.[fileSizeTrends.length - 1] ? formatDate(fileSizeTrends[fileSizeTrends.length - 1].date) : ""}</span>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 dark:bg-purple-400 rounded" />
                      <span className="text-sm">Total Size</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Type Breakdown */}
        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Export Type Breakdown</CardTitle>
                <CardDescription>
                  Manual vs scheduled exports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {typeLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        {/* Simple pie chart visualization */}
                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke="hsl(var(--muted))"
                            strokeWidth="20"
                          />
                          {typeBreakdown && typeBreakdown.total > 0 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="hsl(var(--primary))"
                              strokeWidth="20"
                              strokeDasharray={`${(typeBreakdown.manual / typeBreakdown.total) * 251.2} 251.2`}
                            />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="text-2xl font-bold">{typeBreakdown?.total || 0}</span>
                          <span className="text-xs text-muted-foreground">Total</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-8">
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-3 h-3 bg-primary rounded" />
                          <span className="text-sm font-medium">Manual</span>
                        </div>
                        <p className="text-2xl font-bold">{typeBreakdown?.manual || 0}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-3 h-3 bg-muted rounded" />
                          <span className="text-sm font-medium">Scheduled</span>
                        </div>
                        <p className="text-2xl font-bold">{typeBreakdown?.scheduled || 0}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>
                  Summary of your export configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <span>Active Schedules</span>
                    </div>
                    <Badge variant="secondary">{summary?.activeSchedules || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                      <span>Saved Templates</span>
                    </div>
                    <Badge variant="secondary">{summary?.totalTemplates || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <HardDrive className="h-5 w-5 text-muted-foreground" />
                      <span>Avg File Size</span>
                    </div>
                    <Badge variant="secondary">{formatBytes(summary?.averageFileSize || 0)}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                      <span>Success Rate</span>
                    </div>
                    <Badge variant={summary?.successRate === 100 ? "default" : "destructive"}>
                      {summary?.successRate || 100}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Template Usage */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Most Used Templates</CardTitle>
              <CardDescription>
                Your most frequently used export templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templateLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : templateUsage && templateUsage.length > 0 ? (
                <div className="space-y-3">
                  {templateUsage.map((template, index) => (
                    <div
                      key={template.templateId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{template.templateName}</p>
                          <p className="text-xs text-muted-foreground">
                            Last used: {template.lastUsed ? new Date(template.lastUsed).toLocaleDateString() : "Never"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{template.usageCount} uses</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates used yet</p>
                  <p className="text-sm">Create templates to save your export configurations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hourly Distribution */}
        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Distribution</CardTitle>
              <CardDescription>
                When do you export most frequently?
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <div className="h-64">
                  <div className="flex items-end gap-1 h-48 border-b border-l p-4">
                    {hourlyDistribution?.map((hour) => (
                      <div key={hour.hour} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-orange-500 rounded-t"
                          style={{
                            height: `${maxHourly > 0 ? (hour.count / maxHourly) * 100 : 0}%`,
                            minHeight: hour.count > 0 ? "4px" : "0",
                          }}
                          title={`${hour.count} exports at ${hour.hour}:00`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between px-4 mt-2 text-xs text-muted-foreground">
                    <span>12 AM</span>
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>11 PM</span>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded" />
                      <span className="text-sm">Exports by Hour</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
