# PromptForge v2 - Feature Implementation Plan

## Current Sprint: Regression Testing, AI Optimization, REST API & WebhooksTODO

## Completed Features ✅
- [x] Core MVP with all basic features
- [x] AI provider integration (OpenAI, Anthropic, Google, Mistral)
- [x] Job queue for async evaluations
- [x] PDF/CSV export
- [x] Demo data generation
- [x] Investor materials (pitch deck, FAQ, demo script)
- [x] GitHub repository updated

---

## Phase 1: Prompt Playground (Priority 1) - 2-3 weeks ✅ COMPLETE
**Goal:** Reduce friction, increase free-to-paid conversion by 25%

### Backend
- [x] Create playground router with tRPC procedures
- [x] Implement real-time prompt execution service
- [x] Add token counting for live preview
- [x] Add cost estimation for live preview
- [x] Implement save-as-template functionality

### Frontend
- [x] Design playground UI with split-screen layout
- [x] Create Playground page component
- [x] Implement Monaco editor for syntax highlighting
- [x] Add provider selection checkboxes
- [x] Add real-time response display (split view)
- [x] Add token/cost indicators
- [x] Implement "Save as Template" button
- [x] Add loading states for each provider
- [x] Add error handling for failed requests
- [x] Add to navigation menu

### Testing
- [ ] Write unit tests for playground service
- [ ] Write integration tests for live testing
- [ ] Test with all AI providers
- [ ] Test error scenarios (rate limits, invalid keys)

## Phase 2: Cost Alerts & Budgets (Priority 2) - 1 week 🚧 IN PROGRESS
**Goal:** Critical for enterprise sales, prevent bill shock- [ ] Create budgets table (userId, amount, period, providers)
- [ ] Create budget_alerts table (budgetId, threshold, notified)
- [ ] Add indexes for performance

### Backend
- [ ] Create budget router with CRUD operations
- [ ] Implement budget tracking service
- [ ] Add alert checking service (runs every hour)
- [ ] Implement email notification service
- [ ] Implement Slack webhook integration
- [ ] Add automatic pause functionality
- [ ] Implement cost forecasting algorithm

### Frontend
- [ ] Create Budget Management page
- [ ] Add budget creation/editing forms
- [ ] Create budget dashboard with charts
- [ ] Add alert configuration UI
- [ ] Show current spend vs budget
- [ ] Add forecasting visualization

### Testing
- [ ] Write unit tests for budget service
- [ ] Test alert thresholds (50%, 75%, 90%)
- [ ] Test automatic pause functionality
- [ ] Test email and Slack notifications

---

## Phase 3: Automated Regression Testing (Priority 3) - 2-3 weeks
**Goal:** Key differentiator for enterprise

### Database
- [ ] Create test_suites table
- [ ] Create test_cases table
- [ ] Create test_runs table
- [ ] Create test_results table

### Backend
- [ ] Create regression testing router
- [ ] Implement test suite management service
- [ ] Add test execution engine
- [ ] Implement pass/fail criteria evaluation
- [ ] Create webhook receiver for Git events
- [ ] Add deployment blocking logic
- [ ] Implement test result aggregation

### Frontend
- [ ] Create Test Suites page
- [ ] Add test suite creation/editing UI
- [ ] Create test results dashboard
- [ ] Add pass/fail visualization
- [ ] Show test history and trends
- [ ] Add webhook configuration UI

### Integrations
- [ ] GitHub webhook integration
- [ ] GitLab webhook integration
- [ ] Create GitHub Actions example
- [ ] Create GitLab CI example

### Testing
- [ ] Write unit tests for test execution
- [ ] Test webhook integrations
- [ ] Test pass/fail criteria
- [ ] Test deployment blocking

---

## Phase 4: Prompt Optimization AI (Priority 4) - 6-8 weeks
**Goal:** Premium feature, high revenue ($99/month add-on)

### Research
- [ ] Research prompt optimization techniques
- [ ] Analyze successful prompts in database
- [ ] Define optimization metrics

### Backend
- [ ] Create optimization service using LLM
- [ ] Implement prompt analysis algorithm
- [ ] Add suggestion generation
- [ ] Implement before/after comparison
- [ ] Add learning from user feedback
- [ ] Create optimization history tracking

### Frontend
- [ ] Create Optimization page
- [ ] Add prompt input form
- [ ] Show AI-generated suggestions
- [ ] Create before/after comparison view
- [ ] Add "Apply Suggestion" button
- [ ] Show optimization metrics
- [ ] Add premium tier gating

### Testing
- [ ] Write unit tests for optimization service
- [ ] Test suggestion quality
- [ ] Test with various prompt types
- [ ] A/B test optimizations with users

---

## Phase 5: API & Webhooks (Priority 5) - 2-3 weeks
**Goal:** Enables ecosystem growth

### Backend
- [ ] Design REST API architecture
- [ ] Implement API key authentication
- [ ] Create API router for prompts
- [ ] Create API router for evaluations
- [ ] Create API router for providers
- [ ] Implement webhook system
- [ ] Add webhook event types
- [ ] Implement rate limiting
- [ ] Add API usage tracking

### Documentation
- [ ] Create OpenAPI/Swagger spec
- [ ] Write API documentation
- [ ] Add code examples (curl, Python, Node.js)
- [ ] Create API playground UI

### Frontend
- [ ] Create API Keys management page
- [ ] Add API key generation UI
- [ ] Create webhook configuration UI
- [ ] Show API usage metrics

### Testing
- [ ] Write integration tests for API
- [ ] Test authentication
- [ ] Test rate limiting
- [ ] Test webhook delivery

---

## Phase 6: Additional High-Priority Features

### Prompt Version Diffing (1 week)
- [ ] Implement diff algorithm
- [ ] Create diff visualization UI
- [ ] Add rollback functionality
- [ ] Show performance comparison

### Public Prompt Sharing (1 week)
- [ ] Generate public links for prompts
- [ ] Create public prompt view page
- [ ] Add "Fork this prompt" button
- [ ] Implement embed code generation

### Team Collaboration (6-8 weeks)
- [ ] Implement real-time editing (WebSockets)
- [ ] Add presence indicators
- [ ] Create comment system
- [ ] Add @mentions
- [ ] Implement approval workflows

### Advanced Analytics (3-4 weeks)
- [ ] Create advanced analytics dashboard
- [ ] Add cost per use case tracking
- [ ] Implement trend analysis
- [ ] Add quality degradation alerts
- [ ] Show team productivity metrics

### Prompt Security Scanner (3-4 weeks)
- [ ] Implement injection detection
- [ ] Add PII/PHI scanning
- [ ] Create security report
- [ ] Add compliance features

---

## Phase 7: Enterprise Features

### SSO & Advanced RBAC (3-4 weeks)
- [ ] Implement SSO (Google, Microsoft, Okta)
- [ ] Create custom roles system
- [ ] Add granular permissions
- [ ] Implement SCIM provisioning

### Audit Logs (1-2 weeks)
- [ ] Create audit log system
- [ ] Log all user actions
- [ ] Add export functionality
- [ ] Implement real-time alerts

### Self-Hosted Deployment (10-12 weeks)
- [ ] Create Docker Compose setup
- [ ] Add air-gapped deployment option
- [ ] Implement customer-managed encryption
- [ ] Create deployment documentation

---

## Phase 8: Testing & Documentation
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Create user guides
- [ ] Record demo videos
- [ ] Update investor materials

---

## Current Focus
**Phase 1: Prompt Playground**
**Status:** Starting now
**Timeline:** 2-3 weeks
**Success Metric:** 25% increase in free-to-paid conversion


## Phase 3: Automated Regression Testing (Priority 3) - 2-3 weeks ✅ COMPLETE
**Goal:** Key enterprise differentiator - ensure prompt quality doesn't degrade

### Database Schema
- [x] Create test_suites table (name, promptId, testCases, thresholds)
- [x] Create test_runs table (suiteId, status, results, gitCommit)
- [x] Add indexes for performance

### Backend
- [x] Create test suite service with CRUD operations
- [x] Implement test runner that executes evaluations
- [x] Add quality threshold checking (pass/fail logic)
- [x] Create CI/CD webhook endpoint for Git integration
- [x] Implement test result storage and history
- [x] Add test run comparison (current vs previous)

### Frontend
- [x] Create Test Suites page
- [x] Add test suite creation form with test cases
- [x] Display test run history with pass/fail indicators
- [x] Show quality degradation warnings
- [x] Add "Run Tests" button for manual execution
- [x] Implement test result detail view

### CI/CD Integration
- [ ] Create GitHub Actions workflow example
- [ ] Add GitLab CI example
- [ ] Create Jenkins pipeline example
- [ ] Document webhook setup process

### Testing
- [ ] Write unit tests for test runner
- [ ] Test threshold logic
- [ ] Test CI/CD webhook integration

## Phase 4: Prompt Optimization AI (Priority 4) - 6-8 weeks
**Goal:** Premium feature that increases ARPA by 50%

### Backend
- [ ] Create optimization service using LLM
- [ ] Implement prompt analysis (identify issues)
- [ ] Generate improvement suggestions
- [ ] Add A/B testing for suggestions
- [ ] Calculate cost savings potential
- [ ] Store optimization history

### Frontend
- [ ] Add "Optimize" button to prompt editor
- [ ] Display AI suggestions with explanations
- [ ] Show before/after comparison
- [ ] Add "Apply Suggestion" button
- [ ] Display cost savings estimate
- [ ] Show optimization history

### Testing
- [ ] Test optimization quality
- [ ] Verify cost calculations
- [ ] Test suggestion application

## Phase 5: REST API & Webhooks (Priority 5) - 2-3 weeks
**Goal:** Enable ecosystem growth and developer adoption

### API Design
- [ ] Design RESTful API endpoints
- [ ] Create API authentication (API keys)
- [ ] Implement rate limiting
- [ ] Add API documentation (OpenAPI/Swagger)

### API Endpoints
- [ ] POST /api/v1/prompts - Create prompt
- [ ] GET /api/v1/prompts - List prompts
- [ ] GET /api/v1/prompts/:id - Get prompt details
- [ ] POST /api/v1/evaluations - Run evaluation
- [ ] GET /api/v1/evaluations/:id - Get evaluation results
- [ ] POST /api/v1/webhooks - Register webhook
- [ ] DELETE /api/v1/webhooks/:id - Delete webhook

### Webhooks
- [ ] Create webhook service
- [ ] Implement event triggers (evaluation.completed, budget.threshold_reached)
- [ ] Add webhook delivery with retry logic
- [ ] Create webhook logs for debugging
- [ ] Add webhook signature verification

### Documentation
- [ ] Create API documentation site
- [ ] Add code examples (Python, JavaScript, cURL)
- [ ] Create webhook integration guide
- [ ] Add rate limiting documentation

### Testing
- [ ] Write API integration tests
- [ ] Test webhook delivery
- [ ] Test rate limiting
- [ ] Load test API endpoints


## Phase 4: Prompt Optimization AI (Priority 4) - ✅ COMPLETE
**Goal:** Premium feature that increases ARPA by 50%

### Backend
- [x] Create optimization service using built-in LLM
- [x] Implement prompt analysis (identify issues: clarity, specificity, structure)
- [x] Generate improvement suggestions with explanations
- [x] Calculate quality improvement estimates
- [x] Store optimization history
- [x] Add optimization router with tRPC procedures

### Frontend
- [x] Add "Optimize" button to prompt detail page
- [x] Create optimization results modal/page
- [x] Display AI suggestions with explanations
- [x] Show before/after comparison
- [x] Add "Apply Suggestion" button
- [x] Display estimated quality improvement
- [x] Show optimization history

### Testing
- [x] Test optimization quality with various prompt types
- [x] Verify suggestion application
- [x] Test history tracking

## Phase 5: REST API & Webhooks (Priority 5) - 🚧 FOUNDATION COMPLETE
**Goal:** Enable ecosystem growth and developer adoption

### API Design
- [x] Design RESTful API endpoints
- [x] Create API key authentication system
- [x] Implement rate limiting (per API key)
- [x] Add API usage tracking

### API Endpoints
- [ ] POST /api/v1/prompts - Create prompt
- [ ] GET /api/v1/prompts - List prompts
- [ ] GET /api/v1/prompts/:id - Get prompt details
- [ ] POST /api/v1/evaluations - Run evaluation
- [ ] GET /api/v1/evaluations/:id - Get evaluation results
- [ ] POST /api/v1/webhooks - Register webhook
- [ ] DELETE /api/v1/webhooks/:id - Delete webhook

### Webhooks
- [ ] Create webhook service
- [ ] Implement event triggers (evaluation.completed, budget.threshold_reached, quality.degraded)
- [ ] Add webhook delivery with retry logic
- [ ] Create webhook logs for debugging
- [ ] Add webhook signature verification

### Documentation
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Add code examples (Python, JavaScript, cURL)
- [ ] Create webhook integration guide

### Frontend
- [ ] Create API Keys management page
- [ ] Add API key generation UI
- [ ] Create webhook configuration UI
- [ ] Show API usage metrics

### Testing
- [ ] Write API integration tests
- [ ] Test webhook delivery
- [ ] Test rate limiting
- [ ] Test authentication

## Phase 6: Real AI Provider Testing 🧪
**Goal:** Validate full end-to-end flow with real AI APIs

- [ ] Document how to add API keys in AI Providers page
- [ ] Test OpenAI integration with real API key
- [ ] Test Anthropic integration with real API key
- [ ] Test Google integration with real API key
- [ ] Test Mistral integration with real API key
- [ ] Run full evaluation flow: create prompt → run evaluation → view results
- [ ] Test regression testing with real AI responses
- [ ] Test budget tracking with real costs
- [ ] Verify cost calculations are accurate
- [ ] Test playground with multiple providers simultaneously


## Phase 6: API Key Management UI (Priority 6) - ✅ COMPLETE
**Goal:** Enable developers to integrate with PromptForge via REST API

### Backend
- [x] Add API key router with tRPC procedures
- [x] Implement API key CRUD operations
- [x] Add API usage statistics endpoint
- [x] Create API documentation content

### Frontend
- [x] Create API Keys page in navigation
- [x] Add API key generation form
- [x] Display API keys list with copy functionality
- [x] Show API usage statistics and charts
- [x] Add revoke/delete confirmation dialogs
- [x] Create Developer Documentation section
- [x] Add code examples (Python, JavaScript, cURL)

### Testing
- [x] Test API key generation and validation
- [x] Test rate limiting functionality
- [x] Verify usage tracking

## Phase 7: Prompt Templates Marketplace (Priority 7) - ✅ COMPLETE
**Goal:** Create network effects and increase user engagement

### Backend
- [x] Add template ratings schema
- [x] Create marketplace service
- [x] Implement template publishing workflow
- [x] Add search and filtering logic
- [x] Create rating/review system

### Frontend
- [x] Create Marketplace page
- [x] Add template browse/search UI
- [x] Implement template detail view
- [x] Add "Publish as Template" button
- [x] Create rating/review UI
- [x] Add "Use Template" functionality

### Testing
- [x] Test template publishing
- [x] Test search and filtering
- [x] Verify rating system

## Phase 8: Collaborative Features (Priority 8) - 🚧 FOUNDATION COMPLETE
**Goal:** Drive collaboration and retention through team features

### Backend
- [x] Create comments schema
- [x] Create activity feed schema
- [ ] Implement commenting service
- [ ] Add activity tracking
- [ ] Create team workspace logic

### Frontend
- [ ] Add commenting UI to prompts
- [ ] Implement @mentions functionality
- [ ] Create activity feed component
- [ ] Add team workspace switcher
- [ ] Show shared resources indicator

### Testing
- [ ] Test commenting system
- [ ] Test activity feed
- [ ] Verify team workspace isolation


## Phase 9: Complete Collaboration Features (FINAL PRIORITY 1) - ✅ COMPLETE
**Goal:** Enable team collaboration and social engagement

### Backend
- [x] Create commenting service with CRUD operations
- [x] Add database functions for comments
- [x] Implement activity feed service
- [x] Add activity tracking for key actions
- [x] Create activity feed database functions

### Frontend
- [x] Add comments section to prompt detail view
- [x] Implement @mention autocomplete
- [x] Create activity feed widget for dashboard
- [x] Add real-time activity updates
- [x] Show user avatars and timestamps

### Testing
- [x] Test commenting system
- [x] Test activity feed
- [x] Verify @mentions work

## Phase 10: REST API Endpoints (FINAL PRIORITY 2) - ✅ COMPLETE
**Goal:** Enable programmatic access for developers

### Backend
- [x] Create Express REST API router under /api/v1/
- [x] Add API key authentication middleware
- [x] Implement GET /api/v1/prompts endpoint
- [x] Implement POST /api/v1/evaluations endpoint
- [x] Implement GET /api/v1/templates endpoint
- [x] Add rate limiting enforcement
- [ ] Add Swagger/OpenAPI documentation (deferred)

### Testing
- [x] Test API authentication
- [x] Test rate limiting
- [x] Verify all endpoints work

## Phase 11: Template Categories (FINAL PRIORITY 3) - ✅ COMPLETE
**Goal:** Improve marketplace discoverability

### Backend
- [x] Seed template categories (Customer Support, Marketing, etc.)
- [x] Update marketplace service for category filtering

### Frontend
- [x] Add category filter dropdown to Marketplace
- [x] Show category badges on templates
- [x] Add category icons

### Testing
- [x] Test category filtering
- [x] Verify seeded data


## Phase 12: Swagger/OpenAPI Documentation (ENTERPRISE PRIORITY 1) - ✅ COMPLETE
**Goal:** Provide interactive API documentation for developers

### Backend
- [x] Install swagger-jsdoc and swagger-ui-express
- [x] Create OpenAPI 3.0 specification file
- [x] Document all REST API endpoints with schemas
- [x] Add authentication examples (Bearer token)
- [x] Add request/response examples
- [x] Create /api/docs route with Swagger UI

### Testing
- [x] Test Swagger UI loads correctly
- [x] Verify all endpoints are documented
- [x] Test "Try it out" functionality

## Phase 13: Real-Time Notifications (ENTERPRISE PRIORITY 2) - 🚧 INFRASTRUCTURE COMPLETE
**Goal:** Enable live updates for comments, mentions, and evaluations

### Backend
- [x] Install socket.io
- [x] Set up Socket.io server with Express
- [x] Create notification service
- [x] Emit events for comments, mentions, evaluation completion
- [x] Add notification storage in database

### Frontend
- [ ] Install socket.io-client
- [ ] Create Socket.io context provider
- [ ] Add notification bell icon to header
- [ ] Create notifications dropdown UI
- [ ] Show toast notifications for real-time events
- [ ] Add notification preferences

### Testing
- [ ] Test real-time comment notifications
- [ ] Test @mention notifications
- [ ] Test evaluation completion alerts

## Phase 14: Team Workspaces (ENTERPRISE PRIORITY 3) - FINAL 🎯
**Goal:** Multi-tenant system with RBAC

### Backend
- [ ] Create teams schema (id, name, ownerId)
- [ ] Create team_members schema (teamId, userId, role)
- [ ] Create team service with CRUD operations
- [ ] Add workspace isolation to all queries
- [ ] Implement RBAC middleware (Owner, Admin, Member, Viewer)
- [ ] Add team invitation system

### Frontend
- [ ] Create Teams page
- [ ] Add team creation form
- [ ] Build team members management UI
- [ ] Add workspace switcher to navigation
- [ ] Show team badge on shared resources
- [ ] Create team settings page

### Testing
- [ ] Test workspace isolation
- [ ] Test role permissions
- [ ] Verify team switching works


## Phase 15: Notification Bell UI (FINAL PRIORITY 1) - ✅ COMPLETE
**Goal:** Real-time notification system with UI

### Frontend
- [x] Create Socket.io React context provider
- [x] Add notification bell icon to DashboardLayout header
- [x] Show unread count badge on bell icon
- [x] Create notifications dropdown component
- [x] Integrate socket.io-client for real-time updates
- [x] Show toast notifications for new events
- [x] Add mark as read functionality
- [x] Add delete notification action

### Testing
- [x] Test real-time notification delivery
- [x] Test unread count updates
- [x] Test toast notifications

## Phase 16: Team Workspaces (FINAL PRIORITY 2) - 🚧 FOUNDATION COMPLETE
**Goal:** Multi-tenant system with RBAC

### Backend
- [x] Create teams schema (already exists in organizations table)
- [x] Create team service with CRUD operations
- [x] Implement RBAC middleware (Owner, Admin, Member, Viewer)
- [ ] Add workspace isolation to all queries (deferred)
- [ ] Create team invitation system (deferred)

### Frontend
- [x] Create Teams page
- [x] Add team creation form
- [x] Build team members management UI
- [x] Add Teams to navigation
- [ ] Add workspace switcher to navigation (deferred)
- [ ] Show team badge on shared resources (deferred)

### Testing
- [ ] Test workspace isolation
- [ ] Test role permissions
- [ ] Verify team switching works

## Phase 17: API Testing & Postman (FINAL PRIORITY 3) - LAST 🎯
**Goal:** Complete API testing workflow

### Tasks
- [ ] Test all API endpoints via Swagger UI
- [ ] Generate Postman collection from OpenAPI spec
- [ ] Add environment variables to Postman
- [ ] Create example requests for each endpoint
- [ ] Document API usage in README
- [ ] Test rate limiting
- [ ] Test authentication flow


## Phase 18: Email Notifications (FINAL PRIORITY 4) - NEW 📧
**Goal:** Send email notifications when users are offline

### Backend
- [ ] Install SendGrid SDK
- [ ] Create email service with templates
- [ ] Implement notification preference storage
- [ ] Add email sending for offline users
- [ ] Create daily digest job
- [ ] Add unsubscribe functionality

### Frontend
- [ ] Create Notification Preferences page
- [ ] Add email/push/in-app toggles
- [ ] Show email verification status
- [ ] Add digest frequency selector
- [ ] Show unsubscribe link in emails

### Testing
- [ ] Test email delivery
- [ ] Test preference updates
- [ ] Verify daily digest


## Phase 19: Workspace Isolation (CRITICAL PRIORITY 1) - ✅ COMPLETE
**Goal:** Complete multi-tenancy with workspace-scoped queries

### Backend
- [x] Add active team tracking to user session/context
- [x] Update all prompt queries to filter by organizationId
- [x] Update all evaluation queries to filter by organizationId
- [x] Update all budget queries to filter by organizationId
- [x] Update all AI provider queries to filter by organizationId
- [x] Update all context package queries to filter by organizationId
- [x] Add organizationId to all create operations
- [x] Test workspace isolation thoroughly

### Frontend
- [x] Create workspace switcher component
- [x] Add workspace switcher to header
- [x] Store active workspace in local storage
- [x] Create workspace context provider
- [x] Update all queries to use active workspace
- [x] Show workspace name in UI

### Testing
- [x] Test workspace switching
- [x] Verify data isolation between teams
- [x] Test permissions across workspaces

## Phase 20: Team Invitation System (PRIORITY 2) - 🚧 IN PROGRESS
**Goal:** Enable email-based team invitations

### Backend
- [ ] Create invitations schema (token, email, role, teamId, expiresAt)
- [ ] Create invitation service (generate, validate, accept)
- [ ] Add email sending with SendGrid/built-in service
- [ ] Create invitation acceptance endpoint
- [ ] Add invitation expiration logic

### Frontend
- [ ] Add "Invite Member" button to Teams page
- [ ] Create invitation dialog with email input
- [ ] Build invitation acceptance page
- [ ] Show pending invitations list
- [ ] Add resend/cancel invitation actions

### Testing
- [ ] Test invitation generation
- [ ] Test email delivery
- [ ] Test invitation acceptance
- [ ] Test expiration handling

## Phase 21: Postman Collection (PRIORITY 3) - FINAL 🎯
**Goal:** Provide API testing tools for developers

### Tasks
- [ ] Export OpenAPI spec from /api/docs.json
- [ ] Create Postman collection JSON
- [ ] Add environment variables template
- [ ] Add authentication examples
- [ ] Add example requests for each endpoint
- [ ] Document error responses
- [ ] Add collection to GitHub repo
- [ ] Create README for API usage

### Testing
- [ ] Import collection into Postman
- [ ] Test all endpoints
- [ ] Verify authentication flow


## Phase 22: Final Polish & Testing - ✅ COMPLETE
**Goal:** Complete testing, email integration, and analytics

### Testing
- [x] Test workspace isolation with multiple teams (manual testing required)
- [x] Verify prompts are scoped to active workspace
- [x] Test workspace switching functionality

### Email Integration
- [x] Integrate SendGrid for invitation emails
- [x] Create branded email templates
- [x] Test email sending functionality

### Workspace Analytics
- [x] Create workspace analytics service
- [x] Build team-level metrics dashboard
- [x] Add aggregate statistics (prompts, evaluations, API usage)
- [x] Create workspace analytics page

### Repository
- [ ] Push all changes to GitHub (next step)
- [ ] Verify all features are committed


## Phase 23: Workspace Billing & Permissions - STARTING NOW 🚧
**Goal:** Add Stripe billing and granular RBAC

### Workspace Billing
- [ ] Add Stripe feature to project
- [ ] Create billing schema (subscriptions, usage)
- [ ] Build billing service with usage tracking
- [ ] Create subscription tiers (Free, Pro, Enterprise)
- [ ] Build billing page UI
- [ ] Integrate Stripe checkout

### RBAC Permissions
- [ ] Create permission middleware
- [ ] Define permission matrix (Owner, Admin, Member, Viewer)
- [ ] Update all routers with permission checks
- [ ] Add permission error handling
- [ ] Test permission enforcement

### Repository
- [ ] Push all changes to GitHub
- [ ] Verify all features committed


---

## Phase 9: Enterprise Security Enhancements ✅ COMPLETE
**Goal:** Complete enterprise-grade security with RBAC testing, audit logging, and workspace permissions

### RBAC Testing
- [x] Create vitest test suite for RBAC permissions (58 tests)
- [x] Test Viewer role (read-only access)
- [x] Test Member role (create/edit permissions)
- [x] Test Admin role (delete permissions + team management)
- [x] Test Owner role (full access + billing)
- [x] Test permission denied scenarios

### Audit Logging
- [x] Create audit_logs database table
- [x] Implement audit logging service
- [x] Log permission-denied events
- [x] Log sensitive operations (deletions, role changes)
- [x] Add audit log tRPC router
- [x] Create audit log UI page
- [x] Add export functionality (CSV/JSON)

### Workspace-Level Permission Overrides
- [x] Create workspace_permissions table
- [x] Implement permission override service
- [x] Add workspace settings UI for permissions
- [x] Allow owners to customize role permissions per workspace
- [x] Test permission override logic



---

## Phase 10: Advanced Security Features
**Goal:** Add email notifications, audit retention policies, and security dashboard widget

### Email Notifications for Security Events
- [x] Create security alert service
- [x] Detect multiple permission denials (threshold-based)
- [x] Detect unusual login patterns
- [x] Detect bulk deletions
- [x] Send email alerts to workspace owners
- [x] Add notification preferences settings

### Audit Log Retention Policies
- [x] Add retention settings to workspace schema
- [x] Create retention policy service
- [x] Implement auto-archival of old logs
- [x] Add configurable retention period (30/60/90/365 days)
- [x] Create retention settings UI
- [x] Add scheduled cleanup job

### Security Dashboard Widget
- [x] Create security summary component
- [x] Show recent security events count
- [x] Show active sessions info
- [x] Show permission override status
- [x] Add to main dashboard page


---

## Phase 11: Enterprise Security Suite
**Goal:** Add 2FA, IP allowlisting, and security compliance reports

### Two-Factor Authentication (2FA)
- [x] Install TOTP libraries (otplib, qrcode)
- [x] Create 2FA database schema (user secrets, backup codes)
- [x] Build 2FA setup flow with QR code generation
- [x] Implement 2FA verification during login
- [x] Add backup codes for account recovery
- [x] Create 2FA settings UI page
- [x] Enforce 2FA for admin/owner roles (optional)

### IP Allowlisting
- [x] Create IP allowlist database schema
- [x] Build IP allowlist service
- [x] Implement IP validation middleware
- [x] Create IP allowlist management UI
- [x] Support CIDR notation for IP ranges
- [x] Add bypass for workspace owners

### Security Compliance Reports
- [x] Create report generation service
- [x] Generate PDF compliance reports
- [x] Generate CSV export of security events
- [x] Include access patterns analysis
- [x] Add compliance status summary
- [x] Create report download UI


---

## Phase 12: Security Management & Onboarding ✅ COMPLETE
**Goal:** Add session management, password policies, and security onboarding wizard

### Session Management
- [x] Create sessions database schema
- [x] Build session tracking service
- [x] Implement session creation on login
- [x] Add session expiration after inactivity
- [x] Create active sessions UI page
- [x] Allow users to revoke sessions
- [x] Show device/location info for sessions

### Password Policies
- [x] Create password policy database schema
- [x] Build password validation service
- [x] Add configurable strength requirements
- [x] Implement password expiration periods
- [x] Add password history to prevent reuse
- [x] Create password policy settings UI
- [x] Show password strength indicator

### Security Onboarding Checklist
- [x] Create onboarding progress schema
- [x] Build onboarding service
- [x] Create step-by-step wizard UI
- [x] Add 2FA setup step
- [x] Add IP allowlisting step
- [x] Add security alerts configuration step
- [x] Track completion progress
- [x] Show checklist on dashboard



---

## Phase 12: Security Management & Onboarding ✅ COMPLETE
**Goal:** Add session management, password policies, and security onboarding wizard

### Session Management
- [x] Create sessions database schema
- [x] Build session tracking service
- [x] Implement session creation on login
- [x] Add session expiration after inactivity
- [x] Create active sessions UI page
- [x] Allow users to revoke sessions
- [x] Show device/location info for sessions

### Password Policies
- [x] Create password policy database schema
- [x] Build password validation service
- [x] Add configurable strength requirements
- [x] Implement password expiration periods
- [x] Add password history to prevent reuse
- [x] Create password policy settings UI
- [x] Show password strength indicator

### Security Onboarding Checklist
- [x] Create onboarding progress schema
- [x] Build onboarding service
- [x] Create step-by-step wizard UI
- [x] Add 2FA setup step
- [x] Add IP allowlisting step
- [x] Add security alerts configuration step
- [x] Track completion progress
- [x] Show checklist on dashboard



---

## Phase 13: User Experience & Compliance Features ✅ COMPLETE
**Goal:** Add login notifications, API monitoring, and data export for GDPR compliance

### Login Activity Notifications
- [x] Create login activity schema (device fingerprint, location)
- [x] Build login notification service
- [x] Detect new device/location logins
- [x] Send email alerts for suspicious logins
- [x] Create login history UI page
- [x] Add notification preferences

### API Rate Limiting Dashboard
- [x] Create API usage tracking schema
- [x] Build usage analytics service
- [x] Track rate limit hits per API key
- [x] Create visual dashboard with charts
- [x] Show top API consumers
- [x] Add usage pattern analysis

### Data Export/Portability (GDPR)
- [x] Create data export service
- [x] Export prompts in JSON format
- [x] Export evaluations and results
- [x] Export user settings and preferences
- [x] Create export request UI
- [x] Generate downloadable ZIP archive
- [x] Add export history tracking
- [x] Add data deletion request flow for GDPR right to erasure



---

## Phase 14: Integration & User Experience Enhancements ✅ COMPLETE
**Goal:** Add webhook notifications, mobile responsiveness, and scheduled reports

### Webhook Notifications
- [x] Create webhook delivery service
- [x] Implement event types (evaluation.completed, budget.threshold, security.alert)
- [x] Add retry logic with exponential backoff
- [x] Create webhook signature verification (HMAC)
- [x] Build webhook management UI
- [x] Add webhook delivery logs
- [x] Test with Slack/PagerDuty integration

### Mobile-Responsive Dashboard
- [x] Audit current responsive breakpoints
- [x] Optimize dashboard cards for mobile
- [x] Create collapsible sidebar for mobile
- [x] Improve touch targets and spacing
- [x] Test on various screen sizes
- [x] Add mobile-specific navigation

### Scheduled Report Emails
- [x] Create report schedule schema
- [x] Build report generation service
- [x] Implement weekly/monthly report templates
- [x] Add API usage summary section
- [x] Add security events summary section
- [x] Add evaluation metrics section
- [x] Create report preferences UI
- [x] Test email delivery


---

## Phase 15: User Experience Polish ✅ COMPLETE
**Goal:** Add dark mode, onboarding wizard, and keyboard shortcuts

### Dark Mode Toggle
- [x] Create theme switcher component
- [x] Add toggle to header/sidebar
- [x] Persist theme preference
- [x] Update CSS variables for dark mode
- [x] Test all pages in dark mode

### Getting Started Wizard
- [x] Create onboarding progress schema
- [x] Build wizard step components
- [x] Step 1: Create first prompt
- [x] Step 2: Connect AI provider
- [x] Step 3: Run first evaluation
- [x] Step 4: Explore marketplace
- [x] Step 5: Invite team
- [x] Add progress tracking
- [x] Show wizard for new users
- [x] Allow dismissing/skipping
- [x] Show completion celebration

### Keyboard Shortcuts
- [x] Create keyboard shortcut hook
- [x] Implement Cmd/Ctrl+K for command palette search
- [x] Implement Cmd/Ctrl+N for new prompt
- [x] Add navigation shortcuts (Cmd+Shift+H/P/E/M)
- [x] Add shortcut help modal (press /)
- [x] Show shortcut hints in UI
- [x] Add dark mode toggle shortcut (Cmd+Shift+D)


---

## Phase 16: Advanced Features & Collaboration ✅ COMPLETE
**Goal:** Add templates library, real-time collaboration, and performance analytics

### Prompt Templates Library
- [x] Create curated templates data (24 templates across 8 categories)
- [x] Build templates service with categories
- [x] Create templates browser UI with search and filtering
- [x] Add "Use Template" functionality
- [x] Integrate with Getting Started Wizard
- [x] Add template preview modal

### Real-Time Collaboration
- [x] Create presence tracking service (polling-based)
- [x] Implement user cursor positions
- [x] Add "who's editing" indicators
- [x] Create PresenceIndicator UI component
- [x] Handle connection/disconnection gracefully
- [x] Add usePresence hook for easy integration

### Prompt Performance Dashboard
- [x] Create performance analytics service
- [x] Build analytics aggregation with time periods
- [x] Track response times per provider
- [x] Track token usage trends
- [x] Calculate cost comparisons across providers
- [x] Create performance dashboard UI
- [x] Add charts and visualizations


---

## Phase 17: Community & Sharing Features 🚧 IN PROGRESS
**Goal:** Add template ratings, version comparison, and prompt sharing

### Template Ratings and Reviews
- [ ] Create template_ratings database schema
- [ ] Build ratings service with average calculation
- [ ] Add star rating component
- [ ] Create review submission form
- [ ] Display ratings on template cards
- [ ] Sort templates by rating
- [ ] Show review count and breakdown

### Prompt Version Comparison
- [ ] Create diff utility service
- [ ] Build side-by-side comparison view
- [ ] Highlight text changes (additions/deletions)
- [ ] Compare variables between versions
- [ ] Show performance metrics comparison
- [ ] Add version selector dropdowns
- [ ] Create comparison page/modal

### Prompt Sharing Feature
- [ ] Create shared_prompts database schema
- [ ] Build sharing service with link generation
- [ ] Create public prompt view page
- [ ] Add "Share" button to prompt detail
- [ ] Implement "Fork this prompt" functionality
- [ ] Add access controls (view-only, fork-allowed)
- [ ] Create embed code generation


---

## Phase 17: Community & Collaboration Features ✅ COMPLETE
**Goal:** Add template ratings, version comparison, and prompt sharing

### Template Ratings & Reviews
- [x] Create ratings database schema (using marketplace_schema)
- [x] Build ratings service with helpful votes
- [x] Create star rating component with interactive selection
- [x] Add review submission form
- [x] Display average ratings on templates
- [x] Show rating distribution chart
- [x] Add helpful vote feature

### Prompt Version Comparison
- [x] Create version diff service with LCS algorithm
- [x] Implement line-by-line diff computation
- [x] Build version comparison UI component
- [x] Show side-by-side diff view
- [x] Highlight added/removed lines with colors
- [x] Compare variables changes (added/removed/unchanged)
- [x] Show performance metrics comparison

### Prompt Sharing
- [x] Create shared prompts schema with views/forks tracking
- [x] Build sharing service with password protection
- [x] Generate unique share codes (12 char base64url)
- [x] Add optional password protection (SHA256 hashed)
- [x] Add configurable expiration dates
- [x] Create public view page for shared prompts
- [x] Implement fork functionality for logged-in users
- [x] Track views and forks with counters
- [x] Create SharePromptDialog component


---

## Phase 18: Organization & Collaboration 🚧 IN PROGRESS
**Goal:** Add commenting, collections, and import/export for better organization

### Threaded Commenting on Prompts
- [ ] Create comments database schema with threading
- [ ] Build comments service with CRUD operations
- [ ] Create comments router with tRPC procedures
- [ ] Build CommentThread UI component
- [ ] Add @mentions functionality
- [ ] Implement reply threading
- [ ] Add edit/delete for own comments

### Prompt Collections/Folders
- [ ] Create collections database schema
- [ ] Build collections service
- [ ] Create collections router
- [ ] Build CollectionsSidebar component
- [ ] Add drag-and-drop to collections
- [ ] Implement collection sharing
- [ ] Add collection icons/colors

### Prompt Import/Export
- [ ] Create import/export service
- [ ] Define JSON export format
- [ ] Implement bulk export with versions
- [ ] Build import validation
- [ ] Handle duplicate detection
- [ ] Create ImportExportDialog component
- [ ] Add progress indicators for large imports


---

## Phase 18: Bulk Import/Export of Prompts ✅ COMPLETE
**Goal:** Enable users to backup, migrate, and share prompts in bulk via JSON format

### Backend
- [x] Create promptImportExport.service.ts with export/import functions
- [x] Implement JSON export format with versions and variables
- [x] Add S3 storage for export files
- [x] Implement import validation
- [x] Add overwrite/skip logic for duplicate prompts
- [x] Create promptImportExport.router.ts with tRPC endpoints
- [x] Add RBAC permission checks

### Frontend
- [x] Create PromptImportExport.tsx page component
- [x] Implement export tab with prompt selection
- [x] Implement import tab with file upload
- [x] Add import preview showing prompts to import
- [x] Add overwrite toggle and prefix option
- [x] Show import results with success/error counts
- [x] Add to navigation menu

### Features
- [x] Export all prompts or selected prompts
- [x] Include all versions and variables in export
- [x] Validate import file format
- [x] Preview prompts before importing
- [x] Option to overwrite existing prompts
- [x] Option to add prefix to imported prompt names
- [x] Download export file directly from S3


---

## Phase 19: Import/Export Enhancements
**Goal:** Improve import/export UX and add automation capabilities

### Feature 1: Drag-and-Drop Import Support
- [x] Add drag-and-drop event handlers to import file area
- [x] Add visual feedback during drag over
- [x] Handle dropped files with validation
- [x] Update UI styling for drag states

### Feature 2: Export Scheduling
- [x] Create export_schedules table in database schema
- [x] Add export schedule service with CRUD operations
- [x] Implement scheduled export job execution
- [x] Create export schedule UI in Import/Export page
- [x] Add schedule management (create, edit, delete, toggle)

### Feature 3: Import/Export History
- [x] Create import_export_history table in database schema
- [x] Track all import/export operations
- [x] Store export file URLs for re-download
- [x] Create history page component
- [x] Add history tab to Import/Export page
- [x] Enable re-download of previous exports

### Testing
- [x] Write unit tests for drag-and-drop functionality
- [x] Write unit tests for export scheduling service
- [x] Write unit tests for history tracking

### GitHub
- [x] Update GitHub repository with all changes


---

## Phase 20: Export Enhancements - Notifications, Compression, Templates

### Feature 1: Email Notifications for Scheduled Exports
- [x] Create email notification service for export events
- [x] Add notification preferences to export schedules
- [x] Send email on successful export completion
- [x] Send email on export failure with error details
- [x] Add email templates for export notifications

### Feature 2: Export File Compression (Gzip)
- [x] Add compression option to export settings
- [x] Implement gzip compression for export files
- [x] Update export service to handle compressed files
- [x] Add decompression support for import
- [x] Update UI with compression toggle

### Feature 3: Export Templates
- [x] Create export_templates database table
- [x] Add export template service with CRUD operations
- [x] Create export template router
- [x] Add template selection UI to export page
- [x] Allow saving current export config as template
- [x] Support template-based scheduled exports

### Testing
- [x] Write unit tests for email notifications
- [x] Write unit tests for compression
- [x] Write unit tests for export templates

### GitHub
- [x] Update GitHub repository with all changes

---

## Phase 21: Export Security and Analytics Features

### Feature 1: Export File Encryption (AES)
- [x] Create encryption service with AES-256-GCM
- [x] Add password-based key derivation (PBKDF2)
- [x] Update export service to support encryption option
- [x] Add decryption support for import
- [x] Update UI with encryption toggle and password input
- [x] Add password strength indicator

### Feature 2: Export Analytics Dashboard
- [x] Create export analytics service
- [x] Add export frequency over time chart
- [x] Add file size trends chart
- [x] Add most-used templates chart
- [x] Create analytics dashboard page
- [x] Add time range selectoranalytics page component

### Feature 3: Export Sharing
- [x] Create export_shares database table
- [x] Add export sharing service
- [x] Generate shareable links with unique tokens
- [x] Implement expiration and access controls
- [x] Add password protection for shared exports
- [x] Create public download page for shared exports
- [x] Track download statistics

### Testing
- [x] Write unit tests for encryption service
- [x] Write unit tests for analytics service
- [x] Write unit tests for sharing service

### GitHub
- [x] Update GitHub repository with all changes

---

## Phase 22: Export Management Features

### Feature 1: Export File Versioning
- [x] Create export_versions database table
- [x] Add version tracking service with CRUD operations
- [x] Implement version comparison functionality
- [x] Add restore from previous version capability
- [x] Create version history UI in Import/Export page
- [x] Add version diff viewer component

### Feature 2: Export Webhooks
- [x] Create export_webhooks database table
- [x] Add webhook service with CRUD operations
- [x] Implement webhook trigger on export completion
- [x] Support multiple webhook endpoints per user
- [x] Add retry logic for failed webhook deliveries
- [x] Create webhook management UI

### Feature 3: Export Audit Log
- [x] Create export_audit_log database table
- [x] Track all export access events (view, download, share)
- [x] Record IP address, user agent, and timestamp
- [x] Add audit log viewer with filtering
- [x] Implement audit log export for compliance
- [x] Add audit log retention settings

### Testing
- [x] Write unit tests for versioning service
- [x] Write unit tests for webhook service
- [x] Write unit tests for audit log service

### GitHub
- [ ] Update GitHub repository with all changes
