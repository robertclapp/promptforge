import { Request, Response, NextFunction } from "express";
import { validateAPIKey } from "../services/apiKey.service";

/**
 * API Key Authentication Middleware
 * Validates API key from Authorization header
 */
export async function apiAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
      });
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

    const validation = await validateAPIKey(apiKey);

    if (!validation) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired API key",
      });
    }

    // Attach user info to request
    (req as any).userId = validation.userId;
    (req as any).keyId = validation.keyId;

    next();
  } catch (error) {
    console.error("[API Auth] Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to authenticate request",
    });
  }
}

/**
 * Rate Limiting Middleware
 * Enforces rate limits based on API key
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const keyId = (req as any).keyId;

  if (!keyId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key required for rate limiting",
    });
  }

  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  let record = requestCounts.get(keyId);

  // Reset if window expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
    requestCounts.set(keyId, record);
  }

  record.count++;

  const rateLimit = 1000; // Default rate limit

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", rateLimit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, rateLimit - record.count));
  res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

  if (record.count > rateLimit) {
    return res.status(429).json({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Limit: ${rateLimit} requests per hour`,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    });
  }

  next();
}
