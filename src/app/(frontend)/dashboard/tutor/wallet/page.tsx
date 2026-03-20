import { HiOutlineWallet as Wallet, HiOutlineChartBar as Activity, HiOutlineCreditCard as CreditCard, HiOutlineArrowRight as ArrowRight, HiOutlineArrowUpRight as ArrowUpRight, HiOutlineArrowDownLeft as ArrowDownLeft } from "react-icons/hi2"
import { Button } from "@/components/ui/button"

const MOCK_DATA = {
    balanceUSD: 1250.00,
    balanceNGN: 450000.00,
    pendingUSD: 350.50,
    pendingNGN: 120000.00,
    plan: 'Pro Tutor',
    transactions: [
        { id: 'tx-1', type: 'credit', amount: 120.00, currency: 'USD', status: 'paid', date: '2026-03-19', desc: 'Math Tutoring - John Doe' },
        { id: 'tx-2', type: 'credit', amount: 25000.00, currency: 'NGN', status: 'pending', date: '2026-03-18', desc: 'Physics class - Sarah Adams' },
        { id: 'tx-3', type: 'debit', amount: 50.00, currency: 'USD', status: 'paid', date: '2026-03-15', desc: 'Withdrawal to Bank' },
        { id: 'tx-4', type: 'credit', amount: 80.00, currency: 'USD', status: 'paid', date: '2026-03-10', desc: 'Chemistry - Mike Ross' }
    ]
}

export default function TutorWalletPage() {
    return (
        <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Wallet</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your earnings, payouts, and subscription plans.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-full px-5 hover:bg-gray-50">Withdraw Funds</Button>
                    <Button className="rounded-full px-5 bg-gray-900 text-white hover:bg-gray-800">Add Funds</Button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Balance */}
                <div className="border border-gray-200 rounded-2xl p-6 bg-white overflow-hidden relative group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 border border-gray-100 rounded-xl bg-gray-50 text-gray-600">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Available Balance</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-medium tracking-tight text-gray-900">${MOCK_DATA.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                        </div>
                        <p className="text-sm text-gray-500">₦{MOCK_DATA.balanceNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Pending */}
                <div className="border border-gray-200 rounded-2xl p-6 bg-white overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 border border-gray-100 rounded-xl bg-gray-50 text-gray-600">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                            Processing
                        </span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending Clearance</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-medium tracking-tight text-gray-900">${MOCK_DATA.pendingUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                        </div>
                        <p className="text-sm text-gray-500">₦{MOCK_DATA.pendingNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Plan / Subscription */}
                <div className="border rounded-2xl p-6 bg-gray-900 text-white flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="p-2 border border-gray-700/50 rounded-xl bg-gray-800 text-gray-200">
                                <CreditCard className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Current Plan</p>
                            <h2 className="text-2xl font-medium tracking-tight">{MOCK_DATA.plan}</h2>
                            <p className="text-sm text-gray-400 line-clamp-2">You can host up to 50 active students and customize links.</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full mt-6 rounded-full group bg-white text-gray-900 hover:bg-gray-100 border-none">
                        Upgrade Plan
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
            </div>

            {/* Transactions */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
                    <Button variant="ghost" className="text-sm font-medium hover:bg-gray-50 rounded-full">View all</Button>
                </div>

                <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
                    {MOCK_DATA.transactions.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                            {MOCK_DATA.transactions.map((tx) => (
                                <li key={tx.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2.5 rounded-full flex-shrink-0 border ${tx.type === 'credit'
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                            : 'bg-rose-50 border-rose-100 text-rose-600'
                                            }`}>
                                            {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{tx.desc}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span className="text-xs text-gray-300">•</span>
                                                <span className={`text-xs capitalize font-medium ${tx.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-1">
                                        <p className={`font-medium ${tx.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                            {tx.type === 'credit' ? '+' : '-'}{tx.currency === 'USD' ? '$' : '₦'}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-12 text-center text-gray-500 text-sm">
                            No recent transactions found.
                        </div>
                    )}
                </div>
            </div>

        </div>
    )
}