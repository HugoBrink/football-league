import { Gamepad2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function AddComponent({ type, leagueSlug }: { type: string; leagueSlug?: string }) {
    const prefix = leagueSlug ? `/dashboard/${leagueSlug}` : '/dashboard';
    return (
        <Link href={`${prefix}/${type}/create`}>
            {type === 'games' ? <Gamepad2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
        </Link>
    );
}
