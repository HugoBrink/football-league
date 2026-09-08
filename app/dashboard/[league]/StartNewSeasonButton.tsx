'use client'

import { CalendarPlus } from 'lucide-react';
import { startNewSeason } from '@/app/lib/actions';
import { useTransition } from 'react';

type Props = {
    leagueSlug: string;
    currentSeason: number;
};

export default function StartNewSeasonButton({ leagueSlug, currentSeason }: Props) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        const confirmed = confirm(
            `Tens a certeza que queres iniciar a Season ${currentSeason + 1}?\n\n` +
            `Isto vai:\n` +
            `• Copiar todos os jogadores atuais para a nova season (stats a zero)\n` +
            `• A Season ${currentSeason} fica arquivada em "Seasons Anteriores"\n\n` +
            `Esta acao nao pode ser desfeita.`
        );
        if (!confirmed) return;

        startTransition(async () => {
            await startNewSeason(leagueSlug);
        });
    };

    return (
        <button
            onClick={handleClick}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            title={`Iniciar Season ${currentSeason + 1}`}
        >
            <CalendarPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Season</span>
        </button>
    );
}
