import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { Game } from "../lib/definitions";

export function EditGame({ game, leagueSlug }: { game: Game; leagueSlug: string }) {
    return (
        <Link href={`/dashboard/${leagueSlug}/games/${game.id}/edit`} className="rounded-md border p-2 hover:bg-gray-100">
            <PencilIcon className="w-5" />
        </Link>
    );
}
