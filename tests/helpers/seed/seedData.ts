import { getPayload } from 'payload'
import configPromise from '../../../src/payload.config.js'
import { faker } from '@faker-js/faker'
import {
  generateManagedEmail,
  generateManagedPassword,
} from '../../../src/lib/managed-account.js'
import { computeBookingPrice } from '../../../src/lib/booking-pricing.js'

export async function seedData() {
  const payload = await getPayload({ config: configPromise })

  console.log('Clearing database...')
  // Ordered children-first so foreign keys don't block deletion.
  const collections = [
    'activity-logs',
    'assessment-results',
    'tutor-assessments',
    'assessment-questions',
    'assessments',
    'attendance',
    'whiteboard-slides',
    'live-session-messages',
    'live-session-participants',
    'live-sessions',
    'whiteboards',
    'class-invitations',
    'classes',
    'reviews',
    'bookings',
    'notifications',
    'transactions',
    'wallets',
    'tutor-profiles',
    'students',
    'users',
    'subjects',
    'subject-categories',
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
      password: 'Superman6625*',
      firstName: 'Super',
      lastName: 'Admin',
      phoneNumber: '+1234567890',
      accountType: 'admin',
      _verified: true,
    },
    disableVerificationEmail: true,
  })

  console.log('Seeding subject categories...')
  const categoriesData = [
    { name: 'Mathematics', slug: 'mathematics' },
    { name: 'Language Arts / English', slug: 'language-arts-english' },
    { name: 'Science', slug: 'science' },
    { name: 'Social Studies', slug: 'social-studies' },
    { name: 'Computing', slug: 'computing' },
    { name: 'Arts', slug: 'arts' },
  ]

  const categoryMap: Record<string, any> = {}

  for (const cat of categoriesData) {
    const createdCat = await payload.create({
      collection: 'subject-categories',
      data: cat,
    })
    categoryMap[cat.name] = createdCat.id
  }

  console.log('Seeding subjects...')
  const subjectsData = [
    { name: 'Mathematics', category: 'Mathematics' },
    { name: 'Physics', category: 'Science' },
    { name: 'Chemistry', category: 'Science' },
    { name: 'Biology', category: 'Science' },
    { name: 'Computer Science', category: 'Computing' },
    { name: 'English', category: 'Language Arts / English' },
    { name: 'History', category: 'Social Studies' },
    { name: 'Geography', category: 'Social Studies' },
    { name: 'Economics', category: 'Social Studies' },
    { name: 'Art', category: 'Arts' },
  ]
  const subjects = []

  for (const sub of subjectsData) {
    const catId = categoryMap[sub.category]
    const subject = await payload.create({
      collection: 'subjects',
      data: {
        name: sub.name,
        category: catId,
      },
    })
    subjects.push(subject.id)
  }

  console.log('Seeding users and tutor profiles...')
  // Create guaranteed 10 students and 10 tutors to have enough data
  const createdStudents = []
  const createdTutors = []
  let parentUser: any = null
  let mainTutorUser: any = null
  let knownStudentUser: any = null
  let childStudentUser: any = null

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
    } else if (i === 1) {
      // Known standalone student for marketplace testing.
      email = 'student@tutorcourt.com'
      accountType = 'student'
      firstName = 'Sam'
      lastName = 'Student'
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
        password: 'Superman6625*',
        firstName,
        lastName,
        phoneNumber: faker.phone.number(),
        accountType,
        _verified: true,
        // Mark parents and the known standalone test student as onboarded so
        // they land straight on their dashboard (not the onboarding flow).
        ...(accountType === 'parent' || i === 1 ? { hasCompletedOnboarding: true } : {}),
      },
      disableVerificationEmail: true,
    })

    if (accountType === 'parent') {
      parentUser = user
    }
    if (i === 1) {
      knownStudentUser = user
    }
    if (i === 10) {
      mainTutorUser = user
    }

    if (isTutor) {
      createdTutors.push(user)
      const existingProfile = await payload.find({
        collection: 'tutor-profiles',
        where: { user: { equals: user.id } },
        limit: 1,
      })

      const isMainTutor = i === 10
      // The main tutor (Idegin) gets deterministic subjects + rate so marketplace
      // pricing is predictable during testing.
      const tutorSubjects = isMainTutor
        ? subjects.slice(0, 2) // Mathematics + Physics
        : faker.helpers.arrayElements(subjects, { min: 1, max: 3 })
      const availabilityDays = faker.helpers.arrayElements(
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        { min: 2, max: 4 },
      )
      const profileData = {
        headline: isMainTutor ? 'Expert Maths & Physics Tutor' : faker.person.jobTitle(),
        bio: faker.lorem.paragraphs(5, '\n\n'),
        yearsOfExperience: isMainTutor ? 8 : faker.number.int({ min: 1, max: 20 }),
        mode: faker.helpers.arrayElement(['online', 'hybrid']),
        type: faker.helpers.arrayElements(['one-on-one', 'group'], { min: 1, max: 2 }),
        subjects: tutorSubjects,
        hourlyRate: isMainTutor ? 5000 : faker.number.int({ min: 500, max: 50000 }),
        weeklyAvailability: isMainTutor
          ? [
              { day: 'monday', startTime: '16:00', endTime: '19:00' },
              { day: 'wednesday', startTime: '16:00', endTime: '19:00' },
              { day: 'saturday', startTime: '10:00', endTime: '14:00' },
            ]
          : availabilityDays.map((day) => ({ day, startTime: '15:00', endTime: '18:00' })),
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
        gradeLevel: 'grade_6',
      } as any,
    })

    childStudentUser = childUser
    createdStudents.push(childUser)
  }

  // Guaranteed PENDING bookings addressed to the main tutor (Idegin) so the
  // accept/decline lifecycle can be tested immediately after seeding.
  if (mainTutorUser) {
    const mainProfileRes = await payload.find({
      collection: 'tutor-profiles',
      where: { user: { equals: mainTutorUser.id } },
      limit: 1,
    })
    const mainProfile = mainProfileRes.docs[0]
    const mathSubjectId = subjects[0]

    if (mainProfile && mathSubjectId) {
      const hourlyRate = (mainProfile as any).hourlyRate || 5000
      // Weekly Mon/Wed/Fri engagement over the next ~2 weeks.
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 2)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 16)
      const daysOfWeek = ['monday', 'wednesday', 'friday']
      const hoursPerDay = 2

      const price = computeBookingPrice({
        startDate,
        endDate,
        daysOfWeek,
        hoursPerDay,
        hourlyRate,
      })

      const pendingBookers: Array<{ student: any; parent: any | null; label: string }> = []
      if (childStudentUser)
        pendingBookers.push({ student: childStudentUser, parent: parentUser, label: 'parent→child' })
      if (knownStudentUser)
        pendingBookers.push({ student: knownStudentUser, parent: null, label: 'student' })

      for (const b of pendingBookers) {
        await payload.create({
          collection: 'bookings',
          data: {
            tutor: mainProfile.id,
            student: b.student.id,
            ...(b.parent ? { parent: b.parent.id } : {}),
            status: 'pending',
            paymentStatus: 'unpaid',
            currency: 'ngn',
            date: startDate.toISOString(),
            endDate: endDate.toISOString(),
            hoursPerDay,
            daysOfWeek,
            subjects: [mathSubjectId],
            price: price.totalPrice,
            message: `Hi, I'd like ${hoursPerDay}h Maths sessions (${b.label}).`,
          } as any,
        })
      }
      console.log(`Seeded ${pendingBookers.length} pending booking(s) for main tutor (Idegin).`)

      // An active class taught by the main tutor with the child + known student
      // enrolled, so the calendar / classes / live-class features are testable.
      const classStudents = [childStudentUser, knownStudentUser].filter(Boolean).map((u: any) => u.id)
      const classStart = new Date()
      classStart.setDate(classStart.getDate() - 3)
      const classEnd = new Date()
      classEnd.setDate(classEnd.getDate() + 42)
      try {
        const testClass = await payload.create({
          collection: 'classes',
          data: {
            tutor: mainTutorUser.id,
            subject: mathSubjectId,
            description: 'Weekly mathematics tutoring — algebra and geometry foundations.',
            classType: 'group',
            gradeLevel: 'grade_6',
            timezone: 'Africa/Lagos',
            maxStudents: 5,
            startDate: classStart.toISOString(),
            endDate: classEnd.toISOString(),
            schedule: [
              { day: 'monday', startTime: '09:00', endTime: '10:00' },
              { day: 'wednesday', startTime: '14:00', endTime: '15:00' },
            ],
            students: classStudents,
            ...(parentUser ? { parents: [parentUser.id] } : {}),
            status: 'active',
          } as any,
        })
        console.log('Seeded 1 active class for main tutor (Idegin) with enrolled students.')

        // Assessment + results so the progress dashboard has real data to show.
        await seedAssessments(payload, {
          tutor: mainTutorUser,
          subjectId: mathSubjectId,
          classId: testClass.id,
          students: [childStudentUser, knownStudentUser].filter(Boolean),
        })
      } catch (e) {
        console.log('Failed to seed test class/assessments:', (e as any)?.message)
      }
    }
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
          isApproved: true,
        },
      })
    }
  }

  console.log('Seeding complete!')
}

/**
 * Seeds one published assessment (owned by the main tutor) with a few questions,
 * then a completed tutor-assessment + graded results per student, so the
 * progress dashboard renders real trend / score data.
 */
async function seedAssessments(
  payload: any,
  opts: { tutor: any; subjectId: any; classId: any; students: any[] },
) {
  const { tutor, subjectId, classId, students } = opts
  if (!students.length) return

  const assessment = await payload.create({
    collection: 'assessments',
    data: {
      title: 'Algebra Basics Quiz',
      description: 'A quick check on algebra fundamentals.',
      subject: subjectId,
      tutor: tutor.id,
      type: 'quiz',
      gradeLevel: 'grade_6',
      passingScore: 70,
      isPublished: true,
    } as any,
  })

  const qDefs: Array<{ q: string; opts: Array<[string, boolean]> }> = [
    { q: 'What is 5 + 7?', opts: [['10', false], ['12', true], ['13', false]] },
    { q: 'Solve for x: x + 3 = 10', opts: [['7', true], ['13', false], ['3', false]] },
    { q: 'What is 6 × 4?', opts: [['24', true], ['18', false], ['10', false]] },
  ]
  const questions: any[] = []
  for (let i = 0; i < qDefs.length; i++) {
    const created = await payload.create({
      collection: 'assessment-questions',
      data: {
        assessment: assessment.id,
        questionText: qDefs[i].q,
        type: 'single_choice',
        options: qDefs[i].opts.map(([optionText, isCorrect]) => ({ optionText, isCorrect })),
        points: 2,
        order: i,
      } as any,
    })
    questions.push(created)
  }
  const totalPoints = questions.reduce((a, q) => a + (q.points || 2), 0)

  let resultCount = 0
  for (const s of students) {
    const ta = await payload.create({
      collection: 'tutor-assessments',
      data: {
        assessment: assessment.id,
        tutor: tutor.id,
        student: s.id,
        class: classId,
        selectedQuestions: questions.map((q) => q.id),
        status: 'completed',
        maxAttempts: 3,
      } as any,
    })

    // Two attempts with improving scores so the trend line has a slope.
    const attempts = [2, 3] // number of correct answers (out of 3)
    for (let a = 0; a < attempts.length; a++) {
      const correctCount = attempts[a]
      const answers = questions.map((q, qi) => {
        const correctIdx = (q.options || []).findIndex((o: any) => o.isCorrect)
        const isCorrect = qi < correctCount
        const chosen = isCorrect ? correctIdx : (correctIdx + 1) % (q.options?.length || 1)
        return {
          question: q.id,
          selectedOptions: [{ optionIndex: chosen }],
          isCorrect,
          pointsEarned: isCorrect ? q.points || 2 : 0,
        }
      })
      const earned = answers.reduce((x, ans) => x + ans.pointsEarned, 0)
      const score = Math.round((earned / totalPoints) * 100)
      const submittedAt = new Date()
      submittedAt.setDate(submittedAt.getDate() - (attempts.length - a) * 3)
      await payload.create({
        collection: 'assessment-results',
        data: {
          tutorAssessment: ta.id,
          student: s.id,
          tutor: tutor.id,
          answers,
          totalPoints,
          earnedPoints: earned,
          score,
          passed: score >= 70,
          submittedAt: submittedAt.toISOString(),
          timeTakenSeconds: 300 + a * 60,
        } as any,
      })
      resultCount++
    }
  }
  console.log(`Seeded assessment + ${resultCount} results for the progress dashboard.`)

  // A second assessment with an essay question + a submitted-but-ungraded
  // result, so the "Needs grading" badge and manual-grading UI are testable.
  const firstStudent = students[0]
  if (firstStudent) {
    const essayAssessment = await payload.create({
      collection: 'assessments',
      data: {
        title: 'Essay: Explain a Concept',
        description: 'A short written-response question graded by the tutor.',
        subject: subjectId,
        tutor: tutor.id,
        type: 'homework',
        gradeLevel: 'grade_6',
        passingScore: 70,
        isPublished: true,
      } as any,
    })
    const essayQ = await payload.create({
      collection: 'assessment-questions',
      data: {
        assessment: essayAssessment.id,
        questionText: 'Explain, in your own words, what a variable is in algebra.',
        type: 'essay',
        points: 10,
        order: 0,
      } as any,
    })
    const essayTa = await payload.create({
      collection: 'tutor-assessments',
      data: {
        assessment: essayAssessment.id,
        tutor: tutor.id,
        student: firstStudent.id,
        class: classId,
        selectedQuestions: [essayQ.id],
        status: 'completed',
        maxAttempts: 1,
      } as any,
    })
    const submittedAt = new Date()
    submittedAt.setDate(submittedAt.getDate() - 1)
    await payload.create({
      collection: 'assessment-results',
      data: {
        tutorAssessment: essayTa.id,
        student: firstStudent.id,
        tutor: tutor.id,
        answers: [
          {
            question: essayQ.id,
            textAnswer:
              'A variable is a symbol (like x) that stands for a number we do not know yet.',
            isCorrect: false,
            pointsEarned: 0,
          },
        ],
        totalPoints: 10,
        earnedPoints: 0,
        score: 0,
        passed: false,
        pendingManualGrading: true,
        submittedAt: submittedAt.toISOString(),
        timeTakenSeconds: 240,
      } as any,
    })
    console.log('Seeded 1 pending-review essay result for manual-grading testing.')
  }
}
