/**
 * Registers (idempotently) the two scheduled jobs that keep escrow flowing:
 *
 *   - /api/cron/complete-engagements  — auto-releases held escrow for delivered
 *     engagements the booker never released (after a grace window) and past-
 *     endDate engagements that actually ran.
 *   - /api/cron/live-sweep            — ends abandoned live sessions so their
 *     per-session escrow payout fires and rooms close.
 *
 * QStash calls each route and FORWARDS `Authorization: Bearer $CRON_SECRET`
 * (via the `Upstash-Forward-` prefix), which is exactly what the routes check.
 * Each job is created with a fixed `Upstash-Schedule-Id`, so re-running this
 * script UPSERTS (replaces) the schedule instead of creating duplicates.
 *
 * Run:  pnpm setup:crons
 * Needs env:  QSTASH_TOKEN, CRON_SECRET, and CRON_TARGET_BASE_URL (or
 * NEXT_PUBLIC_SERVER_URL) pointing at a PUBLIC https URL (QStash can't reach
 * localhost).
 */

const QSTASH_BASE = 'https://qstash.upstash.io/v2'

const JOBS: { id: string; path: string; cron: string; label: string }[] = [
  {
    id: 'tc-complete-engagements',
    path: '/api/cron/complete-engagements',
    cron: '0 2 * * *',
    label: 'escrow auto-release (daily 02:00 UTC)',
  },
  {
    id: 'tc-live-sweep',
    path: '/api/cron/live-sweep',
    cron: '*/3 * * * *',
    label: 'live-session sweep (every 3 min)',
  },
  {
    id: 'tc-process-payouts',
    path: '/api/cron/process-payouts',
    cron: '*/5 * * * *',
    label: 'tutor payout disbursement + reconciliation (every 5 min)',
  },
]

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) {
    console.error(`✖ Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

/**
 * Create-or-replace a schedule. The destination URL is appended RAW to the path
 * (QStash treats everything after `/v2/schedules/` as the target URL — it must
 * NOT be percent-encoded). `Upstash-Schedule-Id` makes the call idempotent.
 */
async function upsertSchedule(
  job: { id: string; path: string; cron: string },
  base: string,
  cronSecret: string,
  token: string,
): Promise<string> {
  const url = `${base}${job.path}`
  const res = await fetch(`${QSTASH_BASE}/schedules/${url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Upstash-Schedule-Id': job.id,
      'Upstash-Cron': job.cron,
      'Upstash-Method': 'POST',
      // Forwarded verbatim to the destination as its `Authorization` header.
      'Upstash-Forward-Authorization': `Bearer ${cronSecret}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Upsert schedule "${job.id}" (${url}) failed: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json().catch(() => ({}))) as { scheduleId?: string }
  return data.scheduleId || job.id
}

async function main() {
  const token = requireEnv('QSTASH_TOKEN')
  const cronSecret = requireEnv('CRON_SECRET')
  const base = (process.env.CRON_TARGET_BASE_URL || process.env.NEXT_PUBLIC_SERVER_URL || '').replace(/\/$/, '')

  if (!base) {
    console.error('✖ Set CRON_TARGET_BASE_URL (or NEXT_PUBLIC_SERVER_URL) to your public https URL.')
    process.exit(1)
  }
  if (!/^https:\/\//.test(base) || /localhost|127\.0\.0\.1/.test(base)) {
    console.error(`✖ CRON target must be a public https URL (got "${base}"). QStash cannot reach localhost.`)
    process.exit(1)
  }

  console.log(`→ Target base: ${base}`)
  for (const job of JOBS) {
    const id = await upsertSchedule(job, base, cronSecret, token)
    console.log(`✔ ${job.label}\n    ${job.path}  [${job.cron}]  → ${id}`)
  }
  console.log('\nDone. Schedules are live in QStash (re-run any time to update).')
}

main().catch((err) => {
  console.error('✖ setup:crons failed:', err?.message || err)
  process.exit(1)
})
