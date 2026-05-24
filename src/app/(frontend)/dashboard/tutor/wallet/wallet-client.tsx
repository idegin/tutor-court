'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  HiOutlineWallet,
  HiOutlineSparkles,
  HiOutlineArrowDownLeft,
  HiOutlineArrowUpRight,
  HiOutlineCreditCard,
  HiOutlineArrowRight,
} from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/ui/currency-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCredits, formatNaira, CREDIT_RATE } from '@/lib/constants'

type TutorWalletClientProps = {
  initialWallet: any
  initialTransactions: any[]
  userEmail: string
}

export function TutorWalletClient({
  initialWallet,
  initialTransactions,
  userEmail,
}: TutorWalletClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [wallet, setWallet] = React.useState(initialWallet)
  const [transactions, setTransactions] = React.useState(initialTransactions)

  // Dialog states
  const [isFundingOpen, setIsFundingOpen] = React.useState(false)
  const [fundingAmount, setFundingAmount] = React.useState('')
  const [isFundingLoading, setIsFundingLoading] = React.useState(false)

  const [isBuyingOpen, setIsBuyingOpen] = React.useState(false)
  const [buyingCredits, setBuyingCredits] = React.useState('')
  const [isBuyingLoading, setIsBuyingLoading] = React.useState(false)

  React.useEffect(() => {
    setWallet(initialWallet)
    setTransactions(initialTransactions)
  }, [initialWallet, initialTransactions])

  React.useEffect(() => {
    const reference = searchParams.get('reference')
    if (reference) {
      toast.success('Wallet funded successfully! Your balance will update shortly.')
      router.replace('/dashboard/tutor/wallet')
    }
  }, [searchParams, router])

  const onFundWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanAmount = fundingAmount.replace(/,/g, '')
    const amountVal = parseFloat(cleanAmount)
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error('Please enter a valid amount.')
      return
    }

    setIsFundingLoading(true)
    try {
      const res = await fetch('/api/payments/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountVal,
          callbackUrl: window.location.href,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Initialization failed')
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      } else {
        throw new Error('No checkout URL received.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not process funding.')
      setIsFundingLoading(false)
    }
  }

  const onBuyCredits = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCredits = buyingCredits.replace(/,/g, '')
    const coinsVal = parseInt(cleanCredits, 10)
    if (isNaN(coinsVal) || coinsVal <= 0) {
      toast.error('Please enter a valid number of credits.')
      return
    }

    const cost = coinsVal * CREDIT_RATE.nairaPerCoin
    const currentBalance = wallet?.balance || 0
    if (currentBalance < cost) {
      toast.error(`Insufficient balance. You need ₦${cost.toLocaleString()} but only have ₦${currentBalance.toLocaleString()}.`)
      return
    }

    setIsBuyingLoading(true)
    try {
      const res = await fetch('/api/payments/buy-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: coinsVal }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed')
      }

      toast.success(`Successfully bought ${formatCredits(coinsVal)}!`)
      setIsBuyingOpen(false)
      setBuyingCredits('')

      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Could not purchase credits.')
    } finally {
      setIsBuyingLoading(false)
    }
  }

  const balance = wallet?.balance || 0
  const credits = wallet?.creditBalance || 0

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Wallet</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your earnings, payouts, and purchase class credits.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsFundingOpen(true)}
            className="rounded-full px-5 bg-gray-900 text-white hover:bg-gray-800"
          >
            Fund Wallet
          </Button>
          <Button
            onClick={() => setIsBuyingOpen(true)}
            className="rounded-full px-5 bg-tutor-purple-600 text-white hover:bg-tutor-purple-700"
          >
            Buy Credits
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance */}
        <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 border border-gray-100 rounded-xl bg-gray-50 text-gray-600">
              <HiOutlineWallet className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Available Balance</p>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
              {formatNaira(balance)}
            </h2>
          </div>
        </div>

        {/* Credits */}
        <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 border border-gray-100 rounded-xl bg-amber-50 text-amber-600">
              <HiOutlineSparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Credit Balance</p>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
              {formatCredits(credits)}
            </h2>
            <p className="text-xs text-gray-500">
              1 credit = ₦{CREDIT_RATE.nairaPerCoin} · {CREDIT_RATE.coinsPerHour} credits / hour live class
            </p>
          </div>
        </div>

        {/* Subscription Plan */}
        <div className="border rounded-2xl p-6 bg-gray-900 text-white flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-2 border border-gray-700/50 rounded-xl bg-gray-800 text-gray-200">
                <HiOutlineCreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Current Plan</p>
              <h2 className="text-2xl font-semibold tracking-tight">Pro Tutor</h2>
              <p className="text-sm text-gray-400">Host unlimited classes, create custom whiteboards, and more.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>

        <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          {transactions.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const isIncoming = tx.receiver === wallet.user || tx.receiver?.id === wallet.user
                return (
                  <li
                    key={tx.id}
                    className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2.5 rounded-full flex-shrink-0 border ${isIncoming
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : 'bg-rose-50 border-rose-100 text-rose-600'
                          }`}
                      >
                        {isIncoming ? (
                          <HiOutlineArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <HiOutlineArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {isIncoming ? 'Wallet Deposit / Funding' : 'Coin Purchase / Live Class Debit'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs capitalize font-medium text-emerald-600">
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p
                        className={`font-semibold ${isIncoming ? 'text-emerald-600' : 'text-gray-900'
                          }`}
                      >
                        {isIncoming ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="p-12 text-center text-gray-500 text-sm">
              No recent transactions found.
            </div>
          )}
        </div>
      </div>

      {/* Fund Wallet Modal */}
      <Dialog open={isFundingOpen} onOpenChange={setIsFundingOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onFundWallet}>
            <DialogHeader>
              <DialogTitle>Fund Wallet</DialogTitle>
              <DialogDescription>
                Enter the amount you would like to deposit. You will be redirected to Paystack to complete your payment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tutorFundingAmount">Amount (₦)</Label>
                <CurrencyInput
                  id="tutorFundingAmount"
                  value={fundingAmount}
                  onValueChange={(val) => setFundingAmount(val)}
                  placeholder="5,000"
                  required
                />
                <p className="text-xs text-muted-foreground">Minimum deposit is ₦100.</p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFundingOpen(false)}
                disabled={isFundingLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isFundingLoading}
                className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700"
              >
                {isFundingLoading ? 'Initializing...' : 'Proceed to Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Buy Credits Modal */}
      <Dialog open={isBuyingOpen} onOpenChange={setIsBuyingOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onBuyCredits}>
            <DialogHeader>
              <DialogTitle>Buy Credits</DialogTitle>
              <DialogDescription>
                Convert your wallet funds into credits to host live classes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tutorBuyingCredits">Number of Credits</Label>
                <CurrencyInput
                  id="tutorBuyingCredits"
                  value={buyingCredits}
                  onValueChange={(val) => setBuyingCredits(val)}
                  prefix=""
                  placeholder="60"
                  required
                />
                {buyingCredits && (
                  <p className="text-sm font-medium text-emerald-600">
                    Cost: {formatNaira(parseInt(buyingCredits.replace(/,/g, ''), 10) * CREDIT_RATE.nairaPerCoin)}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBuyingOpen(false)}
                disabled={isBuyingLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isBuyingLoading}
                className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700"
              >
                {isBuyingLoading ? 'Purchasing...' : 'Confirm Purchase'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
