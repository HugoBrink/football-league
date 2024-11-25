
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function AddPlayer() {
    return <Link href="/dashboard/players/create">
        <PlusCircle />
    </Link>
}