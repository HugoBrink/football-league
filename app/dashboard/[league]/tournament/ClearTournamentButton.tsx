'use client'

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { clearTournamentAction } from "./actions";

export default function ClearTournamentButton({ leagueSlug }: { leagueSlug: string }) {
    const [isPending, startTransition] = useTransition();

    return (
        <button
            onClick={() => {
                if (!confirm('Tem certeza que quer limpar o torneio? Esta ação não pode ser desfeita.')) return;
                startTransition(async () => {
                    await clearTournamentAction(leagueSlug);
                });
            }}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'A limpar…' : 'Limpar Torneio'}
        </button>
    );
}
