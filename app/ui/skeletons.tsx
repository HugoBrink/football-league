import React from "react";

function Shimmer({ className }: { className: string }) {
    return <div className={`animate-pulse rounded bg-gray-300 ${className}`} />;
}

export function LeagueTableSkeleton() {
    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <Shimmer className="h-7 w-52" />
                </div>
                <div className="flex items-center gap-2">
                    <Shimmer className="h-9 w-9 rounded-full" />
                    <Shimmer className="h-9 w-9 rounded-full" />
                </div>
            </div>
            <div className="mt-6">
                <div className="inline-block min-w-full align-middle">
                    <div className="sm:rounded-lg bg-gray-50 py-4">
                        {/* Header row */}
                        <div className="flex gap-4 px-6 pb-3 border-b border-gray-200">
                            <Shimmer className="h-4 w-6" />
                            <Shimmer className="h-4 w-20" />
                            <Shimmer className="h-4 w-12" />
                            <Shimmer className="h-4 w-12" />
                            <Shimmer className="h-4 w-12" />
                            <Shimmer className="h-4 w-12" />
                        </div>
                        {/* Player rows */}
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 last:border-0">
                                <Shimmer className="h-4 w-6" />
                                <Shimmer className="h-4 w-24" />
                                <Shimmer className="h-4 w-10" />
                                <Shimmer className="h-4 w-10" />
                                <Shimmer className="h-4 w-10" />
                                <Shimmer className="h-4 w-10" />
                                <Shimmer className="h-4 w-10" />
                                <Shimmer className="h-4 w-10" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function GamesSkeleton() {
    return (
        <div>
            <div className="flex justify-between items-center w-[80%] pb-5">
                <Shimmer className="h-7 w-40" />
                <Shimmer className="h-9 w-9 rounded-full" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col w-full border-2 border-gray-200 bg-white rounded-lg p-4 items-center gap-2 min-h-32">
                        <Shimmer className="h-4 w-28" />
                        <Shimmer className="h-3 w-20" />
                        <Shimmer className="h-4 w-32" />
                        <Shimmer className="h-4 w-14" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TournamentSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Shimmer className="h-6 w-48 mb-2" />
                    <Shimmer className="h-4 w-32" />
                </div>
            </div>
            <div className="flex gap-8 overflow-x-auto py-4">
                {[...Array(3)].map((_, round) => (
                    <div key={round} className="flex flex-col gap-6 min-w-[200px]">
                        <Shimmer className="h-5 w-28 mx-auto" />
                        {[...Array(Math.max(1, 4 >> round))].map((_, j) => (
                            <div key={j} className="border rounded-lg bg-white p-3 space-y-2">
                                <Shimmer className="h-3 w-20" />
                                <Shimmer className="h-4 w-28" />
                                <Shimmer className="h-3 w-8 mx-auto" />
                                <Shimmer className="h-4 w-28" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function GlobalStandingsSkeleton() {
    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <Shimmer className="h-7 w-64" />
                    <Shimmer className="h-4 w-36" />
                </div>
            </div>
            <div className="mt-6">
                <div className="inline-block min-w-full align-middle">
                    <div className="sm:rounded-lg bg-gray-50 py-4">
                        <div className="flex gap-4 px-6 pb-3 border-b border-gray-200">
                            <Shimmer className="h-4 w-6" />
                            <Shimmer className="h-4 w-20" />
                            <Shimmer className="h-4 w-16" />
                            <Shimmer className="h-4 w-12" />
                            <Shimmer className="h-4 w-12" />
                            <Shimmer className="h-4 w-12" />
                        </div>
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 last:border-0">
                                <Shimmer className="h-4 w-6" />
                                <Shimmer className="h-4 w-24" />
                                <Shimmer className="h-5 w-14 rounded-full" />
                                <Shimmer className="h-4 w-10" />
                                <Shimmer className="h-4 w-10" />
                                <Shimmer className="h-4 w-10" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
