import { Payload } from 'payload'

type Methods = keyof Payload
const hasSendVerify: Methods = 'sendVerificationEmail'
