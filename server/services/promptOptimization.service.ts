import { invokeLLM } from "../_core/llm";
import * as db from "../db";

/**
 * Optimization suggestion from AI
 */
export interface OptimizationSuggestion {
  id?: string; // Optimization ID from database
  improvedPrompt: string;
  explanation: string;
  improvements: Array<{
    category: "clarity" | "specificity" | "structure" | "context" | "constraints";
    issue: string;
    fix: string;
  }>;
  estimatedQualityImprovement: number; // Percentage improvement estimate
}

/**
 * Optimization result stored in database
 */
export interface OptimizationResult {
  id: string;
  promptId: string;
  userId: string;
  originalPrompt: string;
  optimizedPrompt: string;
  suggestions: OptimizationSuggestion;
  applied: boolean;
  createdAt: Date | null;
}

/**
 * Analyze a prompt and generate optimization suggestions
 */
export async function optimizePrompt(
  promptId: string,
  userId: string
): Promise<OptimizationSuggestion> {
  // Get the prompt
  const prompt = await db.getPrompt(promptId);
  if (!prompt) {
    throw new Error("Prompt not found");
  }

  // Use LLM to analyze and optimize the prompt
  const systemPrompt = `You are an expert prompt engineer specializing in optimizing AI prompts for maximum effectiveness. Your task is to analyze prompts and provide specific, actionable improvements.

Analyze prompts across these dimensions:
1. **Clarity**: Is the instruction clear and unambiguous?
2. **Specificity**: Does it provide enough detail and constraints?
3. **Structure**: Is it well-organized with clear sections?
4. **Context**: Does it provide necessary background information?
5. **Constraints**: Are output format, length, and style requirements clear?

Provide:
- An improved version of the prompt
- Specific improvements made in each category
- Estimated quality improvement percentage (realistic estimate based on changes)`;

  const userPrompt = `Analyze and optimize this prompt:

**Original Prompt:**
${prompt.content}

**Prompt Name:** ${prompt.name}
${prompt.description ? `**Description:** ${prompt.description}` : ""}
${prompt.variables && prompt.variables.length > 0 ? `**Variables:** ${prompt.variables.join(", ")}` : ""}

Please provide your analysis and optimization in the following JSON format:
{
  "improvedPrompt": "The optimized version of the prompt",
  "explanation": "Overall explanation of the optimization strategy",
  "improvements": [
    {
      "category": "clarity|specificity|structure|context|constraints",
      "issue": "Description of the issue found",
      "fix": "Description of how it was fixed"
    }
  ],
  "estimatedQualityImprovement": 15
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "prompt_optimization",
          strict: true,
          schema: {
            type: "object",
            properties: {
              improvedPrompt: {
                type: "string",
                description: "The optimized version of the prompt",
              },
              explanation: {
                type: "string",
                description: "Overall explanation of the optimization strategy",
              },
              improvements: {
                type: "array",
                description: "List of specific improvements made",
                items: {
                  type: "object",
                  properties: {
                    category: {
                      type: "string",
                      enum: ["clarity", "specificity", "structure", "context", "constraints"],
                      description: "Category of improvement",
                    },
                    issue: {
                      type: "string",
                      description: "Description of the issue found",
                    },
                    fix: {
                      type: "string",
                      description: "Description of how it was fixed",
                    },
                  },
                  required: ["category", "issue", "fix"],
                  additionalProperties: false,
                },
              },
              estimatedQualityImprovement: {
                type: "integer",
                description: "Estimated quality improvement percentage (0-100)",
              },
            },
            required: ["improvedPrompt", "explanation", "improvements", "estimatedQualityImprovement"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const suggestion = JSON.parse(contentStr) as OptimizationSuggestion;

    // Store the optimization in database
    const optimizationId = await storeOptimization(promptId, userId, prompt.content, suggestion);

    return { ...suggestion, id: optimizationId };
  } catch (error: any) {
    console.error("[PromptOptimization] Error optimizing prompt:", error);
    throw new Error(`Failed to optimize prompt: ${error.message}`);
  }
}

/**
 * Store optimization result in database
 */
async function storeOptimization(
  promptId: string,
  userId: string,
  originalPrompt: string,
  suggestion: OptimizationSuggestion
): Promise<string> {
  const optimizationId = await db.createOptimization({
    promptId,
    userId,
    originalPrompt,
    optimizedPrompt: suggestion.improvedPrompt,
    suggestions: suggestion,
    applied: false,
  });

  return optimizationId;
}

/**
 * Apply an optimization to a prompt (create new version)
 */
export async function applyOptimization(
  optimizationId: string,
  userId: string
): Promise<string> {
  // Get the optimization
  const optimization = await db.getOptimization(optimizationId);
  if (!optimization) {
    throw new Error("Optimization not found");
  }

  // Verify ownership
  if (optimization.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Get the original prompt
  const prompt = await db.getPrompt(optimization.promptId);
  if (!prompt) {
    throw new Error("Prompt not found");
  }

  // Create a new version with the optimized content
  const versionId = await db.createPromptVersion({
    promptId: optimization.promptId,
    content: optimization.optimizedPrompt,
    version: (prompt.version || 1) + 1,
    changeMessage: `Applied AI optimization: ${optimization.suggestions.explanation}`,
    createdBy: userId,
  });

  // Update the prompt with the new version
  await db.updatePrompt(optimization.promptId, {
    content: optimization.optimizedPrompt,
    version: (prompt.version || 1) + 1,
  });

  // Mark optimization as applied
  await db.updateOptimization(optimizationId, { applied: true });

  return versionId;
}

/**
 * Get optimization history for a prompt
 */
export async function getPromptOptimizations(promptId: string): Promise<OptimizationResult[]> {
  return await db.getPromptOptimizations(promptId);
}

/**
 * Get optimization by ID
 */
export async function getOptimization(optimizationId: string): Promise<OptimizationResult | undefined> {
  return await db.getOptimization(optimizationId);
}

/**
 * Get all optimizations for a user
 */
export async function getUserOptimizations(userId: string): Promise<OptimizationResult[]> {
  return await db.getUserOptimizations(userId);
}
