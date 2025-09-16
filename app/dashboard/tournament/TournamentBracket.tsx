'use client'

import { TournamentMatch, calculateTotalRounds, getRoundName } from '@/app/lib/tournament'
import { Trophy } from 'lucide-react'
import { useState } from 'react'

type Props = {
    matches: TournamentMatch[]
    players: { id: string; name: string }[]
    onCreateBracket: (playerIds: string[]) => Promise<void>
}

export default function TournamentBracket({ matches, players, onCreateBracket }: Props) {
    const [isCreating, setIsCreating] = useState(false)
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())

    const roundMatches = matches.reduce((acc, match) => {
        // Ensure we have arrays for all rounds
        while (acc.length < match.round) {
            acc.push([]);
        }
        // Place match in correct position
        acc[match.round - 1][match.position - 1] = match;
        return acc;
    }, [] as TournamentMatch[][]);

    const totalRounds = matches.length > 0
        ? Math.max(...matches.map(m => m.round))
        : calculateTotalRounds(selectedPlayers.size);

    const togglePlayer = (id: string) => {
        const newSelected = new Set(selectedPlayers);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedPlayers(newSelected);
    };

    const handleCreateBracket = async () => {
        if (selectedPlayers.size < 4) {
            alert('Selecione pelo menos 4 jogadores');
            return;
        }
        setIsCreating(true);
        try {
            await onCreateBracket(Array.from(selectedPlayers));
        } finally {
            setIsCreating(false);
        }
    };

    const getPlayerName = (id: bigint | null) => {
        if (!id) return '?';
        // Convert BigInt to string for comparison
        const idStr = String(id);
        const player = players.find(p => p.id === idStr);
        return player?.name ?? '?';
    };

    if (matches.length === 0) {
        return (
            <div className="space-y-4">
                <div className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">Selecionar Participantes</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {players.map(player => (
                            <label key={player.id} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={selectedPlayers.has(player.id)}
                                    onChange={() => togglePlayer(player.id)}
                                    className="rounded"
                                />
                                <span>{player.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleCreateBracket}
                    disabled={isCreating || selectedPlayers.size < 4}
                    className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
                >
                    {isCreating ? 'Sorteando...' : 'Sortear Primeira Ronda'}
                </button>
            </div>
        );
    }

    return (
        <div className={`grid gap-8`} style={{ gridTemplateColumns: `repeat(${totalRounds}, 1fr)` }}>
            {Array.from({ length: totalRounds }, (_, round) => {
                const roundNumber = round + 1;
                const matches = roundMatches[round] ?? [];
                const isLastRound = roundNumber === totalRounds;

                return (
                    <div key={round} className="space-y-4">
                        <h3 className="font-medium text-center text-lg mb-6">
                            {getRoundName(roundNumber, totalRounds)}
                        </h3>
                        <div className="space-y-8 relative">
                            {/* Lines connecting matches */}
                            {!isLastRound && matches.length > 0 && (
                                <div className="absolute right-0 top-0 bottom-0 w-8 border-r border-gray-300" style={{
                                    transform: 'translateX(100%)'
                                }} />
                            )}
                            {matches.map((match, idx) => match ? (
                                <div key={match.id} className="relative">
                                    {/* Horizontal line to next match */}
                                    {!isLastRound && (
                                        <div className="absolute right-0 top-1/2 w-8 border-t border-gray-300" style={{
                                            transform: 'translateX(100%)'
                                        }} />
                                    )}
                                    <div className="border rounded-lg shadow-sm bg-white overflow-hidden">
                                        <div className="p-3 border-b bg-gray-50">
                                            <div className="text-sm text-gray-500">
                                                {match.game_id ? `Jogo #${match.game_id}` : 'Aguardando Jogo'}
                                            </div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className={`flex items-center justify-between ${match.winner_id === match.player_id ? 'text-green-600 font-bold' : ''}`}>
                                                <span>{getPlayerName(match.player_id)}</span>
                                                {match.winner_id === match.player_id && (
                                                    <Trophy className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="text-xs text-center text-gray-400">vs</div>
                                            <div className={`flex items-center justify-between ${match.winner_id === match.opponent_id ? 'text-green-600 font-bold' : ''}`}>
                                                <span>{getPlayerName(match.opponent_id)}</span>
                                                {match.winner_id === match.opponent_id && (
                                                    <Trophy className="w-4 h-4" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div key={`empty-${round}-${idx}`} className="border rounded-lg p-4 bg-gray-50 text-center">
                                    <div className="text-sm text-gray-500">Aguardando Vencedor</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
