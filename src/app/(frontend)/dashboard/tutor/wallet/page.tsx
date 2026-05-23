import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { TutorWalletClient } from './wallet-client'

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

  const wallet = walletRes.docs[0]
  const transactions = txRes.docs

  return (
    <TutorWalletClient
      initialWallet={wallet}
      initialTransactions={transactions}
      userEmail={user!.email}
    />
  )
}