```
 ███╗   ███╗███████╗███╗   ███╗ ██████╗ 
 ████╗ ████║██╔════╝████╗ ████║██╔═══██╗
 ██╔████╔██║█████╗  ██╔████╔██║██║   ██║
 ██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║
 ██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝
 ╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝ 
```

# Memo — a Notion-style note-taking app, built entirely by AI agents.

## About

Memo is the product being built during the [Software Factory](https://software-factory.dev) build-in-public sprint (April 13–25, 2026). The goal: ship a functional, polished note-taking app in two weeks — without a single line of human-written code.

Every line of code in this repository — every PR, every commit, every migration — is written by AI agents using [Ona](https://ona.com). Humans provide intent and direction (what to build, feature priorities, design decisions). Agents handle everything else: architecture, implementation, testing, code review, and deployment.

The repo is public so anyone can follow along, inspect the code, and see how an AI-driven software development lifecycle works in practice. The live app is at [memo.software-factory.dev](https://memo.software-factory.dev).

## Live streams

The build process is streamed live daily during the sprint.

- **Schedule:** weekdays, 5 PM BST / 12 PM ET / 9 AM PT
- **Week 1:** April 13–17 · **Week 2:** April 21–25
- **Where to watch:** [YouTube (@ona_hq)](https://www.youtube.com/@ona_hq), [X (@ona_hq)](https://x.com/ona_hq), [X (@swfactory_dev)](https://x.com/swfactory_dev)

Past streams are available on the [YouTube channel](https://www.youtube.com/@ona_hq).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Lexical](https://lexical.dev/) (rich text editor)
- [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime)
- [Sentry](https://sentry.io/) (error tracking)
- [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) (testing)
- Deployed on [Vercel](https://vercel.com/)

## Getting started

[![Run in Ona](https://ona.com/run-in-ona.svg)](https://app.ona.com/#https://github.com/gitpod-io/memo)

The fastest way to run Memo is in an [Ona](https://ona.com). Click the badge above, or:

1. [Add this repository to an Ona project](https://ona.com/docs/ona/create-first-project)
2. Configure the required [**project secrets**](https://ona.com/docs/ona/projects/project-secrets#project-secrets) (see below)
3. Open the environment — dependencies install automatically and the dev server starts on port 3000

## Running the software factory (local Docker sandboxes)

The automations in `.agents/automations/` run `devin-cli` inside one persistent [Docker Sandbox](https://docs.docker.com/ai/sandboxes/) (`sbx`), scheduled by a small local runner.

```bash
brew install docker/tap/sbx && sbx login
sbx secret set github --command 'gh auth token'
sbx policy init balanced
sbx policy allow network app.devin.ai,api.devin.ai,server.codeium.com,unleash.codeium.com,static.devin.ai
sbx create shell . --name factory-shell -t docker/sandbox-templates:devin-docker --clone
sbx exec -u root factory-shell npm i -g pnpm@10.32.1
```

Devin login (once). `sbx`'s own `devin` wrapper deletes real credentials, so log in on the host with throwaway dirs and copy the file in:

```bash
mkdir -p /tmp/dl/{home,data,config,cache}
HOME=/tmp/dl/home XDG_DATA_HOME=/tmp/dl/data XDG_CONFIG_HOME=/tmp/dl/config XDG_CACHE_HOME=/tmp/dl/cache \
  devin auth login --force-manual-token-flow
sbx exec factory-shell mkdir -p /home/agent/.local/share/devin
sbx cp /tmp/dl/data/devin/credentials.toml factory-shell:/home/agent/.local/share/devin/credentials.toml
sbx exec -u root factory-shell chown agent:agent /home/agent/.local/share/devin/credentials.toml
rm -rf /tmp/dl
```

Rebuild the sandbox from the saved snapshot (deps, Playwright image and the Devin login included, so keep it private):

```bash
sbx template save factory-shell memo-factory:ready      # refresh the snapshot
sbx rm --force factory-shell
sbx create shell . --name factory-shell -t memo-factory:ready --pull never --clone
node scripts/factory/factory.mjs prepare                # sync + time the sandbox
```

Then:

```bash
node scripts/factory/factory.mjs list                  # show automations
node scripts/factory/factory.mjs run feature-planner   # run one once
TZ=UTC node scripts/factory/factory.mjs daemon         # cron + PR-event scheduler
```

Dashboard: the daemon serves http://127.0.0.1:4600 (`FACTORY_PORT` to change), showing the current run and queue, recent runs with log tails, open issues by status label, open PRs with check state, and each automation's next run. `node scripts/factory/factory.mjs dashboard` serves it read-only, with nothing scheduled.

All runs share the `factory-shell` sandbox (private in-sandbox clone of the repo, host tree untouched) and run one at a time. Logs: `.factory/logs/`. Needs `gh` authenticated on the host for PR-event polling. Sentry/Slack automations need those tools available to the agent inside the sandbox.

## Running fully locally (offline)

Needs Docker (or Colima) and pnpm. Internet is only required once, to install deps and pull the Supabase images; after that everything runs offline (fonts are bundled from npm, Sentry is off without a DSN).

```bash
pnpm install
pnpm exec supabase start --exclude imgproxy,edge-runtime,logflare,vector,studio,mailpit   # applies supabase/migrations
pnpm exec supabase status   # copy the API URL, Publishable and Secret keys
```

Create `.env.local` (git-ignored):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Publishable key>
SUPABASE_SECRET_KEY=<Secret key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then `pnpm dev` and open http://localhost:3000. Email confirmation is disabled locally, so sign-up works without a mail server. Stop the database with `pnpm exec supabase stop`.

### Required project secrets

Set these in your Ona project settings under **Secrets**:

| Secret | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `SUPABASE_SECRET_KEY` | Supabase service role key |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional — leave empty to disable) |
| `SENTRY_DSN` | Sentry server-side DSN (optional) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source maps (optional) |
| `SENTRY_ORG` | Sentry organization slug (optional) |
| `SENTRY_PROJECT` | Sentry project slug (optional) |

Without Supabase secrets, the app starts but auth and data features won't work.

## Project links

- **Live app:** [memo.software-factory.dev](https://memo.software-factory.dev)
- **Landing page:** [software-factory.dev](https://software-factory.dev)
- **Background agents:** [background-agents.com](https://background-agents.com)
- **Ona:** [ona.com](https://ona.com)

---

Built with [Ona](https://ona.com)
