# PromptForge

> **AI Prompt & Agent Management Platform** - Platform-agnostic prompt testing and evaluation system

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![tRPC](https://img.shields.io/badge/tRPC-11-blue)](https://trpc.io/)

## Overview

PromptForge is a comprehensive platform for managing, testing, and optimizing AI prompts across multiple providers. Built for teams who need to ensure prompt quality, compare costs, and maintain version control.

### Key Features

- **🔄 Platform-Agnostic** - Works with OpenAI, Anthropic, Google, Mistral, and custom providers
- **📊 Comprehensive Evaluations** - Test prompts across providers with detailed metrics (tokens, latency, cost, quality)
- **📝 Version Control** - Track prompt changes with full version history
- **🔐 Secure API Key Management** - Encrypted storage with AES-256-CBC
- **📦 Context Packages** - Reusable context management for prompts
- **📈 Analytics** - Usage tracking and insights
- **👥 Team Collaboration** - Share prompts and evaluations (coming soon)

## Demo

🚀 **Live Demo**: [https://promptforge.manus.space](https://promptforge.manus.space)

![PromptForge Dashboard](https://via.placeholder.com/800x450?text=Dashboard+Screenshot)

## Tech Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **tRPC** - End-to-end type-safe APIs
- **Wouter** - Lightweight routing

### Backend
- **Node.js + Express** - Server runtime
- **tRPC 11** - Type-safe API layer
- **Drizzle ORM** - Type-safe database queries
- **MySQL/TiDB** - Relational database
- **Vitest** - Unit and integration testing

### Infrastructure
- **Manus Hosting** - Serverless deployment
- **Manus OAuth** - Authentication
- **GitHub Actions** - CI/CD (coming soon)

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- MySQL or TiDB database
- API keys for AI providers (optional for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/robertclapp/promptforge.git
cd promptforge

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

```env
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Authentication
JWT_SECRET=your-secret-key
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im

# Encryption
ENCRYPTION_KEY=32-character-encryption-key

# App Configuration
VITE_APP_TITLE=PromptForge
VITE_APP_LOGO=/logo.svg
```

## Architecture

PromptForge follows a modern full-stack architecture:

```
promptforge/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and tRPC client
├── server/                # Express + tRPC backend
│   ├── routers/           # Domain-specific API routers
│   ├── utils/             # Utilities (crypto, transactions)
│   ├── db.ts              # Database queries
│   └── routers.ts         # Main API router
├── drizzle/               # Database schema and migrations
└── tests/                 # Test files
```

## Key Concepts

### Prompts

Prompts are templates with variables that can be tested across different AI providers. Each prompt maintains a version history for tracking changes.

```typescript
const prompt = {
  name: "Customer Support Response",
  content: "You are a helpful assistant. Respond to: {{question}}",
  variables: ["question"],
  tags: ["support", "customer-service"]
};
```

### Evaluations

Evaluations allow you to test prompts with multiple test cases across different AI providers, comparing:
- **Output quality** - Actual responses
- **Tokens used** - Cost tracking
- **Latency** - Response time
- **Cost** - Actual $ per request
- **Quality score** - Optional scoring

### Context Packages

Reusable context that can be attached to prompts, such as product documentation, style guides, or domain knowledge.

## API Documentation

PromptForge uses tRPC for type-safe APIs. All endpoints are automatically typed and validated.

### Example Usage

```typescript
// Client-side
import { trpc } from "@/lib/trpc";

// List prompts
const { data: prompts } = trpc.prompts.list.useQuery({
  search: "customer",
  tags: ["support"]
});

// Create prompt
const createMutation = trpc.prompts.create.useMutation();
await createMutation.mutateAsync({
  name: "New Prompt",
  content: "Template content",
  variables: ["var1", "var2"]
});
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/utils/crypto.test.ts

# Run with coverage
pnpm test:coverage
```

Current test coverage:
- ✅ Crypto utilities (14/14 tests passing)
- 🚧 Database operations (in progress)
- 🚧 API endpoints (in progress)

## Deployment

### Manus Hosting (Recommended)

PromptForge is optimized for Manus hosting with automatic deployment:

1. Create a Manus project
2. Connect your GitHub repository
3. Configure environment variables
4. Deploy automatically on push

### Self-Hosting

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed feature plans.

### Phase 2: Enhanced Evaluation System (Q1 2025)
- Real-time evaluation execution with job queue
- Advanced metrics (BLEU, ROUGE, semantic similarity)
- Results visualization and export

### Phase 3: Team Collaboration (Q2 2025)
- Multi-user organizations
- Role-based access control
- Comments and activity feeds

### Phase 4: AI Agents (Q3 2025)
- Visual agent workflow builder
- Multi-step agent chains
- Agent marketplace

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- TypeScript for all new code
- Follow existing code style
- Write tests for new features
- Update documentation

## Security

- API keys are encrypted with AES-256-CBC
- All database queries use parameterized statements
- Authentication via Manus OAuth
- HTTPS required in production

Found a security vulnerability? Please email security@promptforge.com instead of opening a public issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs.promptforge.com](https://docs.promptforge.com)
- **Issues**: [GitHub Issues](https://github.com/robertclapp/promptforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/robertclapp/promptforge/discussions)
- **Email**: support@promptforge.com

## Acknowledgments

- Built with [Manus](https://manus.im) - AI-powered development platform
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ by the PromptForge team**

[Website](https://promptforge.com) • [Twitter](https://twitter.com/promptforge) • [Discord](https://discord.gg/promptforge)
