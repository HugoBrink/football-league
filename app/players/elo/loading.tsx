import React from "react";

function Shimmer({ className }: { className: string }) {
    return <div className={`animate-pulse rounded bg-gray-300 ${className}`} />;
}

export default function Loading() {
    return (
        <div className="space-y-6">
            <div>
                <Shimmer className="h-7 w-64 mb-2" />
                <Shimmer className="h-4 w-96" />
            </div>

            {/* Controls skeleton */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 bg-gray-50">
                <Shimmer className="h-7 w-28" />
                <Shimmer className="h-7 w-28" />
                <Shimmer className="h-7 w-32" />
            </div>

            {/* Podium skeleton */}
            <div className="flex items-end justify-center gap-4 mb-2">
                <div className="flex flex-col items-center gap-1">
                    <Shimmer className="h-6 w-6 rounded-full" />
                    <Shimmer className="h-4 w-16" />
                    <Shimmer className="h-5 w-12" />
                    <Shimmer className="w-20 h-16 rounded-t" />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Shimmer className="h-8 w-8 rounded-full" />
                    <Shimmer className="h-5 w-20" />
                    <Shimmer className="h-6 w-14" />
                    <Shimmer className="w-20 h-24 rounded-t" />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Shimmer className="h-6 w-6 rounded-full" />
                    <Shimmer className="h-4 w-16" />
                    <Shimmer className="h-5 w-12" />
                    <Shimmer className="w-20 h-12 rounded-t" />
                </div>
            </div>

            {/* Table skeleton */}
            <div className="rounded-lg border overflow-hidden">
                <div className="bg-gray-50 flex gap-4 px-3 py-2 border-b">
                    <Shimmer className="h-4 w-6" />
                    <Shimmer className="h-4 w-20" />
                    <Shimmer className="h-4 w-10" />
                    <Shimmer className="h-4 w-10" />
                    <Shimmer className="h-4 w-8" />
                    <Shimmer className="h-4 w-8" />
                    <Shimmer className="h-4 w-8" />
                    <Shimmer className="h-4 w-8" />
                </div>
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-3 py-3 border-b border-gray-100 last:border-0">
                        <Shimmer className="h-4 w-6" />
                        <div className="flex-1 space-y-1">
                            <Shimmer className="h-4 w-24" />
                            <Shimmer className="h-1 w-32" />
                        </div>
                        <Shimmer className="h-4 w-10" />
                        <Shimmer className="h-4 w-10" />
                        <Shimmer className="h-4 w-8" />
                        <Shimmer className="h-4 w-8" />
                        <Shimmer className="h-4 w-8" />
                    </div>
                ))}
            </div>
        </div>
    );
}
