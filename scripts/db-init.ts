import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Force NODE_ENV to development for the duration of this script.
// This forces Payload to push/initialize the database schema even in production/Vercel build environments.
process.env.NODE_ENV = 'development'

async function init() {
  console.log('Starting database schema push/initialization...')
  try {
    const { getPayload } = await import('payload')
    const config = (await import('../src/payload.config')).default
    const payload = await getPayload({ config })
    console.log('Database schema successfully synchronized/pushed.')
    process.exit(0)
  } catch (error) {
    console.error('Database initialization failed:', error)
    process.exit(1)
  }
}

init()
