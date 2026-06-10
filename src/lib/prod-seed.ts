import type { Payload } from 'payload'

// Runs once on startup when no users are found in the database.
// Safe to call on every boot — all operations are guarded by existence checks.
export async function runProdSeed(payload: Payload): Promise<void> {
  const { totalDocs: userCount } = await payload.count({ collection: 'users' })
  if (userCount > 0) return

  console.log('[prod-seed] No users found — seeding default data...')

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@tutorcourt.com'
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error(
      '[prod-seed] ADMIN_PASSWORD env var is not set. Skipping seed to avoid an insecure default.',
    )
    return
  }

  await payload.create({
    collection: 'users',
    data: {
      email: adminEmail,
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phoneNumber: '+10000000000',
      accountType: 'admin',
      _verified: true,
    },
    disableVerificationEmail: true,
  })
  console.log(`[prod-seed] Admin account created: ${adminEmail}`)

  const defaultSubjects: { name: string; category: string }[] = [
    { name: 'Mathematics', category: 'math' },
    { name: 'English', category: 'language_arts' },
  ]

  for (const subject of defaultSubjects) {
    const existing = await payload.find({
      collection: 'subjects',
      where: { name: { equals: subject.name } },
      limit: 1,
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'subjects', data: subject as any })
      console.log(`[prod-seed] Subject created: ${subject.name}`)
    }
  }

  console.log('[prod-seed] Done.')
}
