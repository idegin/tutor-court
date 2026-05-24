import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TutorWalletClient } from './wallet-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Wallet | Tutor Dashboard',
}

export default async function TutorWalletPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const [walletRes, txRes] = await Promise.all([
    payload.find({
      collection: 'wallets',
      where: { user: { equals: user!.id } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: 'transactions',
      where: {
        or: [{ sender: { equals: user!.id } }, { receiver: { equals: user!.id } }],
      },
      sort: '-createdAt',
      limit: 10,
      depth: 0,
    }),
  ])

  let wallet = walletRes.docs[0]
  if (!wallet) {
    wallet = (await payload.create({
      collection: 'wallets',
      data: {
        user: user!.id,
        currency: 'ngn',
        balance: 0,
        creditBalance: 0,
      },
    } as any)) as any
  }

  const transactions = txRes.docs

  return (
    <TutorWalletClient
      initialWallet={wallet}
      initialTransactions={transactions}
      userEmail={user!.email}
    />
  )
}