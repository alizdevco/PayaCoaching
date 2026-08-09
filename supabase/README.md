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
- Edge Function secrets (`SMS_IR_*`, `SEND_SMS_HOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are set via Supabase Dashboard or `supabase secrets set` — never in `.env` committed to git.

## OTP SMS via sms.ir

Supabase Auth generates and validates the OTP. The `send-sms` Edge Function is
registered as the **Send SMS hook**: Auth POSTs the generated code to it as a
signed webhook, and the function relays it to the sms.ir Verify API. sms.ir is
never called from the browser, and the code is never logged.

### Secrets

| Secret | Purpose |
| --- | --- |
| `SMS_IR_API_KEY` | sms.ir API key, sent as the `x-api-key` header |
| `SMS_IR_TEMPLATE_ID` | Verify template id, e.g. `کد تایید شماره همراه: #Code#` |
| `SMS_IR_OTP_PARAM_NAME` | Template parameter that holds the code (`Code`) |
| `SEND_SMS_HOOK_SECRET` | Webhook signing secret shared with Auth, `v1,whsec_<base64>` |

```bash
# Write the four values to a local file that is never committed, then:
npx supabase secrets set --project-ref vvachhhrxiscivcwbutm --env-file ./secrets.env
rm ./secrets.env

npx supabase functions deploy send-sms --project-ref vvachhhrxiscivcwbutm
```

### Auth configuration (Dashboard)

1. **Authentication → Sign In / Providers → Phone** — enable the phone provider.
2. **Authentication → Hooks → Send SMS hook** — enable it, choose *HTTPS*, set
   the URI to `https://vvachhhrxiscivcwbutm.supabase.co/functions/v1/send-sms`,
   and paste the same `SEND_SMS_HOOK_SECRET` value.

With the hook enabled, the built-in SMS provider (Twilio, etc.) is bypassed
entirely, so no provider needs to be configured there.

### Local development

`supabase start` keeps using `[auth.sms.test_otp]` in `config.toml`, so no
sms.ir credentials are needed locally. To exercise the real provider, uncomment
`[auth.hook.send_sms]` in `config.toml`, export the secrets in your shell, and
use a phone number that is not listed under `test_otp`.
