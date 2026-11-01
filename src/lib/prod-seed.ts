import crypto from 'crypto'
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

  const categoryMap: Record<string, number | string> = {}

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
      let catId: number | string
      if (existing.totalDocs === 0) {
        const created = await payload.create({
          collection: 'subject-categories',
          data: cat as any,
          overrideAccess: true,
        })
        catId = created.id as number | string
        console.log(`[prod-seed] Subject Category created: ${cat.name}`)
      } else {
        catId = existing.docs[0].id as number | string
      }
      categoryMap[cat.name] = catId
    } catch (err) {
      console.error(`[prod-seed] Failed to create subject category "${cat.name}":`, err)
    }
  }

  const defaultSubjects = [
    { name: 'Mathematics', categoryName: 'Mathematics' },
    { name: 'Further Mathematics', categoryName: 'Mathematics' },
    { name: 'English', categoryName: 'Language Arts / English' },
    { name: 'Literature in English', categoryName: 'Language Arts / English' },
    { name: 'Physics', categoryName: 'Science' },
    { name: 'Chemistry', categoryName: 'Science' },
    { name: 'Biology', categoryName: 'Science' },
    { name: 'Agricultural Science', categoryName: 'Science' },
    { name: 'Geography', categoryName: 'Social Studies' },
    { name: 'History', categoryName: 'Social Studies' },
    { name: 'Economics', categoryName: 'Social Studies' },
    { name: 'Government', categoryName: 'Social Studies' },
    { name: 'Commerce', categoryName: 'Social Studies' },
    { name: 'Computer Science', categoryName: 'Computing' },
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

  // Seed the primary admin account. Requires SEED_ADMIN_PASSWORD env var.
  // On conflict (account already exists) it only patches accountType / status
  // so a user-changed password is never overwritten by a redeploy.
  const adminEmail = 'admin@tutorcourt.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD

  if (!adminPassword) {
    console.warn('[prod-seed] SEED_ADMIN_PASSWORD is not set — admin account will NOT be seeded. Set this Fly secret and redeploy.')
  } else {
    try {
      const db = (payload.db as any)
      const pool = db.pool ?? db.drizzle?.session?.client

      // Generate pbkdf2 salt+hash the same way Payload does internally.
      const saltBuf = await new Promise<Buffer>((res, rej) =>
        crypto.randomBytes(32, (err, buf) => (err ? rej(err) : res(buf)))
      )
      const salt = saltBuf.toString('hex')
      const hashRaw = await new Promise<Buffer>((res, rej) =>
        crypto.pbkdf2(adminPassword, salt, 25000, 512, 'sha256', (err, buf) => (err ? rej(err) : res(buf)))
      )
      const hash = hashRaw.toString('hex')

      await pool.query(`
        INSERT INTO users (first_name, last_name, email, account_type, is_active, salt, hash, _verified, updated_at, created_at)
        VALUES ($1, $2, $3, 'admin', true, $4, $5, true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE
          SET account_type = 'admin',
              is_active    = true,
              _verified    = true,
              updated_at   = NOW()
      `, ['TutorCourt', 'Admin', adminEmail, salt, hash])

      console.log(`[prod-seed] Admin account upserted: ${adminEmail}`)
    } catch (err) {
      console.error(`[prod-seed] Failed to seed admin account via raw SQL:`, err)
      // Fallback: if pool is unavailable, at least patch accountType on an existing user.
      try {
        const existing = await payload.find({
          collection: 'users',
          where: { email: { equals: adminEmail } },
          limit: 1,
          overrideAccess: true,
        })
        if (existing.totalDocs > 0) {
          const adminId = existing.docs[0].id as string | number
          await payload.db.drizzle?.execute(
            `UPDATE users SET account_type = 'admin', is_active = true, _verified = true WHERE email = '${adminEmail}'`
          )
          console.log(`[prod-seed] Admin account_type patched via Drizzle fallback for: ${adminEmail} (id=${adminId})`)
        } else {
          console.error(`[prod-seed] Admin user ${adminEmail} does not exist and could not be created — set SEED_ADMIN_PASSWORD`)
        }
      } catch (fallbackErr) {
        console.error(`[prod-seed] Drizzle fallback also failed:`, fallbackErr)
      }
    }
  }
}
