export default function WalletLoading() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 border border-gray-200 rounded-xl bg-white flex flex-col gap-3">
                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mt-2" />
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="p-4 flex items-center justify-between">
                                <div className="flex flex-col gap-2">
                                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                                </div>
                                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
