#!/bin/bash
set -euo pipefail

cat <<'EOF'
At the start of this session, surface pending operational follow-ups so they don't get lost between sessions.

Call mcp__github__list_issues with:
  - owner: "mosteligibleapp"
  - repo: "eliterank"
  - state: "open"
  - labels: ["claude-followup"]

If there are open issues:
  - List each one as: "<title> (#<number>, opened <relative-age>) — <html_url>"
  - Group by label if multiple labels are present (e.g. "sentry", "supabase", "vercel").
  - Do NOT take action on them. Just surface them so the user can decide what to triage.

If there are no open issues with that label:
  - Reply with a single short line: "No pending follow-ups."

Run this check before doing anything else the user asks for.
EOF
