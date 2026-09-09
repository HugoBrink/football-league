'use client'

import { TrashIcon, Loader2 } from "lucide-react";
import { deleteGame } from "@/app/lib/actions";
import { Game } from "@/app/lib/definitions";
import { useTransition } from "react";

export function DeleteGame({ game, leagueSlug }: { game: Game; leagueSlug: string }) {
    const [isPending, startTransition] = useTransition();

    return (
        <button
            onClick={() => {
                if (!confirm('Apagar este jogo? Esta ação não pode ser revertida.')) return;
                startTransition(async () => {
                    await deleteGame(leagueSlug, game);
                });
            }}
            disabled={isPending}
            className="rounded-md border p-2 hover:bg-gray-400 disabled:opacity-50 transition-opacity"
        >
            {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <TrashIcon className="w-4 h-4" />
            )}
        </button>
    );
}
