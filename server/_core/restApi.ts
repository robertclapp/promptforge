import { Router } from "express";
import { apiAuthMiddleware, rateLimitMiddleware } from "./apiAuth";
import { getDb } from "../db";
import { prompts, evaluations } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Apply authentication and rate limiting to all API routes
router.use(apiAuthMiddleware);
router.use(rateLimitMiddleware);

/**
 * @swagger
 * /prompts:
 *   get:
 *     summary: List all prompts
 *     description: Retrieve all prompts for the authenticated user
 *     tags: [Prompts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of prompts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of prompts to skip
 *     responses:
 *       200:
 *         description: Successfully retrieved prompts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/prompts", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = await getDb();

    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const userPrompts = await db
      .select()
      .from(prompts)
      .where(eq(prompts.userId, userId))
      .orderBy(desc(prompts.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: userPrompts,
      pagination: {
        limit,
        offset,
        total: userPrompts.length,
      },
    });
  } catch (error) {
    console.error("[API] GET /prompts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /prompts/{id}:
 *   get:
 *     summary: Get a specific prompt
 *     description: Retrieve a single prompt by ID
 *     tags: [Prompts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Prompt ID
 *     responses:
 *       200:
 *         description: Successfully retrieved prompt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Prompt'
 *       404:
 *         description: Prompt not found
 *       403:
 *         description: Forbidden - not the owner
 */
router.get("/prompts/:id", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const db = await getDb();

    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const result = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    const prompt = result[0];

    // Check ownership
    if (prompt.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    console.error("[API] GET /prompts/:id error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /evaluations:
 *   post:
 *     summary: Create an evaluation
 *     description: Queue a new evaluation for a prompt
 *     tags: [Evaluations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - promptId
 *               - providerId
 *             properties:
 *               promptId:
 *                 type: string
 *                 example: prompt_abc123
 *               providerId:
 *                 type: string
 *                 example: provider_xyz789
 *               testCases:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       202:
 *         description: Evaluation queued
 *       400:
 *         description: Bad request - missing required fields
 *       404:
 *         description: Prompt not found
 */
router.post("/evaluations", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { promptId, providerId, testCases } = req.body;

    if (!promptId || !providerId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "promptId and providerId are required",
      });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    // Verify prompt ownership
    const promptResult = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, promptId))
      .limit(1);

    if (promptResult.length === 0) {
      return res.status(404).json({ error: "Prompt not found" });
    }

    if (promptResult[0].userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Note: Full evaluation execution would require the evaluation service
    // For now, return a placeholder response
    res.status(202).json({
      success: true,
      message: "Evaluation queued for processing",
      data: {
        promptId,
        providerId,
        status: "queued",
      },
    });
  } catch (error) {
    console.error("[API] POST /evaluations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: Browse marketplace templates
 *     description: Get all public templates from the marketplace
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Successfully retrieved templates
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
router.get("/templates", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const templates = await db
      .select()
      .from(prompts)
      .where(eq(prompts.isPublic, true))
      .orderBy(desc(prompts.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: templates,
      pagination: {
        limit,
        offset,
        total: templates.length,
      },
    });
  } catch (error) {
    console.error("[API] GET /templates error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check API health status (no authentication required)
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
