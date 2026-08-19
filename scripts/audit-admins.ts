/**
 * Security audit: list every admin account and recent signups so you can spot
 * unauthorized admins created before the access-control hotfix.
 *
 * Run against the target DB (uses .env DATABASE_URI):
 *   pnpm tsx --env-file=.env scripts/audit-admins.ts
 *
 * Read-only: it does NOT modify or delete anything. To disable a suspicious
 * account, use the admin panel or add --disable=<email> (see bottom).
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config })

  const admins = await payload.find({
    collection: 'users',
    where: { accountType: { equals: 'admin' } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    sort: '-createdAt',
  })

  console.log(`\n=== ADMIN ACCOUNTS (${admins.totalDocs}) ===`)
  for (const u of admins.docs as any[]) {
    console.log(
      [
        `email=${u.email}`,
        `name=${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
        `active=${u.isActive}`,
        `verified=${u._verified ?? 'n/a'}`,
        `created=${u.createdAt}`,
        `id=${u.id}`,
      ].join('  |  '),
    )
  }

  // Recent signups across all types — an intruder may have made a non-admin
  // account first, or self-registered as admin via the API.
  const recent = await payload.find({
    collection: 'users',
    limit: 30,
    depth: 0,
    overrideAccess: true,
    sort: '-createdAt',
  })

  console.log(`\n=== 30 MOST RECENT SIGNUPS ===`)
  for (const u of recent.docs as any[]) {
    console.log(
      `${u.createdAt}  ${String(u.accountType).padEnd(7)}  ${u.email}  (id=${u.id})`,
    )
  }

  console.log(
    `\nReview the admin list above. Any admin you do not recognise should be ` +
      `disabled (uncheck isActive) or deleted from the Payload admin panel.\n`,
  )

  process.exit(0)
}

main().catch((err) => {
  console.error('Audit failed:', err)
  process.exit(1)
})
