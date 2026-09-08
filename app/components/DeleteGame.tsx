import { TrashIcon } from "lucide-react";
import { deleteGame } from "@/app/lib/actions";
import { Game } from "@/app/lib/definitions";
import { auth } from "@/auth";

export async function DeleteGame({ game, leagueSlug }: { game: Game; leagueSlug: string }) {
    const session = await auth();
    if (!session?.user) return null;

    const deleteGameWithId = deleteGame.bind(null, leagueSlug, game);
    return (
        <form action={deleteGameWithId}>
            <button type="submit" className="rounded-md border p-2 hover:bg-gray-400">
                <span className="sr-only">Delete</span>
                <TrashIcon className="w-4" />
            </button>
        </form>
    );
}
