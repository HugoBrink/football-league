'use client'

import { UserX, Users } from 'lucide-react';
import { confirmWalkover, grantAbsenceExemption } from '@/app/lib/actions';
import { useState, useTransition } from 'react';

type ForcedCaptainPair = {
    matchId: number;
    player1Id: string;
    player1Name: string;
    player2Id: string;
    player2Name: string;
    consecutiveSameTeamGames: number;
};

type AbsenceWarning = {
    matchId: number;
    playerId: string;
    playerName: string;
    opponentId: string;
    opponentName: string;
    consecutiveAbsences: number;
    hasExemption: boolean;
};

type Props = {
    notifications: {
        forcedCaptainPairs: ForcedCaptainPair[];
        absenceWarnings: AbsenceWarning[];
    };
};

export default function CupNotifications({ notifications }: Props) {
    const { forcedCaptainPairs, absenceWarnings } = notifications;
    const activeAbsenceWarnings = absenceWarnings.filter(w => !w.hasExemption);

    if (forcedCaptainPairs.length === 0 && activeAbsenceWarnings.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {forcedCaptainPairs.map(pair => (
                <div key={pair.matchId} className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                    <Users className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-yellow-800">
                            {pair.player1Name} e {pair.player2Name} devem ser capitaes de equipas opostas
                        </p>
                        <p className="text-sm text-yellow-600 mt-1">
                            Estiveram na mesma equipa {pair.consecutiveSameTeamGames} jogos consecutivos sem se enfrentarem na taca.
                        </p>
                    </div>
                </div>
            ))}

            {activeAbsenceWarnings.map(warning => (
                <AbsenceWarningCard key={`${warning.matchId}-${warning.playerId}`} warning={warning} />
            ))}
        </div>
    );
}

function AbsenceWarningCard({ warning }: { warning: AbsenceWarning }) {
    const [isPending, startTransition] = useTransition();
    const [showJustify, setShowJustify] = useState(false);
    const [reason, setReason] = useState('');

    const handleWalkover = () => {
        if (!confirm(`Confirmar derrota por ausencia de ${warning.playerName}? ${warning.opponentName} avanca.`)) return;
        startTransition(async () => {
            await confirmWalkover(warning.matchId, BigInt(warning.playerId), 'Ausencia consecutiva');
        });
    };

    const handleExemption = () => {
        if (!reason.trim()) return;
        startTransition(async () => {
            await grantAbsenceExemption(warning.matchId, BigInt(warning.playerId), reason);
            setShowJustify(false);
            setReason('');
        });
    };

    return (
        <div className="flex flex-col gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
                <UserX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="font-medium text-red-800">
                        {warning.playerName} faltou a {warning.consecutiveAbsences} jogos consecutivos
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                        Adversario na taca: {warning.opponentName}. Admin deve decidir.
                    </p>
                </div>
            </div>
            <div className="flex gap-2 ml-8">
                <button
                    onClick={handleWalkover}
                    disabled={isPending}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                    Aceitar derrota por ausencia
                </button>
                <button
                    onClick={() => setShowJustify(!showJustify)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                    Justificar ausencia
                </button>
            </div>
            {showJustify && (
                <div className="ml-8 flex gap-2">
                    <input
                        type="text"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Razao da justificacao..."
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                    />
                    <button
                        onClick={handleExemption}
                        disabled={isPending || !reason.trim()}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        Confirmar
                    </button>
                </div>
            )}
        </div>
    );
}
