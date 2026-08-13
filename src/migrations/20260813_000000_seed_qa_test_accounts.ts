import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

/**
 * Seeds QA test accounts for pre-launch testing:
 *   - 1 tutor   (auto-approved so tutor flows are testable end-to-end)
 *   - 1 parent
 *   - 1 standalone student
 *   - 1 managed child student under the parent
 *
 * Uses the Payload local API so passwords are hashed and the normal
 * afterChange side-effects run (wallet creation, tutor-profile creation).
 * Idempotent: each account is skipped if a user with that email already exists.
 */

const TUTOR = {
  firstName: 'Tutor',
  lastName: 'One',
  email: 'tutor1@tutorcourt.com',
  password: 'Tutor1Pass!',
  phoneNumber: '+2348000000001',
}

const PARENT = {
  firstName: 'Parent',
  lastName: 'One',
  email: 'parent1@tutorcourt.com',
  password: 'Parent1Pass!',
  phoneNumber: '+2348000000002',
}

const STUDENT = {
  firstName: 'Student',
  lastName: 'One',
  email: 'student1@tutorcourt.com',
  password: 'Student1Pass!',
  phoneNumber: '+2348000000003',
}

const CHILD = {
  firstName: 'Child',
  lastName: 'One',
  email: 'child.one@tutorcourt.local',
  password: 'Child1Pass!',
  gradeLevel: undefined as string | undefined,
}

const COMMON = {
  country: 'Nigeria',
  timezone: 'Africa/Lagos',
  isActive: true,
  hasCompletedOnboarding: true,
  _verified: true,
}

async function findUserByEmail(payload: any, email: string, req: any) {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    req,
  })
  return docs[0] || null
}

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  // --- Tutor ---
  let tutor = await findUserByEmail(payload, TUTOR.email, req)
  if (!tutor) {
    tutor = await payload.create({
      collection: 'users',
      data: { ...COMMON, ...TUTOR, accountType: 'tutor' },
      disableVerificationEmail: true,
      req,
    })
    console.log(`[qa-seed] Tutor created: ${TUTOR.email}`)
  }
  // Auto-approve the tutor profile so tutor flows work without admin review.
  const { docs: profiles } = await payload.find({
    collection: 'tutor-profiles',
    where: { user: { equals: tutor.id } },
    limit: 1,
    req,
  })
  if (profiles[0] && !profiles[0].isApproved) {
    await payload.update({
      collection: 'tutor-profiles',
      id: profiles[0].id,
      data: { isApproved: true },
      req,
    })
    console.log(`[qa-seed] Tutor profile approved: ${TUTOR.email}`)
  }

  // --- Parent ---
  let parent = await findUserByEmail(payload, PARENT.email, req)
  if (!parent) {
    parent = await payload.create({
      collection: 'users',
      data: { ...COMMON, ...PARENT, accountType: 'parent' },
      disableVerificationEmail: true,
      req,
    })
    console.log(`[qa-seed] Parent created: ${PARENT.email}`)
  }

  // --- Standalone student ---
  const existingStudent = await findUserByEmail(payload, STUDENT.email, req)
  if (!existingStudent) {
    await payload.create({
      collection: 'users',
      data: { ...COMMON, ...STUDENT, accountType: 'student' },
      disableVerificationEmail: true,
      req,
    })
    console.log(`[qa-seed] Student created: ${STUDENT.email}`)
  }

  // --- Managed child student under the parent ---
  let childUser = await findUserByEmail(payload, CHILD.email, req)
  if (!childUser) {
    childUser = await payload.create({
      collection: 'users',
      data: {
        ...COMMON,
        firstName: CHILD.firstName,
        lastName: CHILD.lastName,
        email: CHILD.email,
        password: CHILD.password,
        accountType: 'student',
        phoneNumber: PARENT.phoneNumber,
        parent: parent.id,
        isManagedAccount: true,
        parentalConsentGiven: true,
      },
      disableVerificationEmail: true,
      req,
    })
    console.log(`[qa-seed] Child user created: ${CHILD.email}`)
  }

  const { docs: studentRecords } = await payload.find({
    collection: 'students',
    where: { generatedEmail: { equals: CHILD.email } },
    limit: 1,
    req,
  })
  if (studentRecords.length === 0) {
    await payload.create({
      collection: 'students',
      data: {
        user: childUser.id,
        parent: parent.id,
        firstName: CHILD.firstName,
        lastName: CHILD.lastName,
        generatedEmail: CHILD.email,
        generatedPassword: CHILD.password,
        gradeLevel: CHILD.gradeLevel,
      },
      req,
    })
    console.log(`[qa-seed] Child student record created: ${CHILD.email}`)
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({
    collection: 'students',
    where: { generatedEmail: { equals: CHILD.email } },
    req,
  })
  await payload.delete({
    collection: 'users',
    where: {
      email: { in: [TUTOR.email, PARENT.email, STUDENT.email, CHILD.email] },
    },
    req,
  })
}
