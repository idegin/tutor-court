import { getPayload } from 'payload'
import configPromise from '../../../src/payload.config.js'
import { faker } from '@faker-js/faker'
import {
  generateManagedEmail,
  generateManagedPassword,
} from '../../../src/lib/managed-account.js'

export async function seedData() {
  const payload = await getPayload({ config: configPromise })

  console.log('Clearing database...')
  const collections = [
    'reviews',
    'bookings',
    'transactions',
    'wallets',
    'tutor-profiles',
    'students',
    'users',
    'subjects',
  ] as const
  for (const collection of collections) {
    try {
      await payload.delete({ collection: collection, where: { id: { exists: true } } })
    } catch (e) {
      console.log(`Failed to clear ${collection}`)
    }
  }

  console.log('Seeding admin account...')
  await payload.create({
    collection: 'users',
    data: {
      email: 'admin@tutorcourt.com',
      password: 'password123',
      firstName: 'Super',
      lastName: 'Admin',
      phoneNumber: '+1234567890',
      accountType: 'admin',
      _verified: true,
    },
    disableVerificationEmail: true,
  })

  console.log('Seeding subjects...')
  const subjectsData = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
    'History',
    'Geography',
    'Economics',
    'Art',
  ]
  const subjects = []

  for (const subjectName of subjectsData) {
    const subject = await payload.create({
      collection: 'subjects',
      data: { name: subjectName },
    })
    subjects.push(subject.id)
  }

  console.log('Seeding users and tutor profiles...')
  // Create guaranteed 10 students and 10 tutors to have enough data
  const createdStudents = []
  const createdTutors = []
  let parentUser: any = null

  for (let i = 0; i < 20; i++) {
    const isTutor = i >= 10
    let firstName = faker.person.firstName()
    let lastName = faker.person.lastName()

    let email = `${Date.now()}_${faker.internet.email({ firstName, lastName, provider: 'example.com' })}`
    let accountType: 'tutor' | 'student' | 'parent' | 'admin' = isTutor ? 'tutor' : 'student'

    // Inject test accounts
    if (i === 0) {
      email = 'chukwuemekaifeora@gmail.com'
      accountType = 'parent'
      firstName = 'Chukwuemeka'
      lastName = 'Ifeora'
    } else if (i === 10) {
      email = 'ideginmedia@gmail.com'
      accountType = 'tutor'
      firstName = 'Idegin'
      lastName = 'Media'
    }

    const user = await payload.create({
      collection: 'users',
      data: {
        email,
        password: 'password123',
        firstName,
        lastName,
        phoneNumber: faker.phone.number(),
        accountType,
        _verified: true,
        ...(accountType === 'parent' ? { hasCompletedOnboarding: true } : {}),
      },
      disableVerificationEmail: true,
    })

    if (accountType === 'parent') {
      parentUser = user
    }

    if (isTutor) {
      createdTutors.push(user)
      const existingProfile = await payload.find({
        collection: 'tutor-profiles',
        where: { user: { equals: user.id } },
        limit: 1,
      })

      const tutorSubjects = faker.helpers.arrayElements(subjects, { min: 1, max: 3 })
      const profileData = {
        headline: faker.person.jobTitle(),
        bio: faker.lorem.paragraphs(5, '\n\n'),
        yearsOfExperience: faker.number.int({ min: 1, max: 20 }),
        mode: faker.helpers.arrayElement(['online', 'hybrid']),
        type: faker.helpers.arrayElements(['one-on-one', 'group'], { min: 1, max: 2 }),
        subjects: tutorSubjects,
        hourlyRate: faker.number.int({ min: 500, max: 50000 }),
        isApproved: true,
        onboardingCompleted: true,
      }

      if (existingProfile.docs.length === 0) {
        // @ts-ignore
        await payload.create({
          collection: 'tutor-profiles',
          data: {
            user: user.id,
            ...profileData,
          } as any,
        })
      } else {
        // @ts-ignore
        await payload.update({
          collection: 'tutor-profiles',
          id: existingProfile.docs[0].id,
          data: profileData as any,
        })
      }
    } else {
      createdStudents.push(user)
    }

    const existingWallet = await payload.find({
      collection: 'wallets',
      where: { user: { equals: user.id } },
      limit: 1,
    })

    if (existingWallet.docs.length > 0) {
      await payload.update({
        collection: 'wallets',
        id: existingWallet.docs[0].id,
        data: {
          currency: isTutor ? 'usd' : 'ngn',
          balance: faker.number.int({ min: 100, max: 5000 }),
          creditBalance: 0,
        } as any,
      })
    } else {
      await payload.create({
        collection: 'wallets',
        data: {
          user: user.id,
          currency: isTutor ? 'usd' : 'ngn',
          balance: faker.number.int({ min: 100, max: 5000 }),
          creditBalance: 0,
        } as any,
      })
    }

    for (let j = 0; j < 3; j++) {
      await payload.create({
        collection: 'transactions',
        data: {
          reference: `seed-${user.id}-${Date.now()}-${j}-${Math.random().toString(36).slice(2, 8)}`,
          gateway: 'wallet',
          type: 'payment',
          sender: user.id,
          receiver: user.id,
          tutor: isTutor ? user.id : null,
          amount: faker.number.int({ min: 10, max: 500 }),
          currency: isTutor ? 'usd' : 'ngn',
          status: faker.helpers.arrayElement(['success', 'pending']),
        } as any,
      })
    }
  }

  if (parentUser) {
    const childFirstName = 'Mia'
    const childLastName = 'Ifeora'
    const generatedEmail = await generateManagedEmail(payload, childFirstName, childLastName)
    const generatedPassword = generateManagedPassword(12)
    console.log(`Seeding managed student under parent (Chukwuemeka Ifeora)...`)
    console.log(`Student Local Email: ${generatedEmail}`)
    console.log(`Student Autogenerated Password: ${generatedPassword}`)

    const childUser = await payload.create({
      collection: 'users',
      data: {
        email: generatedEmail,
        password: generatedPassword,
        firstName: childFirstName,
        lastName: childLastName,
        phoneNumber: parentUser.phoneNumber || '0000000000',
        accountType: 'student',
        parent: parentUser.id,
        isManagedAccount: true,
        hasCompletedOnboarding: true,
        _verified: true,
      } as any,
      disableVerificationEmail: true,
    })

    await payload.create({
      collection: 'students',
      data: {
        user: childUser.id,
        parent: parentUser.id,
        firstName: childFirstName,
        lastName: childLastName,
        generatedEmail,
        generatedPassword,
        gradeLevel: 'Grade 6',
      } as any,
    })

    createdStudents.push(childUser)
  }

  console.log('Seeding reviews and bookings...')
  const allTutors = await payload.find({ collection: 'tutor-profiles', limit: 100 })
  const allSubjects = await payload.find({ collection: 'subjects', limit: 100 })

  for (const tutor of allTutors.docs) {
    // Generate bookings
    for (let i = 0; i < faker.number.int({ min: 1, max: 5 }); i++) {
      const student = faker.helpers.arrayElement(createdStudents)

      const startDate = faker.date.recent()
      const endDate = faker.date.future()

      await payload.create({
        collection: 'bookings',
        data: {
          tutor: tutor.id,
          student: student.id,
          status: faker.helpers.arrayElement(['pending', 'confirmed', 'completed', 'cancelled']),
          paymentStatus: 'unpaid',
          currency: 'ngn',
          date: startDate.toISOString(),
          endDate: endDate.toISOString(),
          hoursPerDay: faker.number.int({ min: 1, max: 4 }),
          daysOfWeek: faker.helpers.arrayElements(
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            { min: 1, max: 3 },
          ),
          subjects: [faker.helpers.arrayElement(allSubjects.docs).id],
          price: faker.number.int({ min: 5000, max: 200000 }),
          message: faker.lorem.sentences(2),
        } as any,
      })
    }

    // Generate reviews
    const numReviews = faker.number.int({ min: 2, max: 8 })

    for (let i = 0; i < numReviews; i++) {
      const student = faker.helpers.arrayElement(createdStudents)
      const rating = faker.number.int({ min: 3, max: 5 })

      await payload.create({
        collection: 'reviews',
        data: {
          review: faker.lorem.paragraph(),
          rating,
          user: student.id,
          tutor: tutor.id,
        },
      })
    }
  }

  console.log('Seeding complete!')
}
