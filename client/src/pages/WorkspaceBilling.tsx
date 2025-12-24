import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Check, Zap, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkspaceBilling() {
  const { data: subscription, isLoading: subLoading } = trpc.workspaceBilling.getSubscription.useQuery();
  const { data: usage, isLoading: usageLoading } = trpc.workspaceBilling.getUsage.useQuery();
  const { data: limits } = trpc.workspaceBilling.checkLimits.useQuery();
  const { data: plans } = trpc.workspaceBilling.getPlans.useQuery();

  const createCheckout = trpc.workspaceBilling.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error("Failed to create checkout session", {
        description: error.message,
      });
    },
  });

  if (subLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTier = subscription?.tier || "free";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Workspace Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and track usage for this workspace
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold capitalize">{currentTier}</h3>
                {currentTier === "pro" && <Zap className="h-5 w-5 text-yellow-500" />}
                {currentTier === "enterprise" && <Crown className="h-5 w-5 text-purple-500" />}
              </div>
              <p className="text-muted-foreground mt-1">
                {subscription?.status === "active" ? "Active" : "Inactive"}
              </p>
            </div>
            {currentTier !== "enterprise" && (
              <Button
                size="lg"
                onClick={() => {
                  const nextTier = currentTier === "free" ? "pro" : "enterprise";
                  createCheckout.mutate({ tier: nextTier as "pro" | "enterprise" });
                }}
                disabled={createCheckout.isPending}
              >
                {createCheckout.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upgrade Plan"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>Track your resource consumption</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prompts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Prompts Created</span>
              <span className="text-sm text-muted-foreground">
                {usage?.promptsCreated || 0} / {limits?.prompts.limit === -1 ? "∞" : limits?.prompts.limit}
              </span>
            </div>
            <Progress
              value={
                limits?.prompts.limit === -1
                  ? 0
                  : ((usage?.promptsCreated || 0) / (limits?.prompts.limit || 1)) * 100
              }
              className={limits?.prompts.exceeded ? "bg-red-200" : ""}
            />
            {limits?.prompts.exceeded && (
              <p className="text-sm text-red-600 mt-1">Limit reached. Upgrade to create more prompts.</p>
            )}
          </div>

          {/* Evaluations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Evaluations Run</span>
              <span className="text-sm text-muted-foreground">
                {usage?.evaluationsRun || 0} / {limits?.evaluations.limit === -1 ? "∞" : limits?.evaluations.limit}
              </span>
            </div>
            <Progress
              value={
                limits?.evaluations.limit === -1
                  ? 0
                  : ((usage?.evaluationsRun || 0) / (limits?.evaluations.limit || 1)) * 100
              }
              className={limits?.evaluations.exceeded ? "bg-red-200" : ""}
            />
            {limits?.evaluations.exceeded && (
              <p className="text-sm text-red-600 mt-1">Limit reached. Upgrade to run more evaluations.</p>
            )}
          </div>

          {/* API Calls */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">API Calls Made</span>
              <span className="text-sm text-muted-foreground">
                {usage?.apiCallsMade || 0} / {limits?.apiCalls.limit === -1 ? "∞" : limits?.apiCalls.limit}
              </span>
            </div>
            <Progress
              value={
                limits?.apiCalls.limit === -1
                  ? 0
                  : ((usage?.apiCallsMade || 0) / (limits?.apiCalls.limit || 1)) * 100
              }
              className={limits?.apiCalls.exceeded ? "bg-red-200" : ""}
            />
            {limits?.apiCalls.exceeded && (
              <p className="text-sm text-red-600 mt-1">Limit reached. Upgrade to make more API calls.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans?.map((plan) => (
            <Card
              key={plan.id}
              className={currentTier === plan.id ? "border-primary border-2" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{plan.name}</CardTitle>
                  {currentTier === plan.id && <Badge>Current</Badge>}
                </div>
                <CardDescription>
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {currentTier === plan.id ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.id === "free" ? (
                  <Button className="w-full" variant="outline" disabled>
                    Downgrade Not Available
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => createCheckout.mutate({ tier: plan.id as "pro" | "enterprise" })}
                    disabled={createCheckout.isPending}
                  >
                    {createCheckout.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
