import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Zap,
  Star,
  Download,
  DollarSign,
  TestTube2,
  Sparkles,
  Activity,
} from "lucide-react";

const iconMap: Record<string, any> = {
  prompt: FileText,
  evaluation: Zap,
  template: Star,
  budget: DollarSign,
  test_suite: TestTube2,
  optimization: Sparkles,
};

const actionColorMap: Record<string, string> = {
  created_prompt: "text-blue-500",
  updated_prompt: "text-yellow-500",
  deleted_prompt: "text-red-500",
  ran_evaluation: "text-purple-500",
  published_template: "text-green-500",
  used_template: "text-cyan-500",
  rated_template: "text-yellow-500",
  created_budget: "text-orange-500",
  created_test_suite: "text-indigo-500",
  ran_test_suite: "text-violet-500",
  optimized_prompt: "text-pink-500",
};

export function ActivityFeed() {
  const { data: activities, isLoading } = trpc.activityFeed.getMyActivity.useQuery({ limit: 10 });

  const formatAction = (action: string): string => {
    const actionMap: Record<string, string> = {
      created_prompt: "created a prompt",
      updated_prompt: "updated a prompt",
      deleted_prompt: "deleted a prompt",
      ran_evaluation: "ran an evaluation",
      published_template: "published a template",
      used_template: "used a template",
      rated_template: "rated a template",
      created_budget: "created a budget",
      created_test_suite: "created a test suite",
      ran_test_suite: "ran a test suite",
      optimized_prompt: "optimized a prompt",
    };
    return actionMap[action] || action;
  };

  const formatTimestamp = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = iconMap[activity.resourceType] || FileText;
              const colorClass = actionColorMap[activity.action] || "text-muted-foreground";

              return (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">You</span>{" "}
                      <span className="text-muted-foreground">{formatAction(activity.action)}</span>
                      {activity.resourceName && (
                        <span className="font-medium"> "{activity.resourceName}"</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">Your actions will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
