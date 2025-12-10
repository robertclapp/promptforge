/**
 * Demo Data Generation Script for PromptForge
 * 
 * This script generates realistic demo data for investor presentations:
 * - Multiple AI providers with different models
 * - Diverse prompt templates across use cases
 * - Completed evaluations with realistic metrics
 * - Analytics events showing platform usage
 * - Context packages with sample content
 * 
 * Run with: npx tsx scripts/generate-demo-data.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import {
  users,
  aiProviders,
  prompts,
  promptVersions,
  contextPackages,
  evaluations,
  evaluationResults,
  analyticsEvents,
} from "../drizzle/schema";
import { encrypt } from "../server/utils/crypto";

const db = drizzle(process.env.DATABASE_URL!);

// Get the current user (owner)
const OWNER_ID = process.env.OWNER_OPEN_ID || "demo-user";

// Demo API keys (these are fake, for display only)
const DEMO_API_KEY = "sk-demo1234567890abcdefghijklmnopqrstuvwxyz";

const DEMO_PROVIDERS = [
  {
    provider: "openai" as const,
    name: "OpenAI GPT-4 Turbo",
    model: "gpt-4-turbo",
    description: "Latest GPT-4 Turbo model for high-quality responses",
  },
  {
    provider: "openai" as const,
    name: "OpenAI GPT-3.5",
    model: "gpt-3.5-turbo",
    description: "Fast and cost-effective GPT-3.5 model",
  },
  {
    provider: "anthropic" as const,
    name: "Claude 3 Opus",
    model: "claude-3-opus",
    description: "Most capable Claude model for complex tasks",
  },
  {
    provider: "anthropic" as const,
    name: "Claude 3 Sonnet",
    model: "claude-3-sonnet",
    description: "Balanced performance and cost",
  },
  {
    provider: "google" as const,
    name: "Gemini Pro",
    model: "gemini-pro",
    description: "Google's advanced AI model",
  },
];

const DEMO_PROMPTS = [
  {
    name: "Customer Support Response",
    description: "Generate empathetic and helpful customer support responses",
    content: `You are a customer support specialist. Respond to the following customer inquiry with empathy, professionalism, and provide a helpful solution.

Customer Inquiry: {{inquiry}}

Guidelines:
- Acknowledge the customer's concern
- Provide a clear solution or next steps
- Maintain a friendly and professional tone
- Offer additional help if needed`,
    tags: ["customer-support", "communication"],
    category: "Customer Service",
  },
  {
    name: "Product Marketing Copy",
    description: "Create compelling marketing copy for products",
    content: `Write engaging marketing copy for the following product:

Product Name: {{product_name}}
Key Features: {{features}}
Target Audience: {{audience}}

Create copy that:
- Highlights unique value propositions
- Uses persuasive language
- Includes a strong call-to-action
- Resonates with the target audience`,
    tags: ["marketing", "copywriting"],
    category: "Marketing",
  },
  {
    name: "Code Review Assistant",
    description: "Provide constructive code review feedback",
    content: `Review the following code and provide constructive feedback:

\`\`\`{{language}}
{{code}}
\`\`\`

Focus on:
- Code quality and best practices
- Potential bugs or security issues
- Performance optimizations
- Readability and maintainability
- Suggest specific improvements`,
    tags: ["development", "code-review"],
    category: "Development",
  },
  {
    name: "Email Subject Line Generator",
    description: "Generate high-converting email subject lines",
    content: `Generate 5 compelling email subject lines for the following campaign:

Campaign Type: {{campaign_type}}
Target Audience: {{audience}}
Key Message: {{message}}
Goal: {{goal}}

Subject lines should be:
- Attention-grabbing
- Under 60 characters
- Action-oriented
- Personalized when possible`,
    tags: ["email", "marketing"],
    category: "Marketing",
  },
  {
    name: "Meeting Summary Generator",
    description: "Create concise meeting summaries with action items",
    content: `Create a structured summary of the following meeting:

Meeting Topic: {{topic}}
Participants: {{participants}}
Discussion Points: {{discussion}}

Summary should include:
- Key decisions made
- Action items with owners
- Important deadlines
- Follow-up tasks`,
    tags: ["productivity", "meetings"],
    category: "Productivity",
  },
  {
    name: "Social Media Post Creator",
    description: "Generate engaging social media content",
    content: `Create an engaging social media post for {{platform}}:

Topic: {{topic}}
Tone: {{tone}}
Target Audience: {{audience}}

Post should:
- Be platform-appropriate length
- Include relevant hashtags
- Have a clear call-to-action
- Be engaging and shareable`,
    tags: ["social-media", "content"],
    category: "Marketing",
  },
];

const DEMO_CONTEXT_PACKAGES = [
  {
    name: "Company Brand Guidelines",
    description: "Brand voice, tone, and messaging guidelines",
    content: JSON.stringify({
      brand_voice: "Professional yet approachable",
      tone: "Helpful, knowledgeable, and empathetic",
      key_messages: [
        "Innovation through AI",
        "Empowering developers",
        "Cost-effective solutions",
      ],
      avoid: ["Technical jargon", "Overpromising", "Negative language"],
    }),
    tags: ["branding", "guidelines"],
  },
  {
    name: "Product Documentation Context",
    description: "Key product features and technical specifications",
    content: JSON.stringify({
      product_name: "PromptForge",
      key_features: [
        "Multi-provider evaluation",
        "Cost comparison",
        "Version control",
        "Team collaboration",
      ],
      technical_specs: {
        supported_providers: ["OpenAI", "Anthropic", "Google", "Mistral"],
        api_integration: "RESTful API with tRPC",
        security: "End-to-end encryption for API keys",
      },
    }),
    tags: ["product", "documentation"],
  },
  {
    name: "Customer Support Knowledge Base",
    description: "Common customer issues and solutions",
    content: JSON.stringify({
      common_issues: [
        {
          issue: "API key not working",
          solution: "Verify the API key is correct and has proper permissions",
        },
        {
          issue: "Evaluation taking too long",
          solution: "Check provider status and network connectivity",
        },
        {
          issue: "Cost calculation seems incorrect",
          solution: "Verify token counts and provider pricing tiers",
        },
      ],
      escalation_criteria: [
        "Security concerns",
        "Billing disputes",
        "Data loss incidents",
      ],
    }),
    tags: ["support", "knowledge-base"],
  },
];

// Realistic evaluation metrics generator
function generateRealisticMetrics(providerType: string, model: string) {
  const baseMetrics = {
    openai: {
      "gpt-4-turbo": { tokensMin: 80, tokensMax: 150, latencyMin: 1200, latencyMax: 2500, costPer1k: 0.01 },
      "gpt-3.5-turbo": { tokensMin: 70, tokensMax: 130, latencyMin: 800, latencyMax: 1500, costPer1k: 0.002 },
    },
    anthropic: {
      "claude-3-opus": { tokensMin: 90, tokensMax: 160, latencyMin: 1500, latencyMax: 2800, costPer1k: 0.015 },
      "claude-3-sonnet": { tokensMin: 85, tokensMax: 145, latencyMin: 1100, latencyMax: 2200, costPer1k: 0.008 },
    },
    google: {
      "gemini-pro": { tokensMin: 75, tokensMax: 140, latencyMin: 1000, latencyMax: 2000, costPer1k: 0.005 },
    },
  };

  const metrics = baseMetrics[providerType as keyof typeof baseMetrics]?.[model as keyof typeof baseMetrics.openai];
  if (!metrics) {
    return { tokens: 100, latency: 1500, cost: 0.01, quality: 85 };
  }

  const tokens = Math.floor(Math.random() * (metrics.tokensMax - metrics.tokensMin) + metrics.tokensMin);
  const latency = Math.floor(Math.random() * (metrics.latencyMax - metrics.latencyMin) + metrics.latencyMin);
  const cost = (tokens / 1000) * metrics.costPer1k;
  const quality = Math.floor(Math.random() * 15 + 85); // 85-100%

  return { tokens, latency, cost: parseFloat(cost.toFixed(4)), quality };
}

async function generateDemoData() {
  console.log("🚀 Starting demo data generation...\n");

  try {
    // 1. Create AI Providers
    console.log("📡 Creating AI providers...");
    const createdProviders: any[] = [];
    
    for (const provider of DEMO_PROVIDERS) {
      const encryptedKey = encrypt(DEMO_API_KEY);
      const providerId = `provider-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(aiProviders).values({
        id: providerId,
        userId: OWNER_ID,
        provider: provider.provider,
        name: provider.name,
        model: provider.model,
        apiKeyEncrypted: encryptedKey,
        isActive: true,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
      });
      
      // Get the created provider
      const [created] = await db.select().from(aiProviders).where(eq(aiProviders.id, providerId)).limit(1);
      if (created) {
        createdProviders.push(created);
        console.log(`  ✓ Created ${provider.name}`);
      }
    }

    // 2. Create Context Packages
    console.log("\n📦 Creating context packages...");
    const createdPackages: any[] = [];
    
    for (const pkg of DEMO_CONTEXT_PACKAGES) {
      const pkgId = `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(contextPackages).values({
        id: pkgId,
        userId: OWNER_ID,
        name: pkg.name,
        description: pkg.description,
        content: pkg.content,
        tags: pkg.tags,
        createdAt: new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000),
      });
      
      const [created] = await db.select().from(contextPackages).where(eq(contextPackages.id, pkgId)).limit(1);
      if (created) {
        createdPackages.push(created);
        console.log(`  ✓ Created ${pkg.name}`);
      }
    }

    // 3. Create Prompts with Versions
    console.log("\n✍️  Creating prompts...");
    const createdPrompts: any[] = [];
    
    for (const prompt of DEMO_PROMPTS) {
      const promptId = `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000);
      
      await db.insert(prompts).values({
        id: promptId,
        userId: OWNER_ID,
        name: prompt.name,
        description: prompt.description,
        content: prompt.content,
        variables: [],
        tags: prompt.tags,
        category: prompt.category,
        version: 1,
        createdAt,
        updatedAt: createdAt,
      });

      // Create version history
      await db.insert(promptVersions).values({
        id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        promptId,
        version: 1,
        content: prompt.content,
        variables: [],
        changeDescription: "Initial version",
        createdBy: OWNER_ID,
        createdAt,
      });

      const [created] = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
      if (created) {
        createdPrompts.push(created);
        console.log(`  ✓ Created ${prompt.name}`);
      }
    }

    // 4. Create Evaluations with Results
    console.log("\n⚡ Creating evaluations with results...");
    
    // Create 3 completed evaluations
    for (let i = 0; i < 3; i++) {
      const prompt = createdPrompts[i % createdPrompts.length];
      const evaluationId = `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000);
      const completedAt = new Date(createdAt.getTime() + Math.random() * 60000 + 30000); // 30-90 seconds later

      await db.insert(evaluations).values({
        id: evaluationId,
        userId: OWNER_ID,
        name: `${prompt.name} - Evaluation ${i + 1}`,
        description: `Comparing performance across multiple AI providers`,
        promptId: prompt.id,
        testCases: [
          { input: { query: "Sample test input" }, expectedOutput: "Expected response" },
        ],
        status: "completed",
        createdAt,
        completedAt,
      });

      console.log(`  ✓ Created evaluation for ${prompt.name}`);

      // Create results for 3-4 providers
      const numProviders = Math.floor(Math.random() * 2) + 3; // 3 or 4 providers
      const selectedProviders = createdProviders.slice(0, numProviders);

      for (const provider of selectedProviders) {
        const metrics = generateRealisticMetrics(provider.provider, provider.model);
        
        await db.insert(evaluationResults).values({
          id: `result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          evaluationId,
          providerId: provider.id,
          model: provider.model,
          testCaseIndex: 0,
          input: { query: "Sample test input" },
          output: `This is a realistic demo response from ${provider.name}. The response demonstrates the model's capability to handle the given prompt effectively.`,
          tokensUsed: metrics.tokens,
          latencyMs: metrics.latency,
          cost: Math.round(metrics.cost * 100), // Convert to cents
          quality: metrics.quality,
          createdAt: new Date(createdAt.getTime() + Math.random() * 30000 + 5000),
        });

        console.log(`    ✓ Added result for ${provider.name} (${metrics.tokens} tokens, ${metrics.latency}ms, $${metrics.cost})`);
      }
    }

    // 5. Create Analytics Events
    console.log("\n📊 Creating analytics events...");
    const eventTypes = ["prompt_created", "prompt_executed", "evaluation_run", "provider_added"];
    const numEvents = 50;

    for (let i = 0; i < numEvents; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      await db.insert(analyticsEvents).values({
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: OWNER_ID,
        eventType,
        metadata: JSON.stringify({
          source: "demo_data",
          timestamp: createdAt.toISOString(),
        }),
        createdAt,
      });
    }
    console.log(`  ✓ Created ${numEvents} analytics events`);

    console.log("\n✅ Demo data generation complete!");
    console.log("\n📈 Summary:");
    console.log(`  - ${createdProviders.length} AI providers`);
    console.log(`  - ${createdPackages.length} context packages`);
    console.log(`  - ${createdPrompts.length} prompts`);
    console.log(`  - 3 completed evaluations with results`);
    console.log(`  - ${numEvents} analytics events`);
    console.log("\n🎉 Your PromptForge demo is ready for investor presentations!");

  } catch (error) {
    console.error("❌ Error generating demo data:", error);
    throw error;
  }
}

// Run the script
generateDemoData()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
