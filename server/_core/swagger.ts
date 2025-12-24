import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "PromptForge API",
    version: "1.0.0",
    description: "REST API for PromptForge - Enterprise Prompt Engineering Platform",
    contact: {
      name: "PromptForge Support",
      email: "support@promptforge.com",
    },
  },
  servers: [
    {
      url: "/api/v1",
      description: "API v1",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "Enter your API key in the format: pk_live_xxxxxxxxxx",
      },
    },
    schemas: {
      Prompt: {
        type: "object",
        properties: {
          id: { type: "string", example: "prompt_abc123" },
          userId: { type: "string", example: "user_xyz789" },
          name: { type: "string", example: "Customer Support Template" },
          description: { type: "string", example: "Template for handling customer inquiries" },
          content: { type: "string", example: "You are a helpful customer support agent..." },
          version: { type: "integer", example: 1 },
          tags: { type: "array", items: { type: "string" }, example: ["support", "customer-service"] },
          isPublic: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Template: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          content: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          rating: { type: "number", format: "float", example: 4.5 },
          usageCount: { type: "integer", example: 127 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Unauthorized" },
          message: { type: "string", example: "Invalid or expired API key" },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "array", items: {} },
          pagination: {
            type: "object",
            properties: {
              limit: { type: "integer", example: 50 },
              offset: { type: "integer", example: 0 },
              total: { type: "integer", example: 127 },
            },
          },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./server/_core/restApi.ts"], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger documentation route
 */
export function setupSwagger(app: Express) {
  // Serve Swagger UI
  app.use("/api/docs", swaggerUi.serve);
  app.get("/api/docs", swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "PromptForge API Documentation",
  }));

  // Serve OpenAPI spec as JSON
  app.get("/api/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  console.log("📚 Swagger documentation available at /api/docs");
}
