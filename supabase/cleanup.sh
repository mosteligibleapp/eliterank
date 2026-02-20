#!/bin/bash
# =============================================================================
# EliteRank Database Cleanup Script
# =============================================================================
# This script:
# 1. Archives old migrations
# 2. Sets up the new consolidated baseline
# 3. Applies scale-prep optimizations
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
MIGRATIONS_NEW_DIR="$SCRIPT_DIR/migrations_new"
ARCHIVE_DIR="$SCRIPT_DIR/migrations_archive"

echo "==================================="
echo "EliteRank Database Cleanup"
echo "==================================="
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Error: supabase CLI not found. Install it first."
    exit 1
fi

# Check if linked
if ! supabase projects list &> /dev/null; then
    echo "Error: Not logged in to Supabase. Run 'supabase login' first."
    exit 1
fi

echo "Step 1: Archive old migrations..."
echo "---------------------------------"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# Move old migrations to archive (preserve for history)
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR)" ]; then
    mv "$MIGRATIONS_DIR"/*.sql "$ARCHIVE_DIR/" 2>/dev/null || true
    echo "✓ Moved $(ls -1 $ARCHIVE_DIR/*.sql 2>/dev/null | wc -l | tr -d ' ') migrations to archive"
else
    echo "✓ No migrations to archive"
fi

echo ""
echo "Step 2: Set up consolidated baseline..."
echo "---------------------------------------"

# Copy new migrations to migrations folder
cp "$MIGRATIONS_NEW_DIR/001_consolidated_schema.sql" "$MIGRATIONS_DIR/"
cp "$MIGRATIONS_NEW_DIR/002_seed_data.sql" "$MIGRATIONS_DIR/"
cp "$MIGRATIONS_NEW_DIR/003_scale_prep.sql" "$MIGRATIONS_DIR/"

echo "✓ Copied consolidated schema"
echo "✓ Copied seed data"
echo "✓ Copied scale prep migration"

echo ""
echo "Step 3: Apply scale prep to remote database..."
echo "-----------------------------------------------"
echo ""
echo "⚠️  IMPORTANT: This will apply the scale prep migration to your production database."
echo "    The migration only ADDs new tables/indexes - it does NOT delete any data."
echo ""
read -p "Do you want to proceed? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Applying scale prep migration..."
    supabase db push
    echo ""
    echo "✓ Scale prep migration applied"
else
    echo "Skipped. You can apply later with: supabase db push"
fi

echo ""
echo "==================================="
echo "Cleanup Complete!"
echo "==================================="
echo ""
echo "Summary:"
echo "  - Old migrations archived to: $ARCHIVE_DIR"
echo "  - New baseline: 001_consolidated_schema.sql"
echo "  - Scale prep: 003_scale_prep.sql"
echo ""
echo "New features available:"
echo "  - mv_leaderboard: Materialized view for fast leaderboards"
echo "  - vote_aggregates: Real-time vote counters"
echo "  - archived_votes: Storage for completed competition votes"
echo "  - db_stats: View for monitoring database health"
echo ""
echo "Next steps:"
echo "  1. Enable pg_cron in Supabase Dashboard > Database > Extensions"
echo "  2. Schedule cron jobs (see 003_scale_prep.sql bottom)"
echo "  3. Update app to use mv_leaderboard for public leaderboards"
echo ""
