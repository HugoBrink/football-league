
import { Loader2 } from "lucide-react";
import React from "react";

export default function Page() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Loader2 className="animate-spin" />
        </div>
    );
}
