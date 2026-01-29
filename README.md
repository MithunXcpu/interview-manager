# Interview Manager 📋

A comprehensive interview scheduling and management tool for hiring teams. Track candidates, schedule interviews, and manage your hiring pipeline.

## Features

- **Dashboard** - Overview of all interviews and candidates
- **Interview scheduling** - Easy calendar-based scheduling
- **Candidate tracking** - Keep track of all applicants
- **Team collaboration** - Share interview feedback

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Authentication**: Clerk (optional, supports demo mode)
- **AI Integration**: Anthropic Claude API
- **Styling**: Tailwind CSS
- **Database**: Supabase

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables (copy from .env.example)
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key (optional)
- `CLERK_SECRET_KEY` - Clerk secret key (optional)
- `ANTHROPIC_API_KEY` - For AI features

**Note**: The app works in demo mode without Clerk configuration.

## Project Structure

```
src/
├── app/           # Next.js app router pages
├── components/    # Reusable UI components
├── lib/           # Utilities and API clients
└── contexts/      # React context providers
```

## Deployment

Deployed on Vercel. Push to main branch for automatic deployment.
