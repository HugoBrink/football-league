import { PlusCircle } from "lucide-react"
import Link from "next/link"

export default function AddGame() {
    return <Link href="/dashboard/games/create">
        <PlusCircle />
    </Link>
}