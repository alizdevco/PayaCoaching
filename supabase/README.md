# Supabase local development

## Prerequisites

1. **Docker Desktop** (or Podman) — required for `supabase start`
2. **Supabase account access** — required for `supabase link`

## One-time setup

```bash
# 1. Log in (opens browser) — or set SUPABASE_ACCESS_TOKEN in your shell
npm run supabase login

# 2. Link to the remote project
npm run supabase:link

# 3. Start the local stack (API at http://127.0.0.1:54321, Studio at http://127.0.0.1:54323)
npm run supabase:start
```

Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the frontend.

For local-only frontend work against the local stack, use the values from `npm run supabase:status` after `supabase:start`.

## Common commands

| Command | Description |
| --- | --- |
| `npm run supabase:status` | Show local URLs and keys |
| `npm run supabase:stop` | Stop local containers |
| `npx supabase db reset` | Reapply migrations + seed locally |

## Remote project

- **Project ref:** `vvachhhrxiscivcwbutm`
- Edge Function secrets (`KAVENEGAR_*`, `LIARA_*`, `SUPABASE_SERVICE_ROLE_KEY`) are set via Supabase Dashboard or `supabase secrets set` — never in `.env` committed to git.
