'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  HiOutlineWallet,
  HiOutlineSparkles,
  HiOutlineArrowDownLeft,
  HiOutlineArrowUpRight,
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

type WalletClientProps = {
  initialWallet: any
  initialTransactions: any[]
  userEmail: string
}

export function WalletClient({ initialWallet, initialTransactions, userEmail }: WalletClientProps) {
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
    // Sync local state if initial values change
    setWallet(initialWallet)
    setTransactions(initialTransactions)
  }, [initialWallet, initialTransactions])

  React.useEffect(() => {
    // Check if redirect query param indicates payment success
    const reference = searchParams.get('reference')
    if (reference) {
      const verifyPayment = async () => {
        const promise = fetch(`/api/payments/paystack/verify?reference=${reference}`)
          .then(async (res) => {
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Verification failed')
            return data
          })

        toast.promise(promise, {
          loading: 'Verifying payment...',
          success: (data) => {
            if (data.wallet) {
              setWallet(data.wallet)
            }
            router.refresh()
            router.replace('/dashboard/parent/wallet')
            return 'Wallet funded successfully!'
          },
          error: (err) => {
            router.replace('/dashboard/parent/wallet')
            return err.message || 'Verification failed. Please contact support.'
          },
        })
      }

      verifyPayment()
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
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Fund your wallet to pay tutors and buy credits for live classes.
          </p>
        </div>
        <Button
          onClick={() => setIsFundingOpen(true)}
          className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 rounded-full px-6"
        >
          Fund wallet
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tutor-purple-50 text-tutor-purple-600">
            <HiOutlineWallet className="h-5 w-5" />
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Available balance
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{formatNaira(balance)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Currency: NGN</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <HiOutlineSparkles className="h-5 w-5" />
            </div>
            <Button
              onClick={() => setIsBuyingOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              Buy credits
            </Button>
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Credit balance
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{formatCredits(credits)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            1 credit = ₦{CREDIT_RATE.nairaPerCoin} · {CREDIT_RATE.coinsPerHour} credits / hour live class
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Recent transactions</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No transactions yet.
          </div>
        ) : (
          <ul className="divide-y">
            {transactions.map((tx: any) => {
              const isIncoming = tx.receiver === wallet.user || tx.receiver?.id === wallet.user
              const symbol = tx.currency === 'ngn' ? '₦' : '$'
              return (
                <li key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className={
                        'flex h-9 w-9 items-center justify-center rounded-full border ' +
                        (isIncoming
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-rose-200 bg-rose-50 text-rose-600')
                      }
                    >
                      {isIncoming ? (
                        <HiOutlineArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <HiOutlineArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {isIncoming ? 'Incoming payment / Funding' : 'Outgoing payment / Coin Purchase'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()} · {tx.status}
                      </p>
                    </div>
                  </div>
                  <p
                    className={
                      'text-sm font-semibold ' +
                      (isIncoming ? 'text-emerald-600' : 'text-foreground')
                    }
                  >
                    {isIncoming ? '+' : '-'}
                    {symbol}
                    {Number(tx.amount).toLocaleString()}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Fund Wallet Modal */}
      <Dialog open={isFundingOpen} onOpenChange={setIsFundingOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onFundWallet}>
            <DialogHeader>
              <DialogTitle>Fund Wallet</DialogTitle>
              <DialogDescription>
                Enter the amount you would like to fund. You will be redirected to Paystack to complete your payment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fundingAmount">Amount (₦)</Label>
                <CurrencyInput
                  id="fundingAmount"
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
                Convert your wallet funds into credits. Credits are used to access live classes and AI features.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="buyingCredits">Number of Credits</Label>
                <CurrencyInput
                  id="buyingCredits"
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
