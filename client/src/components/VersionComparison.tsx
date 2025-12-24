/**
 * Version Comparison Component
 * Side-by-side diff view for comparing prompt versions
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, GitCompare, Plus, Minus, Clock, Zap, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VersionComparisonProps {
  promptId: string;
  initialLeftVersion?: string;
  initialRightVersion?: string;
}

export function VersionComparison({
  promptId,
  initialLeftVersion,
  initialRightVersion,
}: VersionComparisonProps) {
  const [leftVersionId, setLeftVersionId] = useState<string | undefined>(
    initialLeftVersion
  );
  const [rightVersionId, setRightVersionId] = useState<string | undefined>(
    initialRightVersion
  );

  const { data: versions, isLoading: versionsLoading } =
    trpc.versionDiff.getVersions.useQuery({ promptId });

  const { data: diff, isLoading: diffLoading } = trpc.versionDiff.compare.useQuery(
    {
      leftVersionId: leftVersionId!,
      rightVersionId: rightVersionId!,
      includeMetrics: true,
    },
    {
      enabled: !!leftVersionId && !!rightVersionId,
    }
  );

  // Auto-select versions if not set
  useMemo(() => {
    if (versions && versions.length >= 2) {
      if (!leftVersionId) {
        setLeftVersionId(versions[1]?.id); // Previous version
      }
      if (!rightVersionId) {
        setRightVersionId(versions[0]?.id); // Latest version
      }
    }
  }, [versions, leftVersionId, rightVersionId]);

  if (versionsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!versions || versions.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>At least 2 versions are needed for comparison.</p>
          <p className="text-sm mt-2">
            Make changes to your prompt to create new versions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Version Selectors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">
                Base Version
              </label>
              <Select value={leftVersionId} onValueChange={setLeftVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version} -{" "}
                      {v.createdAt
                        ? format(new Date(v.createdAt), "MMM d, yyyy")
                        : "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-6">
              <span className="text-muted-foreground">→</span>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">
                Compare To
              </label>
              <Select value={rightVersionId} onValueChange={setRightVersionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version} -{" "}
                      {v.createdAt
                        ? format(new Date(v.createdAt), "MMM d, yyyy")
                        : "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diff View */}
      {diffLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {diff && (
        <>
          {/* Change Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Plus className="h-4 w-4 text-green-500" />
                  Lines Added
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {diff.contentDiff.filter((l) => l.type === "added").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Minus className="h-4 w-4 text-red-500" />
                  Lines Removed
                </div>
                <div className="text-2xl font-bold text-red-500">
                  {diff.contentDiff.filter((l) => l.type === "removed").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Hash className="h-4 w-4" />
                  Variables Changed
                </div>
                <div className="text-2xl font-bold">
                  {diff.variablesDiff.added.length +
                    diff.variablesDiff.removed.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variables Diff */}
          {(diff.variablesDiff.added.length > 0 ||
            diff.variablesDiff.removed.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Variable Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {diff.variablesDiff.removed.map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="bg-red-500/10 text-red-500 border-red-500/20"
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                  {diff.variablesDiff.added.map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                  {diff.variablesDiff.unchanged.map((v) => (
                    <Badge key={v} variant="outline">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Diff */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Content Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-sm border rounded-lg overflow-hidden">
                {diff.contentDiff.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "px-4 py-1 border-b last:border-0",
                      line.type === "added" && "bg-green-500/10",
                      line.type === "removed" && "bg-red-500/10"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block w-6 mr-4 text-muted-foreground",
                        line.type === "added" && "text-green-500",
                        line.type === "removed" && "text-red-500"
                      )}
                    >
                      {line.type === "added"
                        ? "+"
                        : line.type === "removed"
                        ? "-"
                        : " "}
                    </span>
                    <span
                      className={cn(
                        line.type === "added" && "text-green-500",
                        line.type === "removed" && "text-red-500"
                      )}
                    >
                      {line.content || " "}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Comparison */}
          {diff.metrics && (diff.metrics.left || diff.metrics.right) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      v{diff.leftVersion.version}
                    </div>
                    {diff.metrics.left ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Avg Latency: {diff.metrics.left.avgLatency}ms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span>Avg Quality: {diff.metrics.left.avgQuality}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span>Avg Tokens: {diff.metrics.left.avgTokens}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No metrics available
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      v{diff.rightVersion.version}
                    </div>
                    {diff.metrics.right ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>Avg Latency: {diff.metrics.right.avgLatency}ms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span>Avg Quality: {diff.metrics.right.avgQuality}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span>Avg Tokens: {diff.metrics.right.avgTokens}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No metrics available
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
