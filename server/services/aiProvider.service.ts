import { decrypt } from "../utils/crypto";

/**
 * AI Provider Service
 * Unified interface for calling different AI providers (OpenAI, Anthropic, Google, Mistral)
 * Tracks tokens, latency, and cost for each request
 */

// Default timeout for API requests (60 seconds)
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface AIProviderConfig {
  id: string;
  provider: "openai" | "anthropic" | "google" | "mistral";
  model: string;
  apiKeyEncrypted: string;
  config?: Record<string, any>;
}

export interface PromptExecutionRequest {
  prompt: string;
  variables?: Record<string, string>;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface PromptExecutionResult {
  output: string;
  tokensUsed: number;
  latencyMs: number;
  cost: number;
  model: string;
  provider: string;
  timestamp: Date;
  error?: string;
}

/**
 * Token pricing per 1K tokens (as of Dec 2025)
 * Input/Output pricing
 */
const TOKEN_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },

  // Anthropic
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "claude-3-5-haiku-20241022": { input: 0.0008, output: 0.004 },
  "claude-3-opus-20240229": { input: 0.015, output: 0.075 },
  "claude-3-sonnet-20240229": { input: 0.003, output: 0.015 },
  "claude-3-haiku-20240307": { input: 0.00025, output: 0.00125 },

  // Google
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  "gemini-pro": { input: 0.00025, output: 0.0005 },

  // Mistral
  "mistral-large-latest": { input: 0.004, output: 0.012 },
  "mistral-medium-latest": { input: 0.0027, output: 0.0081 },
  "mistral-small-latest": { input: 0.001, output: 0.003 },
  "mixtral-8x7b-instruct": { input: 0.0007, output: 0.0007 },
};

/**
 * Replace variables in prompt template
 */
function interpolatePrompt(template: string, variables?: Record<string, string>): string {
  if (!variables) return template;
  
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }
  
  return result;
}

/**
 * Calculate cost based on tokens and model
 */
function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = TOKEN_PRICING[model] || { input: 0.001, output: 0.002 };
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Execute prompt with OpenAI
 */
async function executeOpenAI(
  config: AIProviderConfig,
  request: PromptExecutionRequest
): Promise<PromptExecutionResult> {
  const startTime = Date.now();
  const apiKey = decrypt(config.apiKeyEncrypted);
  const prompt = interpolatePrompt(request.prompt, request.variables);

  try {
    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            ...(request.systemPrompt ? [{ role: "system", content: request.systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1000,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenAI API request failed");
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cost = calculateCost(config.model, inputTokens, outputTokens);

    return {
      output: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
      latencyMs,
      cost,
      model: config.model,
      provider: "openai",
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      output: "",
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      cost: 0,
      model: config.model,
      provider: "openai",
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute prompt with Anthropic Claude
 */
async function executeAnthropic(
  config: AIProviderConfig,
  request: PromptExecutionRequest
): Promise<PromptExecutionResult> {
  const startTime = Date.now();
  const apiKey = decrypt(config.apiKeyEncrypted);
  const prompt = interpolatePrompt(request.prompt, request.variables);

  try {
    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          ...(request.systemPrompt && { system: request.systemPrompt }),
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1000,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Anthropic API request failed");
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const cost = calculateCost(config.model, inputTokens, outputTokens);

    return {
      output: data.content[0].text,
      tokensUsed: inputTokens + outputTokens,
      latencyMs,
      cost,
      model: config.model,
      provider: "anthropic",
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      output: "",
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      cost: 0,
      model: config.model,
      provider: "anthropic",
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute prompt with Google Gemini
 */
async function executeGoogle(
  config: AIProviderConfig,
  request: PromptExecutionRequest
): Promise<PromptExecutionResult> {
  const startTime = Date.now();
  const apiKey = decrypt(config.apiKeyEncrypted);
  const prompt = interpolatePrompt(request.prompt, request.variables);

  try {
    const fullPrompt = request.systemPrompt 
      ? `${request.systemPrompt}\n\n${prompt}`
      : prompt;

    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1/models/${config.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Google API request failed");
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    // Google doesn't provide exact token counts in the same way
    // Estimate based on character count (rough approximation: 4 chars = 1 token)
    const outputText = data.candidates[0].content.parts[0].text;
    const estimatedInputTokens = Math.ceil(fullPrompt.length / 4);
    const estimatedOutputTokens = Math.ceil(outputText.length / 4);
    const cost = calculateCost(config.model, estimatedInputTokens, estimatedOutputTokens);

    return {
      output: outputText,
      tokensUsed: estimatedInputTokens + estimatedOutputTokens,
      latencyMs,
      cost,
      model: config.model,
      provider: "google",
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      output: "",
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      cost: 0,
      model: config.model,
      provider: "google",
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute prompt with Mistral
 */
async function executeMistral(
  config: AIProviderConfig,
  request: PromptExecutionRequest
): Promise<PromptExecutionResult> {
  const startTime = Date.now();
  const apiKey = decrypt(config.apiKeyEncrypted);
  const prompt = interpolatePrompt(request.prompt, request.variables);

  try {
    const response = await fetchWithTimeout(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            ...(request.systemPrompt ? [{ role: "system", content: request.systemPrompt }] : []),
            { role: "user", content: prompt },
          ],
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 1000,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Mistral API request failed");
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const cost = calculateCost(config.model, inputTokens, outputTokens);

    return {
      output: data.choices[0].message.content,
      tokensUsed: data.usage.total_tokens,
      latencyMs,
      cost,
      model: config.model,
      provider: "mistral",
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      output: "",
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      cost: 0,
      model: config.model,
      provider: "mistral",
      timestamp: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Main execution function - routes to appropriate provider
 */
export async function executePrompt(
  config: AIProviderConfig,
  request: PromptExecutionRequest
): Promise<PromptExecutionResult> {
  switch (config.provider) {
    case "openai":
      return executeOpenAI(config, request);
    case "anthropic":
      return executeAnthropic(config, request);
    case "google":
      return executeGoogle(config, request);
    case "mistral":
      return executeMistral(config, request);
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

/**
 * Test provider connection
 */
export async function testProviderConnection(config: AIProviderConfig): Promise<boolean> {
  try {
    const result = await executePrompt(config, {
      prompt: "Say 'Hello' if you can read this.",
      maxTokens: 10,
    });
    
    return !result.error && result.output.length > 0;
  } catch (error) {
    return false;
  }
}
