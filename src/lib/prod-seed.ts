import type { Payload } from 'payload'

/**
 * Seeds reference data that the app needs to function (currently the default
 * subjects). It does NOT create any admin/user account — the first admin is
 * created through Payload's built-in "create first user" screen at /admin.
 *
 * Idempotent: safe to run on every init; it skips anything that already exists.
 */
export async function runProdSeed(payload: Payload): Promise<void> {
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
        overrideAccess: true,
      })
      if (existing.totalDocs === 0) {
        await payload.create({
          collection: 'subjects',
          data: subject as any,
          overrideAccess: true,
        })
        console.log(`[prod-seed] Subject created: ${subject.name}`)
      }
    } catch (err) {
      console.error(`[prod-seed] Failed to create subject "${subject.name}":`, err)
    }
  }
}
