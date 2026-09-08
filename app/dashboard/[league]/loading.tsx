import { Loader2 } from "lucide-react";
import { DashboardSkeleton } from "@/app/ui/skeletons";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="hidden sm:flex sm:flex-col items-center justify-center h-screen w-full">
                <DashboardSkeleton />
            </div>
            <Loader2 className="animate-spin" />
        </div>
    );
}
