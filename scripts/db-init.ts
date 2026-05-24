import { getPayload } from 'payload'
import config from '../src/payload.config'

async function init() {
  console.log('Starting database schema push/initialization...')
  try {
    const payload = await getPayload({ config })
    console.log('Database schema successfully synchronized/pushed.')
    process.exit(0)
  } catch (error) {
    console.error('Database initialization failed:', error)
    process.exit(1)
  }
}

init()
