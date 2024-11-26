
import { Gamepad2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function AddComponent({ type }: { type: string }) {
    return <Link href={`/dashboard/${type}/create`}>
        {type === 'games' ? <Gamepad2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
    </Link>
}