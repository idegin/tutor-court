import type { Payload } from 'payload'

export async function runProdSeed(payload: Payload): Promise<void> {
  try {
    const { totalDocs: userCount } = await payload.count({ collection: 'users' })
    if (userCount > 0) {
      console.log('[prod-seed] Users already exist — skipping seed.')
      return
    }

    console.log('[prod-seed] Empty database detected — seeding default data...')

    try {
      await payload.create({
        collection: 'users',
        data: {
          email: 'admin@tutorcourt.com',
          password: 'Superman6625*',
          firstName: 'Super',
          lastName: 'Admin',
          phoneNumber: '+10000000000',
          accountType: 'admin',
          _verified: true,
        },
        overrideAccess: true,
        disableVerificationEmail: true,
      })
      console.log('[prod-seed] Admin account created: admin@tutorcourt.com')
    } catch (err) {
      console.error('[prod-seed] Failed to create admin user:', err)
      return
    }

    const defaultSubjects = [
      { name: 'Mathematics', category: 'math' },
      { name: 'English', category: 'language_arts' },
    ]

    for (const subject of defaultSubjects) {
      try {
        const existing = await payload.find({
          collection: 'subjects',
          where: { name: { equals: subject.name } },
          limit: 1,
        })
        if (existing.totalDocs === 0) {
          await payload.create({ collection: 'subjects', data: subject as any, overrideAccess: true })
          console.log(`[prod-seed] Subject created: ${subject.name}`)
        }
      } catch (err) {
        console.error(`[prod-seed] Failed to create subject "${subject.name}":`, err)
      }
    }

    console.log('[prod-seed] Done.')
  } catch (err) {
    console.error('[prod-seed] Seed aborted with unexpected error:', err)
  }
}
