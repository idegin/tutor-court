import type { Payload } from 'payload'

/**
 * Seeds reference data that the app needs to function (currently the default
 * subjects). It does NOT create any admin/user account — the first admin is
 * created through Payload's built-in "create first user" screen at /admin.
 *
 * Idempotent: safe to run on every init; it skips anything that already exists.
 */
export async function runProdSeed(payload: Payload): Promise<void> {
  const defaultCategories = [
    { name: 'Mathematics', slug: 'mathematics' },
    { name: 'Language Arts / English', slug: 'language-arts-english' },
    { name: 'Science', slug: 'science' },
    { name: 'Social Studies', slug: 'social-studies' },
    { name: 'World Languages', slug: 'world-languages' },
    { name: 'Computing', slug: 'computing' },
    { name: 'Arts', slug: 'arts' },
    { name: 'Physical Education / Health', slug: 'physical-education-health' },
    { name: 'Test Prep', slug: 'test-prep' },
    { name: 'Other', slug: 'other' },
  ]

  const categoryMap: Record<string, string> = {}

  for (const cat of defaultCategories) {
    try {
      const existing = await payload.find({
        collection: 'subject-categories',
        where: {
          or: [
            { name: { equals: cat.name } },
            { slug: { equals: cat.slug } }
          ]
        },
        limit: 1,
        overrideAccess: true,
      })
      let catId: string
      if (existing.totalDocs === 0) {
        const created = await payload.create({
          collection: 'subject-categories',
          data: cat as any,
          overrideAccess: true,
        })
        catId = String(created.id)
        console.log(`[prod-seed] Subject Category created: ${cat.name}`)
      } else {
        catId = String(existing.docs[0].id)
      }
      categoryMap[cat.name] = catId
    } catch (err) {
      console.error(`[prod-seed] Failed to create subject category "${cat.name}":`, err)
    }
  }

  const defaultSubjects = [
    { name: 'Mathematics', categoryName: 'Mathematics' },
    { name: 'English', categoryName: 'Language Arts / English' },
  ]

  for (const subject of defaultSubjects) {
    try {
      const catId = categoryMap[subject.categoryName]
      if (!catId) continue

      const existing = await payload.find({
        collection: 'subjects',
        where: { name: { equals: subject.name } },
        limit: 1,
        overrideAccess: true,
      })
      if (existing.totalDocs === 0) {
        await payload.create({
          collection: 'subjects',
          data: {
            name: subject.name,
            category: catId,
          } as any,
          overrideAccess: true,
        })
        console.log(`[prod-seed] Subject created: ${subject.name}`)
      }
    } catch (err) {
      console.error(`[prod-seed] Failed to create subject "${subject.name}":`, err)
    }
  }
}
