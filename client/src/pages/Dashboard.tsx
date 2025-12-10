import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Package, Zap, Settings, Plus, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.analytics.getDashboard.useQuery({});

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Create Prompt",
      description: "Start building a new prompt template",
      icon: FileText,
      href: "/prompts/new",
      color: "text-blue-600",
    },
    {
      title: "Add Provider",
      description: "Connect a new AI provider",
      icon: Settings,
      href: "/providers/new",
      color: "text-purple-600",
    },
    {
      title: "Run Evaluation",
      description: "Test and compare prompts",
      icon: Zap,
      href: "/evaluations/new",
      color: "text-yellow-600",
    },
    {
      title: "Create Package",
      description: "Build a context package",
      icon: Package,
      href: "/context-packages/new",
      color: "text-green-600",
    },
  ];

  const statCards = [
    {
      title: "Total Prompts",
      value: stats?.totalPrompts || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Evaluations",
      value: stats?.totalEvaluations || 0,
      icon: Zap,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "AI Providers",
      value: stats?.totalProviders || 0,
      icon: Settings,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Activity",
      value: stats?.totalEvents || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of your PromptForge activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <a>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${action.color}`} />
                        <CardTitle className="text-base">{action.title}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {action.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </a>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions in the past 30 days</CardDescription>
        </CardHeader>
        <CardContent>
           {stats && (stats.totalPrompts > 0 || stats.totalEvaluations > 0) ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">Prompts Created</p>
                  <p className="text-xs text-muted-foreground">Total: {stats.totalPrompts}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium">Evaluations Run</p>
                  <p className="text-xs text-muted-foreground">Total: {stats.totalEvaluations}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">AI Providers</p>
                  <p className="text-xs text-muted-foreground">Total: {stats.totalProviders}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No recent activity</p>
              <Button asChild>
                <Link href="/prompts/new">
                  <a className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Prompt
                  </a>
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Getting Started with PromptForge</CardTitle>
          <CardDescription>Follow these steps to get the most out of the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Add an AI Provider</p>
              <p className="text-sm text-muted-foreground">
                Connect OpenAI, Anthropic, Google, or Mistral to start using prompts
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Create Your First Prompt</p>
              <p className="text-sm text-muted-foreground">
                Build reusable prompt templates with variables and version control
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Run Evaluations</p>
              <p className="text-sm text-muted-foreground">
                Compare prompt performance across different AI models and providers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

