import { getPayload } from 'payload'
import configPromise from '../../../src/payload.config.js'
import { faker } from '@faker-js/faker'

export async function seedData() {
  const payload = await getPayload({ config: configPromise })

  console.log('Seeding subjects...')
  const subjectsData = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 
    'English', 'History', 'Geography', 'Economics', 'Art'
  ]
  const subjects = []

  for (const subjectName of subjectsData) {
    const existing = await payload.find({
      collection: 'subjects',
      where: { name: { equals: subjectName } },
      limit: 1,
    })

    let subjectId
    if (existing.docs.length > 0) {
      subjectId = existing.docs[0].id
    } else {
      const subject = await payload.create({
        collection: 'subjects',
        data: { name: subjectName },
      })
      subjectId = subject.id
    }
    subjects.push(subjectId)
  }

  console.log('Seeding users and tutor profiles...')
  for (let i = 0; i < 10; i++) {
    const isTutor = faker.datatype.boolean()
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
    const email = faker.internet.email({ firstName, lastName })

    const existingUser = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (existingUser.docs.length > 0) {
      continue
    }

    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password: 'password123',
        firstName,
        lastName,
        accountType: isTutor ? 'tutor' : 'student',
      },
      disableVerificationEmail: true,
    })

    if (isTutor) {
      const existingProfile = await payload.find({
        collection: 'tutor-profiles',
        where: { user: { equals: user.id } },
        limit: 1
      })
      
      // Pick 1-3 random subjects
      const tutorSubjects = faker.helpers.arrayElements(subjects, { min: 1, max: 3 })
      
      const profileData = {
        user: user.id,
        bio: faker.person.bio(),
        yearsOfExperience: faker.number.int({ min: 1, max: 20 }),
        mode: faker.helpers.arrayElement(['online', 'hybrid']),
        subjects: tutorSubjects,
        hourlyRate: faker.number.int({ min: 500, max: 50000 }),
        isApproved: true,
        onboardingCompleted: true,
      }

      if (existingProfile.docs.length === 0) {
        await payload.create({
          collection: 'tutor-profiles',
          data: profileData,
        })
      } else {
        await payload.update({
          collection: 'tutor-profiles',
          id: existingProfile.docs[0].id,
          data: profileData,
        })
      }
    }
  }

  console.log('Seeding complete!')
}
