import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const categoriesData = [
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

  const categoryMap: Record<string, number> = {}

  for (const cat of categoriesData) {
    const existing = await payload.find({
      collection: 'subject-categories',
      where: {
        or: [
          { name: { equals: cat.name } },
          { slug: { equals: cat.slug } }
        ]
      },
      limit: 1,
      req,
    })

    if (existing.docs.length > 0) {
      categoryMap[cat.name] = existing.docs[0].id as number
    } else {
      const created = await payload.create({
        collection: 'subject-categories',
        data: cat,
        req,
      })
      categoryMap[cat.name] = created.id as number
    }
  }

  const subjectsData = [
    { name: 'Mathematics', categoryName: 'Mathematics' },
    { name: 'English', categoryName: 'Language Arts / English' },
  ]

  for (const sub of subjectsData) {
    const catId = categoryMap[sub.categoryName]
    if (!catId) continue

    const existing = await payload.find({
      collection: 'subjects',
      where: { name: { equals: sub.name } },
      limit: 1,
      req,
    })

    if (existing.docs.length === 0) {
      await payload.create({
        collection: 'subjects',
        data: {
          name: sub.name,
          category: catId,
        },
        req,
      })
    }
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Down migration: optionally delete the seeded subjects and categories
  const categoriesData = [
    'mathematics',
    'language-arts-english',
    'science',
    'social-studies',
    'world-languages',
    'computing',
    'arts',
    'physical-education-health',
    'test-prep',
    'other',
  ]

  await payload.delete({
    collection: 'subjects',
    where: {
      name: { in: ['Mathematics', 'English'] },
    },
    req,
  })

  await payload.delete({
    collection: 'subject-categories',
    where: {
      slug: { in: categoriesData },
    },
    req,
  })
}
