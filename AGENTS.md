# AGENTS.md — Interview Manager

## Project overview

Interview Manager is a job search management platform that helps candidates track companies, schedule interviews, and respond to recruiters. It combines CRM-like pipeline tracking with AI-powered email replies and calendar integration.

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + React Icons
- **Auth:** Clerk (optional — works in demo mode without config)
- **Database:** PostgreSQL via Prisma ORM
- **AI:** Anthropic Claude API (email replies, summarization)
- **Integrations:** Gmail API, Google Calendar API
- **Drag & Drop:** @hello-pangea/dnd
- **Deployment:** Vercel

## Setup commands

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Dev server
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Environment variables

```
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Code style

- TypeScript strict mode
- React Server Components where possible, `'use client'` only when needed
- API routes handle all backend logic
- Prisma for all database access
- Zod for input validation
- Use `date-fns` for date formatting

## Architecture

### Page structure
1. `/` — Marketing landing page
2. `/dashboard` — Kanban pipeline board (main interface)
3. `/emails` — Gmail inbox with AI reply generation
4. `/calendar` — Interview calendar view
5. `/settings` — User preferences, availability slots
6. `/onboarding` — Multi-step setup wizard

### Database models
- **User** — Profile, preferences, Clerk ID
- **Company** — Recruiter info, job details, pipeline stage
- **Email** — Synced Gmail messages
- **Interview** — Scheduled interviews, meeting links
- **AvailabilitySlot** — User's available times
- **BookingLink** — Shareable scheduling URLs
- **UserStage** — Custom pipeline stages

### Key features
- Kanban board with drag-and-drop
- Gmail OAuth + email sync
- AI-generated recruiter replies
- Booking link generation (like Calendly)
- Google Calendar integration
- Interview type tracking (Phone, Technical, Onsite, etc.)

## Testing instructions

- Test demo mode (no Clerk config) — should work without auth
- Drag companies between pipeline stages
- Connect Gmail and verify email sync
- Generate AI reply and verify it includes booking link
- Create availability slots and test booking flow
- Verify calendar shows scheduled interviews

## Do not

- Do NOT store Gmail access tokens in plain text
- Do NOT expose Anthropic API key to client
- Do NOT modify pipeline stage order without updating drag logic
- Do NOT bypass Clerk middleware on protected routes
- Do NOT commit `.env` files

## Deployment

```bash
# Deploy to Vercel
npx vercel --prod

# Set environment variables in Vercel dashboard
```

## MCP servers (recommended)

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

## Prompt patterns

```markdown
## Task
[Specific. Include component names, API routes, pipeline stages affected.]

## Background
[Relevant code. Include Prisma schema if touching data models.]

## Do not
[What should NOT be touched. Protect auth, email sync, calendar logic.]
```
