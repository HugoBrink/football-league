import React from "react";

export function DashboardSkeleton() {
    return (
        <div className="rounded-lg border border-gray-300 bg-white w-full h-full">
            <h1>Grupeta de Futebol</h1>
            {/* Table header skeleton */}
            <div className="border-b border-gray-300 bg-gray-50 p-4">
                <div className="h-8 w-48 animate-pulse rounded-md bg-gray-300" />
            </div>

            {/* Table rows skeleton */}
            <div className="p-4">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between border-b border-gray-100 py-4 last:border-0"
                    >
                        {/* Column skeletons */}
                        <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 animate-pulse rounded-full bg-gray-300" />
                            <div className="h-4 w-32 animate-pulse rounded bg-gray-300" />
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="h-4 w-24 animate-pulse rounded bg-gray-300" />
                            <div className="h-4 w-16 animate-pulse rounded bg-gray-300" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function GamesSkeleton() {
    return (
        <div className="animate-pulse w-full h-full ">
            <div className="flex justify-between items-center w-[80%] pb-5">
                <h1>Games</h1>
            </div>
            <div className="grid grid-cols-3 gap-4 border-gray-100">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col w-full border-2 border-gray-300 rounded-lg p-4 items-center gap-2">
                        <div className="h-4 w-24 animate-pulse rounded bg-gray-300" />
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-300" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-300" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-300" />
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-300" />
                    </div>
                ))}
            </div>
        </div>
    )
}