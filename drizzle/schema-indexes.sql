-- Performance Indexes for PromptForge Database
-- Run these after initial schema creation

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(createdAt);

-- Prompts table indexes
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(userId);
CREATE INDEX IF NOT EXISTS idx_prompts_organization_id ON prompts(organizationId);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(createdAt);
CREATE INDEX IF NOT EXISTS idx_prompts_is_public ON prompts(isPublic);
CREATE INDEX IF NOT EXISTS idx_prompts_is_template ON prompts(isTemplate);
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);

-- Prompt Versions table indexes
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON promptVersions(promptId);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_by ON promptVersions(createdBy);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON promptVersions(createdAt);

-- AI Providers table indexes
CREATE INDEX IF NOT EXISTS idx_ai_providers_user_id ON aiProviders(userId);
CREATE INDEX IF NOT EXISTS idx_ai_providers_organization_id ON aiProviders(organizationId);
CREATE INDEX IF NOT EXISTS idx_ai_providers_provider ON aiProviders(provider);
CREATE INDEX IF NOT EXISTS idx_ai_providers_is_active ON aiProviders(isActive);

-- Context Packages table indexes
CREATE INDEX IF NOT EXISTS idx_context_packages_user_id ON contextPackages(userId);
CREATE INDEX IF NOT EXISTS idx_context_packages_organization_id ON contextPackages(organizationId);
CREATE INDEX IF NOT EXISTS idx_context_packages_is_public ON contextPackages(isPublic);
CREATE INDEX IF NOT EXISTS idx_context_packages_created_at ON contextPackages(createdAt);

-- Evaluations table indexes
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations(userId);
CREATE INDEX IF NOT EXISTS idx_evaluations_prompt_id ON evaluations(promptId);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(createdAt);

-- Evaluation Results table indexes
CREATE INDEX IF NOT EXISTS idx_evaluation_results_evaluation_id ON evaluationResults(evaluationId);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_provider_id ON evaluationResults(providerId);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_created_at ON evaluationResults(createdAt);

-- Analytics Events table indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analyticsEvents(userId);
CREATE INDEX IF NOT EXISTS idx_analytics_events_organization_id ON analyticsEvents(organizationId);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analyticsEvents(eventType);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analyticsEvents(createdAt);

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(ownerId);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(createdAt);

-- Organization Memberships table indexes
CREATE INDEX IF NOT EXISTS idx_org_memberships_organization_id ON organizationMemberships(organizationId);
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON organizationMemberships(userId);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON organizationMemberships(role);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_prompts_user_org ON prompts(userId, organizationId);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_status ON evaluations(userId, status);
CREATE INDEX IF NOT EXISTS idx_analytics_user_type_date ON analyticsEvents(userId, eventType, createdAt);
