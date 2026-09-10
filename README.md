# UrbanPulse — Smart City Operations Platform

UrbanPulse is a full-stack civic operations platform that connects citizens with municipal authorities to report, track, and resolve urban infrastructure issues. It demonstrates real-world applications of modern web development, role-based access control, AI-assisted triage, and even classic Operating System process scheduling algorithms applied to city maintenance workflows.

## Live Demo

- **Preview:** https://id-preview--6b98ba8b-747f-4113-8fbe-3dfaf4a0312c.lovable.app
- **Published:** https://urban-pulse-beta.lovable.app

## Tech Stack

- **Frontend / Framework:** React 19 + TanStack Start (full-stack SSR/SSG)
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **Backend / Database:** Lovable Cloud (Postgres) with Supabase client
- **Auth:** Supabase Auth with Google OAuth and email/password
- **Maps:** Leaflet + React-Leaflet
- **Charts:** Recharts + Chart.js
- **AI:** Lovable AI Gateway (Gemini 2.5 Flash) for complaint triage
- **Testing:** Vitest

## Key Features

### Citizen Portal
- Report civic issues with GPS location, photos, and descriptions
- Track complaint status in real time
- View proof-of-work (before/after photos or videos) uploaded by staff
- Rate resolved work 1–5 stars with feedback

### Authority / Staff Portal
- Role-based dashboard (admin, department_head, municipal_officer, engineer, contractor, citizen)
- View all complaints with location-based radius filtering (~25 km jurisdiction search)
- Manage work orders and contractor assignments
- Upload before/after proof of work
- Track budgets and departmental spending
- AI-powered complaint triage: auto-suggested category, priority, department, and summary

### OS Process Scheduling Module
- Educational simulation mapping OS CPU scheduling to civic maintenance workers
- Algorithms: FCFS, SJF (non-preemptive), Priority (non-preemptive)
- Interactive Gantt chart, performance metrics, and algorithm comparison
- Import real complaints as processes or load demo data

## Project Structure

```
src/
├── components/        # Reusable UI components (sidebar, shell, charts, maps)
├── hooks/             # Custom React hooks (auth, mobile detection)
├── integrations/      # Supabase client, auth middleware, Lovable integrations
├── lib/               # Business logic (scheduling, triage, utils)
├── routes/            # TanStack file-based routes
│   ├── _authenticated/# Staff/citizen dashboard routes
│   ├── auth.tsx       # Login / register page
│   └── index.tsx      # Landing page
└── styles.css         # Tailwind v4 theme tokens
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   # or: npm install
   ```
3. Copy `.env` variables from your Lovable Cloud project settings
4. Run the dev server:
   ```bash
   bun dev
   # or: npm run dev
   ```

## Default Authority Account

For testing staff features, sign in with:

- **Username:** `sumitkarki07`
- **Password:** `sumit123@`
- **Role:** `admin`

> New sign-ups default to the `citizen` role. Promote users to staff roles via the `user_roles` table in the backend.

## Scripts

| Script | Description |
|--------|-------------|
| `bun dev` / `npm run dev` | Start the development server |
| `bun run build` / `npm run build` | Production build |
| `bun run lint` / `npm run lint` | Run ESLint |
| `bun run format` / `npm run format` | Format with Prettier |
| `bunx vitest run` / `npx vitest run` | Run unit tests |

## License

MIT — built for educational and civic-tech demonstration purposes.
