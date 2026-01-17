'use client';

/**
 * Skeleton Loading Components
 * Provides shimmer effect placeholders for loading states
 */

// Base skeleton with shimmer animation
export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded ${className}`}
            style={{
                animation: 'shimmer 1.5s ease-in-out infinite',
            }}
        />
    );
}

// Card skeleton for mobile views
export function CardSkeleton() {
    return (
        <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="text-right">
                    <Skeleton className="h-6 w-16 ml-auto mb-1" />
                    <Skeleton className="h-3 w-12 ml-auto" />
                </div>
            </div>
            <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
            </div>
        </div>
    );
}

// Table row skeleton for desktop views
export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
    return (
        <tr className="border-b border-rudark-grey/30">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-4">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

// Stats card skeleton
export function StatsCardSkeleton() {
    return (
        <div className="bg-rudark-carbon p-4 border border-rudark-grey rounded-sm">
            <Skeleton className="h-8 w-12 mb-2" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

// Dashboard skeleton
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
                <StatsCardSkeleton />
                <StatsCardSkeleton />
            </div>

            {/* Quick actions */}
            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-10 w-full mb-3" />
                <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>

            {/* Recent items */}
            <div className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                <Skeleton className="h-4 w-32 mb-4" />
                <div className="space-y-2">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        </div>
    );
}

// Orders list skeleton
export function OrdersListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    );
}

// Stock list skeleton
export function StockListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-rudark-carbon border border-rudark-grey rounded-sm p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                            <Skeleton className="h-5 w-2/3 mb-1" />
                            <Skeleton className="h-3 w-1/3" />
                        </div>
                        <Skeleton className="h-8 w-12" />
                    </div>
                    <div className="flex gap-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}
