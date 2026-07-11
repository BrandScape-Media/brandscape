# Brandscape — AI-Powered Marketing Automation

End-to-end AI automation platform for marketing agencies. From discovery to delivery.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Hosting**: GitHub Pages (static site)
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **AI Pipeline**: Runpod GPUs (ComfyUI for image/video, LLM for text)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 with TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Auth | Supabase Auth (Google OAuth + Email) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| AI (Text) | Runpod LLM Endpoints |
| AI (Visual) | Runpod ComfyUI Workflows |
| Deployment | GitHub Pages (CI/CD via Actions) |

## Workflow Pipeline

```
Discovery → Research → Ideation → Strategy → Scripts → Shoot Plan → Shooting → Editing
   ↑                                              ↓
   └─────────────── Feedback Loop ────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Supabase account
- GitHub account

### Local Development

```bash
# Clone the repo
git clone https://github.com/your-org/brandscape.git
cd brandscape

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start dev server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase-schema.sql`
3. Enable Google OAuth in Authentication → Providers
4. Set the redirect URL to `https://brandscape.media/auth/callback`
5. Copy the URL and anon key to `.env.local`

### GitHub Pages Deployment

1. Push code to a GitHub repository
2. Go to Settings → Pages
3. Set Source to "GitHub Actions"
4. The deployment workflow (`.github/workflows/deploy.yml`) handles builds automatically

### Build for Production

```bash
npm run build
# Output is in ./dist
```

## Project Structure

```
brandscape/
├── .github/workflows/     # CI/CD deployment
├── public/                # Static assets (fonts, logos)
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/           # React contexts (Auth)
│   ├── data/              # Static data (plans, workflow)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Libraries (Supabase client)
│   ├── pages/             # Page components
│   │   └── dashboard/     # Dashboard pages
│   ├── types/             # TypeScript types
│   ├── App.tsx            # Main app with routing
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles + Tailwind
├── supabase-schema.sql    # Database schema
├── tailwind.config.js     # Tailwind configuration
└── vite.config.ts         # Vite configuration
```

## Pricing Plans

| Feature | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| Price | $299/mo | $799/mo | $1,999/mo |
| Projects | 3 | 15 | Unlimited |
| Generations | 50/mo | 250/mo | Unlimited |
| Revisions | 5 | 20 | Unlimited |
| Priority Support | ✗ | ✓ | ✓ |
| Custom Workflows | ✗ | ✗ | ✓ |

## Roadmap

- [x] Landing page & marketing site
- [x] User authentication (Google + Email)
- [x] Dashboard with project management
- [x] Discovery form & intake workflow
- [x] Workflow pipeline UI
- [x] Pricing page
- [x] Supabase schema
- [ ] Supabase integration (live data)
- [ ] Runpod API integration
- [ ] AI pipeline orchestration
- [ ] ComfyUI workflow integration
- [ ] Real-time generation status
- [ ] Client-accessible media libraries
- [ ] Stripe payment integration
- [ ] Team management & permissions
- [ ] Usage analytics & billing

## License

Private — All rights reserved © 2026 Brandscape
