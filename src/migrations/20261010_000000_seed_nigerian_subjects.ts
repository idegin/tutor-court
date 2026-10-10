import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

const subjects = [
  { name: 'Further Mathematics', categorySlug: 'mathematics' },
  { name: 'Literature in English', categorySlug: 'language-arts-english' },
  { name: 'Biology', categorySlug: 'science' },
  { name: 'Chemistry', categorySlug: 'science' },
  { name: 'Physics', categorySlug: 'science' },
  { name: 'Agricultural Science', categorySlug: 'science' },
  { name: 'Economics', categorySlug: 'social-studies' },
  { name: 'Government', categorySlug: 'social-studies' },
  { name: 'Commerce', categorySlug: 'social-studies' },
  { name: 'Geography', categorySlug: 'social-studies' },
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const sub of subjects) {
    const existing = await payload.find({
      collection: 'subjects',
      where: { name: { equals: sub.name } },
      limit: 1,
      req,
    })
    if (existing.docs.length > 0) continue

    const category = await payload.find({
      collection: 'subject-categories',
      where: { slug: { equals: sub.categorySlug } },
      limit: 1,
      req,
    })
    if (category.docs.length === 0) continue

    await payload.create({
      collection: 'subjects',
      data: { name: sub.name, category: category.docs[0].id as number },
      req,
    })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({
    collection: 'subjects',
    where: { name: { in: subjects.map((s) => s.name) } },
    req,
  })
}
