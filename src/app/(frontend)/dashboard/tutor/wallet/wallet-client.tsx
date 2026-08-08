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

  const [isWithdrawOpen, setIsWithdrawOpen] = React.useState(false)
  const [withdrawAmount, setWithdrawAmount] = React.useState('')
  const [isWithdrawLoading, setIsWithdrawLoading] = React.useState(false)

  // Payout settings (Paystack transfer recipient)
  const [payout, setPayout] = React.useState<any | null>(null)
  const [isPayoutOpen, setIsPayoutOpen] = React.useState(false)
  const [banks, setBanks] = React.useState<{ name: string; code: string }[]>([])
  const [selectedBankCode, setSelectedBankCode] = React.useState('')
  const [payoutAccountNumber, setPayoutAccountNumber] = React.useState('')
  const [resolvedName, setResolvedName] = React.useState('')
  const [isResolving, setIsResolving] = React.useState(false)
  const [isSavingPayout, setIsSavingPayout] = React.useState(false)

  // Load saved payout settings once.
  React.useEffect(() => {
    let active = true
    fetch('/api/private/payout/recipient')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.payout) setPayout(d.payout)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const openPayoutSettings = async () => {
    setIsPayoutOpen(true)
    setResolvedName('')
    setSelectedBankCode(payout?.bankCode || '')
    setPayoutAccountNumber(payout?.accountNumber || '')
    if (banks.length === 0) {
      try {
        const res = await fetch('/api/private/payout/banks')
        const data = await res.json()
        if (res.ok) setBanks(data.banks || [])
        else toast.error(data.error || 'Could not load banks.')
      } catch {
        toast.error('Could not load banks.')
      }
    }
  }

  const onVerifyAccount = async () => {
    if (!selectedBankCode || !/^\d{10}$/.test(payoutAccountNumber)) {
      toast.error('Select a bank and enter a valid 10-digit account number.')
      return
    }
    setIsResolving(true)
    setResolvedName('')
    try {
      const res = await fetch('/api/private/payout/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode: selectedBankCode, accountNumber: payoutAccountNumber }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not verify account.')
      setResolvedName(data.accountName)
    } catch (err: any) {
      toast.error(err.message || 'Could not verify account.')
    } finally {
      setIsResolving(false)
    }
  }

  const onSavePayout = async () => {
    if (!resolvedName) {
      toast.error('Verify your account first.')
      return
    }
    setIsSavingPayout(true)
    try {
      const bankName = banks.find((b) => b.code === selectedBankCode)?.name || ''
      const res = await fetch('/api/private/payout/recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode: selectedBankCode, accountNumber: payoutAccountNumber, bankName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save payout details.')
      setPayout(data.payout)
      toast.success('Payout details saved.')
      setIsPayoutOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Could not save payout details.')
    } finally {
      setIsSavingPayout(false)
    }
  }

  React.useEffect(() => {
    setWallet(initialWallet)
    setTransactions(initialTransactions)
  }, [initialWallet, initialTransactions])

  React.useEffect(() => {
    const reference = searchParams.get('reference')
    if (!reference) return

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
          router.replace('/dashboard/tutor/wallet')
          return 'Wallet funded successfully!'
        },
        error: (err) => {
          router.replace('/dashboard/tutor/wallet')
          return err.message || 'Verification failed. Please contact support.'
        },
      })
    }

    verifyPayment()
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
  const locked = wallet?.lockedBalance || 0
  const spendable = Math.max(0, balance - locked)
  const credits = wallet?.creditBalance || 0

  const onWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(withdrawAmount)
    if (!(amount > 0)) {
      toast.error('Enter a valid amount.')
      return
    }
    if (amount > spendable) {
      toast.error(`You can withdraw up to ${formatNaira(spendable)}.`)
      return
    }
    if (!payout?.configured) {
      toast.error('Add your bank payout details first.')
      setIsWithdrawOpen(false)
      openPayoutSettings()
      return
    }
    setIsWithdrawLoading(true)
    try {
      const res = await fetch('/api/private/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Withdrawal request failed.')
      toast.success('Withdrawal requested — pending admin approval.')
      setIsWithdrawOpen(false)
      setWithdrawAmount('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Could not request withdrawal.')
    } finally {
      setIsWithdrawLoading(false)
    }
  }

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
          <Button
            variant="outline"
            onClick={openPayoutSettings}
            className="rounded-full px-5"
          >
            Payout Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsWithdrawOpen(true)}
            disabled={spendable <= 0}
            className="rounded-full px-5"
          >
            Withdraw
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
              {formatNaira(spendable)}
            </h2>
            {locked > 0 && (
              <p className="text-xs text-gray-500">{formatNaira(locked)} reserved (escrow / pending payout)</p>
            )}
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

      {/* Withdraw Modal */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={onWithdraw}>
            <DialogHeader>
              <DialogTitle>Withdraw earnings</DialogTitle>
              <DialogDescription>
                Request a payout of your available balance to a bank account. An admin reviews and
                processes it. Available: {formatNaira(spendable)}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Amount</Label>
                <CurrencyInput
                  id="withdrawAmount"
                  value={withdrawAmount}
                  onValueChange={(val) => setWithdrawAmount(val.replace(/,/g, ''))}
                  prefix="₦"
                  placeholder="5,000"
                  required
                />
              </div>
              {payout?.configured ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm">
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Paying out to</p>
                  <p className="font-medium text-gray-900">{payout.accountName}</p>
                  <p className="text-gray-600">
                    {payout.bankName} · {payout.accountNumber}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWithdrawOpen(false)
                      openPayoutSettings()
                    }}
                    className="mt-1 text-xs font-medium text-tutor-purple-600 hover:underline"
                  >
                    Change bank account
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  Add your bank payout details to withdraw.
                  <button
                    type="button"
                    onClick={() => {
                      setIsWithdrawOpen(false)
                      openPayoutSettings()
                    }}
                    className="ml-1 font-medium underline"
                  >
                    Set up now
                  </button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsWithdrawOpen(false)} disabled={isWithdrawLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isWithdrawLoading || !payout?.configured} className="bg-gray-900 text-white hover:bg-gray-800">
                {isWithdrawLoading ? 'Requesting...' : 'Request Withdrawal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payout Settings Modal */}
      <Dialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payout settings</DialogTitle>
            <DialogDescription>
              Add the Nigerian bank account where your withdrawals are paid. We verify the account
              name with your bank before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payoutBank">Bank</Label>
              <select
                id="payoutBank"
                value={selectedBankCode}
                onChange={(e) => {
                  setSelectedBankCode(e.target.value)
                  setResolvedName('')
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tutor-purple-500"
              >
                <option value="">Select your bank…</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutAccountNumber">Account number</Label>
              <Input
                id="payoutAccountNumber"
                value={payoutAccountNumber}
                onChange={(e) => {
                  setPayoutAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                  setResolvedName('')
                }}
                placeholder="0123456789"
                inputMode="numeric"
              />
            </div>
            {resolvedName ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
                <p className="text-emerald-700 text-xs uppercase tracking-wide">Account name</p>
                <p className="font-semibold text-emerald-800">{resolvedName}</p>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onVerifyAccount}
                disabled={isResolving || !selectedBankCode || payoutAccountNumber.length !== 10}
              >
                {isResolving ? 'Verifying…' : 'Verify account'}
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPayoutOpen(false)} disabled={isSavingPayout}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSavePayout}
              disabled={isSavingPayout || !resolvedName}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              {isSavingPayout ? 'Saving…' : 'Save payout details'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
