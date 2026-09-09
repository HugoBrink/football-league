'use client'

import { TournamentMatch, getRoundName } from '@/app/lib/tournament'
import { Trophy, LayoutGrid, GitBranch } from 'lucide-react'
import { useState } from 'react'

type SimplePlayer = { id: string; name: string };

type Props = {
    matches: TournamentMatch[]
    players: SimplePlayer[]
    onCreateBracket: (playerIds: string[]) => Promise<void>
}

export default function TournamentBracket({ matches, players, onCreateBracket }: Props) {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
    const [view, setView] = useState<'bracket' | 'list'>('bracket');

    const getPlayerName = (id: bigint | null) => {
        if (!id) return '?';
        return players.find(p => p.id === String(id))?.name ?? '?';
    };

    const togglePlayer = (id: string) => {
        const s = new Set(selectedPlayers);
        if (s.has(id)) s.delete(id); else s.add(id);
        setSelectedPlayers(s);
    };

    const handleCreateBracket = async () => {
        if (selectedPlayers.size < 4) { alert('Seleciona pelo menos 4 jogadores'); return; }
        setIsCreating(true);
        try { await onCreateBracket(Array.from(selectedPlayers)); } finally { setIsCreating(false); }
    };

    if (matches.length === 0) {
        return (
            <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-white">
                    <h3 className="font-medium mb-4 text-gray-900">Selecionar Participantes</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {players.map(player => (
                            <label key={player.id} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedPlayers.has(player.id)} onChange={() => togglePlayer(player.id)} className="rounded" />
                                <span className="text-gray-900">{player.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleCreateBracket}
                    disabled={isCreating || selectedPlayers.size < 4}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 font-medium"
                >
                    {isCreating ? 'Sorteando...' : `Sortear Primeira Ronda (${selectedPlayers.size} jogadores)`}
                </button>
            </div>
        );
    }

    const totalRounds = Math.max(...matches.map(m => m.round));
    const roundMatches: (TournamentMatch | null)[][] = Array.from({ length: totalRounds }, () => []);
    for (const m of matches) {
        while (roundMatches[m.round - 1].length < m.position) roundMatches[m.round - 1].push(null);
        roundMatches[m.round - 1][m.position - 1] = m;
    }

    // Fill empty slots for round 1 based on expected count
    const r1Expected = Math.pow(2, totalRounds - 1);
    while (roundMatches[0].length < r1Expected) roundMatches[0].push(null);

    return (
        <div className="space-y-4">
            {/* View toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setView('bracket')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                        ${view === 'bracket' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    <GitBranch className="w-4 h-4" />
                    Bracket
                </button>
                <button
                    onClick={() => setView('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                        ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Lista
                </button>
            </div>

            {view === 'bracket'
                ? <BracketView rounds={roundMatches} totalRounds={totalRounds} getPlayerName={getPlayerName} />
                : <ListView rounds={roundMatches} totalRounds={totalRounds} getPlayerName={getPlayerName} />
            }
        </div>
    );
}

/* ─────────────── Bracket View (visual com linhas) ─────────────── */

type ViewProps = {
    rounds: (TournamentMatch | null)[][];
    totalRounds: number;
    getPlayerName: (id: bigint | null) => string;
};

function BracketView({ rounds, totalRounds, getPlayerName }: ViewProps) {
    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-0 min-w-fit">
                {rounds.map((roundMatches, roundIdx) => {
                    const roundNumber = roundIdx + 1;
                    const isLast = roundNumber === totalRounds;
                    // Each subsequent round has more vertical spacing
                    const matchSpacing = roundIdx === 0 ? 8 : 8 * Math.pow(2, roundIdx);

                    return (
                        <div key={roundIdx} className="flex flex-col">
                            <h3 className="font-semibold text-center text-sm text-gray-700 mb-4 px-4 whitespace-nowrap">
                                {getRoundName(roundNumber, totalRounds)}
                            </h3>
                            <div className="flex flex-col justify-around flex-1" style={{ gap: `${matchSpacing}px` }}>
                                {roundMatches.map((match, idx) => (
                                    <div key={idx} className="flex items-center">
                                        <MatchCard
                                            match={match}
                                            getPlayerName={getPlayerName}
                                            isLast={isLast}
                                        />
                                        {!isLast && (
                                            <ConnectorLines position={idx} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MatchCard({ match, getPlayerName, isLast }: {
    match: TournamentMatch | null;
    getPlayerName: (id: bigint | null) => string;
    isLast: boolean;
}) {
    if (!match) {
        return (
            <div className="w-48 border-2 border-dashed border-gray-200 rounded-lg p-2 bg-gray-50 mx-2">
                <div className="text-xs text-gray-400 text-center py-3">A aguardar</div>
            </div>
        );
    }

    const winner = match.winner_id;
    const isFinal = isLast;

    return (
        <div className={`w-48 rounded-lg overflow-hidden mx-2 shadow-sm border ${isFinal ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-gray-200'}`}>
            {/* Match header */}
            <div className={`px-2 py-1 text-xs ${isFinal ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'}`}>
                {match.walkover ? 'W.O.' : match.game_id ? `Jogo #${match.game_id}` : 'Aguardando Jogo'}
                {isFinal && winner && ' 🏆'}
            </div>

            {/* Player 1 */}
            <PlayerSlot
                name={getPlayerName(match.player_id)}
                isWinner={winner === match.player_id}
                isLoser={!!winner && winner !== match.player_id}
                hasOpponent={!!match.opponent_id}
                position="top"
            />

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Player 2 */}
            <PlayerSlot
                name={match.opponent_id ? getPlayerName(match.opponent_id) : 'BYE'}
                isWinner={winner === match.opponent_id}
                isLoser={!!winner && winner !== match.opponent_id && !!match.opponent_id}
                hasOpponent={!!match.opponent_id}
                position="bottom"
            />
        </div>
    );
}

function PlayerSlot({ name, isWinner, isLoser, hasOpponent, position }: {
    name: string;
    isWinner: boolean;
    isLoser: boolean;
    hasOpponent: boolean;
    position: 'top' | 'bottom';
}) {
    let bgClass = 'bg-white';
    let textClass = 'text-gray-900';

    if (isWinner) {
        bgClass = 'bg-green-50';
        textClass = 'text-green-800 font-bold';
    } else if (isLoser) {
        bgClass = 'bg-gray-50';
        textClass = 'text-gray-400 line-through';
    } else if (!hasOpponent && position === 'bottom') {
        bgClass = 'bg-gray-50';
        textClass = 'text-gray-300 italic';
    }

    return (
        <div className={`flex items-center justify-between px-3 py-2 ${bgClass}`}>
            <span className={`text-sm truncate ${textClass}`}>{name}</span>
            {isWinner && <Trophy className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
        </div>
    );
}

function ConnectorLines({ position }: { position: number }) {
    const isTop = position % 2 === 0;

    return (
        <div className="flex flex-col items-stretch w-6 self-stretch">
            {/* Horizontal line from match to vertical */}
            <div className="flex-1 relative">
                <div className="absolute top-1/2 left-0 w-full border-t-2 border-gray-300" />
                {/* Vertical connector: goes down for top match, up for bottom match */}
                {isTop && (
                    <div className="absolute top-1/2 right-0 bottom-0 border-r-2 border-gray-300" />
                )}
                {!isTop && (
                    <div className="absolute top-0 right-0 bottom-1/2 border-r-2 border-gray-300" />
                )}
            </div>
        </div>
    );
}

/* ─────────────── List View (compacta) ─────────────── */

function ListView({ rounds, totalRounds, getPlayerName }: ViewProps) {
    return (
        <div className="space-y-6">
            {rounds.map((roundMatches, roundIdx) => {
                const roundNumber = roundIdx + 1;
                const filledMatches = roundMatches.filter(Boolean) as TournamentMatch[];
                if (filledMatches.length === 0) return null;

                return (
                    <div key={roundIdx}>
                        <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                            {getRoundName(roundNumber, totalRounds)}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filledMatches.map(match => (
                                <ListMatchCard key={match.id} match={match} getPlayerName={getPlayerName} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ListMatchCard({ match, getPlayerName }: { match: TournamentMatch; getPlayerName: (id: bigint | null) => string }) {
    const winner = match.winner_id;
    const p1Name = getPlayerName(match.player_id);
    const p2Name = match.opponent_id ? getPlayerName(match.opponent_id) : 'BYE';

    const p1Won = winner === match.player_id;
    const p2Won = winner === match.opponent_id;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="px-3 py-1.5 bg-gray-50 border-b text-xs text-gray-500 flex justify-between">
                <span>{match.walkover ? 'W.O.' : match.game_id ? `Jogo #${match.game_id}` : 'Aguardando Jogo'}</span>
                {(p1Won || p2Won) && <span className="text-green-600 font-medium">Concluido</span>}
            </div>
            <div className="divide-y">
                <div className={`flex items-center justify-between px-3 py-2.5 ${p1Won ? 'bg-green-50' : ''}`}>
                    <span className={`text-sm ${p1Won ? 'font-bold text-green-800' : p2Won ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {p1Name}
                    </span>
                    {p1Won && <Trophy className="w-4 h-4 text-yellow-500" />}
                </div>
                <div className={`flex items-center justify-between px-3 py-2.5 ${p2Won ? 'bg-green-50' : ''}`}>
                    <span className={`text-sm ${p2Won ? 'font-bold text-green-800' : p1Won ? 'text-gray-400 line-through' : match.opponent_id ? 'text-gray-900' : 'text-gray-300 italic'}`}>
                        {p2Name}
                    </span>
                    {p2Won && <Trophy className="w-4 h-4 text-yellow-500" />}
                </div>
            </div>
        </div>
    );
}
