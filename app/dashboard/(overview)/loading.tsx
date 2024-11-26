import { DashboardSkeleton } from "../../ui/skeletons";
import React from "react";

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <DashboardSkeleton />
        </div>
    );
}
