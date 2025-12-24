import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Package, Zap, Settings, Plus, TrendingUp, ChevronRight, Menu } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import OnboardingWizard from "@/components/OnboardingWizard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { SecurityWidget } from "@/components/SecurityWidget";
import SecurityOnboardingChecklist from "@/components/SecurityOnboardingChecklist";
import { GettingStartedWizard } from "@/components/GettingStartedWizard";
import { useIsMobile } from "@/hooks/useMobile";

export default function Dashboard() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: stats, isLoading } = trpc.analytics.getDashboard.useQuery({});
  const { data: providers } = trpc.aiProviders.list.useQuery({});
  const { data: prompts } = trpc.prompts.list.useQuery({ limit: 1 });
  const isMobile = useIsMobile();

  // Show onboarding if user has no providers or prompts
  useEffect(() => {
    if (providers !== undefined && prompts !== undefined) {
      const hasNoData = providers.length === 0 && prompts.length === 0;
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (hasNoData && !hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [providers, prompts]);

  const handleOnboardingClose = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div>
          <Skeleton className="h-8 w-48 md:w-64 mb-2" />
          <Skeleton className="h-4 w-64 md:w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 md:h-32" />
          ))}
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: "Create Prompt",
      description: "Start building a new prompt template",
      shortDesc: "New prompt",
      icon: FileText,
      href: "/prompts/new",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Add Provider",
      description: "Connect a new AI provider",
      shortDesc: "Add provider",
      icon: Settings,
      href: "/providers/new",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Run Evaluation",
      description: "Test and compare prompts",
      shortDesc: "Evaluate",
      icon: Zap,
      href: "/evaluations/new",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Create Package",
      description: "Build a context package",
      shortDesc: "New package",
      icon: Package,
      href: "/context-packages/new",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  const statCards = [
    {
      title: "Total Prompts",
      shortTitle: "Prompts",
      value: stats?.totalPrompts || 0,
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Evaluations",
      shortTitle: "Evals",
      value: stats?.totalEvaluations || 0,
      icon: Zap,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      title: "AI Providers",
      shortTitle: "Providers",
      value: stats?.totalProviders || 0,
      icon: Settings,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Activity",
      shortTitle: "Activity",
      value: stats?.totalEvents || 0,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header - Responsive */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          {isMobile ? "Your PromptForge overview" : "Welcome back! Here's an overview of your PromptForge activity."}
        </p>
      </div>

      {/* Stats Cards - Mobile optimized 2x2 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                  {isMobile ? stat.shortTitle : stat.title}
                </CardTitle>
                <div className={`p-1.5 md:p-2 rounded-lg ${stat.bgColor} shrink-0`}>
                  <Icon className={`w-3 h-3 md:w-4 md:h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions - Mobile optimized */}
      <div>
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Quick Actions</h2>
        {isMobile ? (
          // Mobile: Compact list view
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <a className="block">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${action.bgColor} shrink-0`}>
                          <Icon className={`w-4 h-4 ${action.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{action.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {action.shortDesc}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  </a>
                </Link>
              );
            })}
          </div>
        ) : (
          // Desktop: Grid view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <a>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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
        )}
      </div>

      {/* Security Onboarding Checklist */}
      <SecurityOnboardingChecklist compact />

      {/* Recent Activity and Security - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <ActivityFeed />
        </div>
        <div className="order-1 lg:order-2">
          <SecurityWidget />
        </div>
      </div>

      {/* Getting Started Wizard - Interactive */}
      <GettingStartedWizard />

      {/* Onboarding Wizard */}
      <OnboardingWizard open={showOnboarding} onClose={handleOnboardingClose} />
    </div>
  );
}
