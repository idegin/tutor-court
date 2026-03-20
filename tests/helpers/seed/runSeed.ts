import { seedData } from './seedData.js'

async function run() {
  try {
    await seedData()
    console.log('Seed completed successfully.')
    process.exit(0)
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

run()