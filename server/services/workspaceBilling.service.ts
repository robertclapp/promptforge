import { getDb } from "../db";
import { workspaceSubscriptions, workspaceUsage, subscriptionPlans } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-12-15.clover",
});

/**
 * Subscription tiers and their Stripe price IDs
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    maxPrompts: 10,
    maxEvaluations: 5,
    maxApiCalls: 100,
    maxMembers: 3,
    features: ["Basic prompts", "Limited evaluations", "Community support"],
  },
  pro: {
    name: "Pro",
    price: 99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro",
    maxPrompts: 1000,
    maxEvaluations: 500,
    maxApiCalls: 10000,
    maxMembers: 10,
    features: [
      "Unlimited prompts",
      "Advanced evaluations",
      "API access",
      "Priority support",
      "Team collaboration",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: 499,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise",
    maxPrompts: -1, // unlimited
    maxEvaluations: -1,
    maxApiCalls: -1,
    maxMembers: -1,
    features: [
      "Everything in Pro",
      "Unlimited resources",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "SSO",
    ],
  },
};

/**
 * Get workspace subscription
 */
export async function getWorkspaceSubscription(organizationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [subscription] = await db
    .select()
    .from(workspaceSubscriptions)
    .where(eq(workspaceSubscriptions.organizationId, organizationId))
    .limit(1);

  return subscription || null;
}

/**
 * Create or update workspace subscription
 */
export async function upsertWorkspaceSubscription(data: {
  organizationId: string;
  tier: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  status?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getWorkspaceSubscription(data.organizationId);

  if (existing) {
    await db
      .update(workspaceSubscriptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(workspaceSubscriptions.id, existing.id));
    return getWorkspaceSubscription(data.organizationId);
  } else {
    const id = nanoid();
    await db
      .insert(workspaceSubscriptions)
      .values({
        id,
        ...data,
        status: data.status || "active",
      });
    return getWorkspaceSubscription(data.organizationId);
  }
}

/**
 * Get workspace usage for current month
 */
export async function getWorkspaceUsage(organizationId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [usage] = await db
    .select()
    .from(workspaceUsage)
    .where(
      and(
        eq(workspaceUsage.organizationId, organizationId),
        eq(workspaceUsage.month, currentMonth)
      )
    )
    .limit(1);

  if (!usage) {
    // Create new usage record for this month
    await db
      .insert(workspaceUsage)
      .values({
        id: nanoid(),
        organizationId,
        month: currentMonth,
        promptsCreated: 0,
        evaluationsRun: 0,
        apiCallsMade: 0,
        storageUsedMB: 0,
      });
    return getWorkspaceUsage(organizationId);
  }

  return usage;
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  organizationId: string,
  metric: "promptsCreated" | "evaluationsRun" | "apiCallsMade" | "storageUsedMB",
  amount: number = 1
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const usage = await getWorkspaceUsage(organizationId);

  await db
    .update(workspaceUsage)
    .set({
      [metric]: (usage[metric] || 0) + amount,
      updatedAt: new Date(),
    })
    .where(eq(workspaceUsage.id, usage.id));

  return getWorkspaceUsage(organizationId);
}

/**
 * Check if workspace has reached usage limits
 */
export async function checkUsageLimits(organizationId: string) {
  const subscription = await getWorkspaceSubscription(organizationId);
  const usage = await getWorkspaceUsage(organizationId);
  
  const tier = subscription?.tier || "free";
  const limits = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

  return {
    prompts: {
      used: usage.promptsCreated,
      limit: limits.maxPrompts,
      exceeded: limits.maxPrompts > 0 && usage.promptsCreated >= limits.maxPrompts,
    },
    evaluations: {
      used: usage.evaluationsRun,
      limit: limits.maxEvaluations,
      exceeded: limits.maxEvaluations > 0 && usage.evaluationsRun >= limits.maxEvaluations,
    },
    apiCalls: {
      used: usage.apiCallsMade,
      limit: limits.maxApiCalls,
      exceeded: limits.maxApiCalls > 0 && usage.apiCallsMade >= limits.maxApiCalls,
    },
  };
}

/**
 * Create Stripe checkout session for subscription upgrade
 */
export async function createCheckoutSession(
  organizationId: string,
  tier: "pro" | "enterprise",
  userId: string,
  userEmail: string
) {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  
  if (!tierConfig.stripePriceId) {
    throw new Error(`No Stripe price ID configured for ${tier} tier`);
  }

  const subscription = await getWorkspaceSubscription(organizationId);
  
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: tierConfig.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/workspace-analytics?success=true`,
    cancel_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/workspace-analytics?canceled=true`,
    customer_email: userEmail,
    client_reference_id: organizationId,
    metadata: {
      organizationId,
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        organizationId,
        tier,
      },
    },
    allow_promotion_codes: true,
  });

  return session;
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.client_reference_id || session.metadata?.organizationId;
      const tier = session.metadata?.tier;

      if (organizationId && tier) {
        await upsertWorkspaceSubscription({
          organizationId,
          tier,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          status: "active",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata.organizationId;

      if (organizationId) {
        await upsertWorkspaceSubscription({
          organizationId,
          tier: subscription.metadata.tier || "pro",
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata.organizationId;

      if (organizationId) {
        await upsertWorkspaceSubscription({
          organizationId,
          tier: "free",
          status: "canceled",
        });
      }
      break;
    }
  }
}

/**
 * Get all subscription plans
 */
export async function getSubscriptionPlans() {
  return Object.entries(SUBSCRIPTION_TIERS).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}
