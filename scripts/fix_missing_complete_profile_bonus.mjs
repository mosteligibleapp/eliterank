/**
 * One-time fix script to award missing "complete_profile" bonus votes
 * to contestants who have complete profiles but never received the bonus.
 * 
 * Run with: node scripts/fix_missing_complete_profile_bonus.mjs
 */

const SUPABASE_URL = 'https://jioblcflgpqcfdmzjnto.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPETITION_ID = 'c1c44ae3-6ccf-4470-8c14-ddcc5f021500';

if (!SUPABASE_KEY) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('Usage: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/fix_missing_complete_profile_bonus.mjs');
  process.exit(1);
}

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

async function query(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { headers, ...options });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error: ${res.status} ${text}`);
  }
  return res.json();
}

async function rpc(fn, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC error: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('Fetching contestants and completions...');
  
  // Get complete_profile task
  const tasks = await query(`bonus_vote_tasks?competition_id=eq.${COMPETITION_ID}&task_key=eq.complete_profile`);
  if (tasks.length === 0) {
    console.error('ERROR: complete_profile task not found');
    process.exit(1);
  }
  const taskId = tasks[0].id;
  const votesAwarded = tasks[0].votes_awarded;
  console.log(`Found complete_profile task: ${taskId} (${votesAwarded} votes)`);
  
  // Get all active contestants
  const contestants = await query(`contestants?competition_id=eq.${COMPETITION_ID}&status=eq.active&select=id,name,user_id,email`);
  console.log(`Found ${contestants.length} active contestants`);
  
  // Get existing completions
  const completions = await query(`bonus_vote_completions?task_id=eq.${taskId}&select=contestant_id`);
  const completedSet = new Set(completions.map(c => c.contestant_id));
  console.log(`${completedSet.size} contestants already have the bonus`);
  
  // Get profiles
  const userIds = contestants.filter(c => c.user_id).map(c => c.user_id);
  const profiles = await query(`profiles?id=in.(${userIds.join(',')})&select=id,first_name,bio,city`);
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  
  // Find missing
  const missing = [];
  for (const contestant of contestants) {
    if (completedSet.has(contestant.id)) continue;
    
    const profile = profileMap.get(contestant.user_id);
    if (!profile) continue;
    
    const hasName = !!(profile.first_name);
    const hasBio = !!(profile.bio && profile.bio.length > 0);
    const hasCity = !!(profile.city && profile.city.length > 0);
    
    if (hasName && hasBio && hasCity) {
      missing.push({ contestant, profile });
    }
  }
  
  if (missing.length === 0) {
    console.log('✅ No missing bonuses found!');
    return;
  }
  
  console.log(`\n⚠️  Found ${missing.length} contestants missing the bonus:`);
  for (const { contestant, profile } of missing) {
    console.log(`  - ${contestant.name} (${contestant.email})`);
  }
  
  // Award the bonus
  console.log('\nAwarding bonuses...');
  for (const { contestant, profile } of missing) {
    try {
      const result = await rpc('award_bonus_votes', {
        p_competition_id: COMPETITION_ID,
        p_contestant_id: contestant.id,
        p_user_id: contestant.user_id,
        p_task_key: 'complete_profile'
      });
      
      if (result.success) {
        console.log(`  ✅ ${contestant.name}: Awarded ${votesAwarded} votes`);
      } else if (result.already_completed) {
        console.log(`  ⏭️  ${contestant.name}: Already completed (race condition)`);
      } else {
        console.log(`  ❌ ${contestant.name}: ${result.error}`);
      }
    } catch (err) {
      console.log(`  ❌ ${contestant.name}: ${err.message}`);
    }
  }
  
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
