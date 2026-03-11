# EliteRank

## Tech Stack
- **Frontend:** React 18 + Vite (SPA, not Next.js)
- **Backend:** Supabase (auth, DB, edge functions, realtime)
- **Notifications:** OneSignal (email + push + SMS via Twilio)
- **Hosting:** Vercel
- **Twilio phone:** +18666203168

## Styling
- **Use inline styles with the JS theme object** from `src/styles/theme.js`
- Import `colors`, `spacing`, `typography`, `borderRadius`, `transitions` etc. from the theme
- Do NOT use Tailwind utility classes for page components — Tailwind is only configured for the design system showcase
- Define a `styles` object at the top of the file and reference it in JSX via `style={styles.xxx}`
- Follow existing patterns in `src/pages/NotificationsPage.jsx` or `src/pages/PrivacyPage.jsx`

## Project Structure
- `src/pages/` — Page components (lazy-loaded)
- `src/features/` — Feature modules (auth, entry, profile, settings, etc.)
- `src/components/` — Shared components (ui, layout, modals, common)
- `src/styles/theme.js` — Design tokens (colors, spacing, typography, etc.)
- `src/routes/index.jsx` — React Router v6 route definitions
- `src/stores/` — Zustand state management
- `src/contexts/` — React contexts (notifications, etc.)
- `supabase/functions/` — Supabase Edge Functions (Deno/TypeScript)
- `supabase/migrations/` — Database migrations

## Edge Functions
- `send-onesignal-email` — Branded transactional emails via OneSignal
- `send-push-notification` — Push notifications via OneSignal
- `send-nomination-invite` — Orchestrates nomination flow (email + push + in-app)
- `notify-nominator` — Notifies nominator when nominee accepts/declines
- `check-competition-events` — Scheduled: detects competition phase changes
- `create-payment-intent` — Stripe payment intents
- `stripe-webhook` — Stripe webhook handler
- `set-nominee-password` — Password setup during claim flow
- `generate-ai-post` — AI content generation

## Key Conventions
- Edge functions use `serve()` from Deno std, with CORS headers and JSON responses
- Fire-and-forget pattern for non-critical notifications (push, SMS) using `.catch()`
- Supabase service role key for edge function DB access
- Lazy-load all pages with `React.lazy()` + `SuspenseWrapper`
- Use `useNavigate()` for navigation, not `<Link>` for programmatic nav
