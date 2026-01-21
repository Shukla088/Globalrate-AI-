# Globalrate AI - Replit Configuration

## Overview

Globalrate AI is a real-time AI-powered search and chat assistant. The application provides a conversational interface where users can ask questions and receive AI-generated responses with source citations. It features a modern React frontend with a Node.js/Express backend, using PostgreSQL for message persistence and OpenAI for AI capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Animations**: Framer Motion for smooth message animations
- **Markdown**: react-markdown for rendering AI responses

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for production bundling, Vite for development
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with Zod validation

### Data Layer
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod integration for type-safe schemas
- **Schema Location**: `shared/schema.ts` defines the `messages` table
- **Migrations**: Drizzle Kit with `db:push` command

### AI Integration
- **Provider**: OpenAI via Replit AI Integrations
- **Environment Variables**: 
  - `AI_INTEGRATIONS_OPENAI_API_KEY` - API key
  - `AI_INTEGRATIONS_OPENAI_BASE_URL` - Base URL for API calls
- **Features**: Chat completions, optional voice/image generation utilities in `server/replit_integrations/`

### Key Design Decisions

1. **Shared Code Pattern**: Types, schemas, and API route definitions live in `shared/` directory and are imported by both client and server, ensuring type consistency.

2. **Session-Based Chat**: Messages are grouped by `sessionId` (auto-generated UUID if not provided) enabling conversation continuity.

3. **Optimistic UI Updates**: The frontend optimistically adds user messages before API confirmation, providing instant feedback.

4. **Component-First UI**: Uses shadcn/ui components which are copied into the codebase (not installed as dependencies) for full customization control.

## External Dependencies

### Database
- **PostgreSQL**: Required. Connection via `DATABASE_URL` environment variable. Schema includes a `messages` table with session tracking.

### AI Services
- **OpenAI API**: Accessed through Replit AI Integrations. Used for chat completions in the main chat flow.

### Key npm Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Server state management
- `openai`: OpenAI API client
- `zod`: Runtime validation for API inputs/outputs
- `framer-motion`: Animation library
- `react-markdown`: Markdown rendering for AI responses

### Development Tools
- Vite with React plugin for hot module replacement
- Replit-specific plugins for development banners and error overlays