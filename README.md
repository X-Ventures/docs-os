# Docs OS

**Investor-grade data rooms, auto-generated from Google Drive.**

Docs OS transforms any Google Drive folder into a structured, searchable, analytics-tracked data room — deployed as a static site.

## Quick Start

```bash
# 1. Install
cd apps/docs-platform && npm install

# 2. Run locally
npm run dev

# 3. Open
open http://localhost:3000
```

## Add a New Project (2 minutes)

```bash
# Generate from a Google Drive folder
node scripts/generate-project-docs.mjs \
  --drive="DRIVE_FOLDER_ID_OR_URL" \
  --slug="my-project" \
  --visibility="investor"

# Place exported Drive files in:
# content/projects/my-project/raw/

# Re-run to update MDX pages:
node scripts/generate-project-docs.mjs \
  --drive="DRIVE_FOLDER_ID_OR_URL" \
  --slug="my-project"

# Start dev server to preview
npm run dev
```

## Architecture

```
docs-os/
├── apps/
│   └── docs-platform/        # Next.js + Nextra docs site
│       ├── src/
│       │   ├── app/           # App Router layout + API routes
│       │   ├── content/       # MDX pages (auto-generated)
│       │   │   ├── projects/  # One folder per project
│       │   │   └── internal/  # Internal dashboards
│       │   └── components/    # React components
│       └── next.config.mjs
├── content/
│   └── projects/              # Raw data + metadata per project
│       └── [slug]/
│           ├── raw/           # Original Drive exports
│           ├── mdx/           # Converted MDX files
│           ├── assets/        # Images, PDFs
│           └── metadata.json  # Project config
├── scripts/
│   ├── generate-project-docs.mjs   # Ingestion pipeline
│   └── drive-sync.mjs              # Auto-sync watcher
├── netlify.toml
└── README.md
```

## Access Levels

| Level | Who | Access |
|-------|-----|--------|
| **Public** | Anyone | Homepage, project index |
| **Investor** | Token holders | Project data rooms |
| **Internal** | Team | Everything + analytics dashboard |

Share investor links: `https://docs.xventures.de/projects/xlabs?token=INVESTOR_TOKEN`

## Investor Analytics

Track what investors read:
- Page views per document
- Time spent per section
- Scroll depth
- File downloads

Dashboard: `/internal/analytics?token=INTERNAL_TOKEN`

## Drive Auto-Sync

```bash
# Watch all projects for Drive changes
node scripts/drive-sync.mjs

# Custom interval (seconds)
node scripts/drive-sync.mjs --interval=600
```

## Deploy

1. Push to GitHub
2. Connect repo to Netlify
3. Set environment variables in Netlify dashboard
4. Configure DNS: `docs.xventures.de` → Netlify

```bash
# Or deploy via CLI
netlify deploy --prod --dir=apps/docs-platform/out
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `INVESTOR_TOKENS` | Comma-separated investor access tokens |
| `INTERNAL_TOKENS` | Comma-separated internal team tokens |

---

Built by XLabs — powered by Docs OS.
