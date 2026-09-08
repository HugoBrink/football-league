'use client'

import { Settings, CalendarPlus } from 'lucide-react';
import { startNewSeason } from '@/app/lib/actions';
import { useState, useRef, useEffect, useTransition } from 'react';

type Props = {
    leagueSlug: string;
    currentSeason: number;
};

export default function AdminMenu({ leagueSlug, currentSeason }: Props) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNewSeason = () => {
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
        setOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setOpen(!open)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Admin"
            >
                <Settings className="w-5 h-5" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Admin
                    </div>
                    <button
                        onClick={handleNewSeason}
                        disabled={isPending}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-left"
                    >
                        <CalendarPlus className="w-4 h-4 text-emerald-600" />
                        <div>
                            <p className="font-medium">Iniciar Nova Season</p>
                            <p className="text-xs text-gray-500">Avanca para a Season {currentSeason + 1}</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
