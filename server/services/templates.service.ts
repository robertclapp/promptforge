/**
 * Prompt Templates Service
 * Manages the curated templates library and user template imports
 */

import { getDb } from "../db";
import { prompts, promptVersions } from "../../drizzle/schema";
import { 
  promptTemplates, 
  templateCategories,
  getTemplatesByCategory,
  getTemplateById,
  searchTemplates,
  getTemplatesByDifficulty,
  type PromptTemplate,
  type TemplateCategory
} from "../data/promptTemplates";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface TemplateImportResult {
  success: boolean;
  promptId?: number;
  error?: string;
}

export const templatesService = {
  /**
   * Get all template categories with metadata
   */
  getCategories() {
    return Object.entries(templateCategories).map(([key, value]) => ({
      id: key as TemplateCategory,
      ...value,
      templateCount: promptTemplates.filter(t => t.category === key).length
    }));
  },

  /**
   * Get all templates
   */
  getAllTemplates() {
    return promptTemplates.map(t => ({
      ...t,
      categoryName: templateCategories[t.category].name
    }));
  },

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory) {
    return getTemplatesByCategory(category).map(t => ({
      ...t,
      categoryName: templateCategories[t.category].name
    }));
  },

  /**
   * Get a single template by ID
   */
  getById(id: string) {
    const template = getTemplateById(id);
    if (!template) return null;
    return {
      ...template,
      categoryName: templateCategories[template.category].name
    };
  },

  /**
   * Search templates
   */
  search(query: string) {
    return searchTemplates(query).map(t => ({
      ...t,
      categoryName: templateCategories[t.category].name
    }));
  },

  /**
   * Get templates by difficulty
   */
  getByDifficulty(difficulty: PromptTemplate["difficulty"]) {
    return getTemplatesByDifficulty(difficulty).map(t => ({
      ...t,
      categoryName: templateCategories[t.category].name
    }));
  },

  /**
   * Get featured/recommended templates for new users
   */
  getFeatured() {
    // Return a curated selection of beginner-friendly templates
    const featuredIds = [
      "cs-ticket-response",
      "cr-code-review",
      "cw-blog-post",
      "sm-meeting-notes",
      "bs-email-professional"
    ];
    return featuredIds
      .map(id => getTemplateById(id))
      .filter((t): t is PromptTemplate => t !== undefined)
      .map(t => ({
        ...t,
        categoryName: templateCategories[t.category].name
      }));
  },

  /**
   * Import a template into user's prompts
   */
  async importTemplate(
    templateId: string, 
    userId: string, 
    workspaceId: number,
    customName?: string
  ): Promise<TemplateImportResult> {
    const template = getTemplateById(templateId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    try {
      const db = await getDb();
      
      const promptId = uuidv4();
      const versionId = uuidv4();

      // Create the prompt
      await db!.insert(prompts).values({
        id: promptId,
        name: customName || template.name,
        description: template.description,
        content: template.content,
        tags: template.tags,
        userId: userId,
        organizationId: String(workspaceId),
        isPublic: false,
        isTemplate: false
      });

      // Create initial version
      await db!.insert(promptVersions).values({
        id: versionId,
        promptId: promptId,
        version: 1,
        content: template.content,
        changeMessage: `Imported from template: ${template.name}`,
        createdBy: userId
      });

      return { success: true, promptId: promptId as any };
    } catch (error) {
      console.error("Error importing template:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to import template" 
      };
    }
  },

  /**
   * Get template statistics
   */
  getStats() {
    const byCategory = Object.keys(templateCategories).map(cat => ({
      category: cat,
      name: templateCategories[cat as TemplateCategory].name,
      count: promptTemplates.filter(t => t.category === cat).length
    }));

    const byDifficulty = {
      beginner: promptTemplates.filter(t => t.difficulty === "beginner").length,
      intermediate: promptTemplates.filter(t => t.difficulty === "intermediate").length,
      advanced: promptTemplates.filter(t => t.difficulty === "advanced").length
    };

    return {
      total: promptTemplates.length,
      byCategory,
      byDifficulty,
      categories: Object.keys(templateCategories).length
    };
  }
};
