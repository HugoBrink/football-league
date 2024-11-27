import { Loader2 } from "lucide-react";
import { DashboardSkeleton } from "../../ui/skeletons";
import React from "react";

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="hidden sm:flex sm:flex-col items-center justify-center h-screen w-full">
                <DashboardSkeleton />
            </div>
            <Loader2 className="animate-spin" />
        </div>
    );
}
