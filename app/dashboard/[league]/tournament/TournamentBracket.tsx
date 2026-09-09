'use client'

import { TournamentMatch, getRoundName } from '@/app/lib/tournament'
import { forceMatchResult } from '@/app/lib/actions'
import { Trophy, LayoutGrid, GitBranch, Gavel } from 'lucide-react'
import { useState, useTransition } from 'react'

type SimplePlayer = { id: string; name: string };

type Props = {
    matches: TournamentMatch[]
    players: SimplePlayer[]
    onCreateBracket: (playerIds: string[]) => Promise<void>
    isAdmin?: boolean
}

export default function TournamentBracket({ matches, players, onCreateBracket, isAdmin }: Props) {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
    const [view, setView] = useState<'bracket' | 'list'>('bracket');

    const getPlayerName = (id: bigint | null) => {
        if (!id) return 'TBD';
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

    // Calculate totalRounds from round-1 match count (not from max round in DB)
    const r1Matches = matches.filter(m => m.round === 1);
    const playerCount = r1Matches.length * 2;
    const totalRounds = Math.max(Math.ceil(Math.log2(playerCount)), Math.max(...matches.map(m => m.round)));

    // Organize matches by round
    const roundMatches: (TournamentMatch | null)[][] = Array.from({ length: totalRounds }, () => []);
    for (const m of matches) {
        while (roundMatches[m.round - 1].length < m.position) roundMatches[m.round - 1].push(null);
        roundMatches[m.round - 1][m.position - 1] = m;
    }

    // Fill empty slots per round based on expected count
    for (let r = 0; r < totalRounds; r++) {
        const expectedCount = Math.pow(2, totalRounds - 1 - r);
        while (roundMatches[r].length < expectedCount) roundMatches[r].push(null);
    }

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
                ? <BracketView rounds={roundMatches} totalRounds={totalRounds} getPlayerName={getPlayerName} isAdmin={isAdmin} />
                : <ListView rounds={roundMatches} totalRounds={totalRounds} getPlayerName={getPlayerName} isAdmin={isAdmin} />
            }
        </div>
    );
}

/* ─────────────── Bracket View ─────────────── */

type ViewProps = {
    rounds: (TournamentMatch | null)[][];
    totalRounds: number;
    getPlayerName: (id: bigint | null) => string;
    isAdmin?: boolean;
};

const MATCH_HEIGHT = 64;
const MATCH_GAP_BASE = 12;

function BracketView({ rounds, totalRounds, getPlayerName, isAdmin }: ViewProps) {
    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex items-start min-w-fit">
                {rounds.map((roundMatchList, roundIdx) => {
                    const roundNumber = roundIdx + 1;
                    const isLast = roundNumber === totalRounds;

                    // Spacing grows exponentially so matches align vertically across rounds
                    const gap = MATCH_GAP_BASE * Math.pow(2, roundIdx);
                    // Top padding to center each round relative to round 1
                    const topPad = roundIdx === 0 ? 0 : (MATCH_HEIGHT + MATCH_GAP_BASE) * (Math.pow(2, roundIdx) - 1) / 2;

                    return (
                        <div key={roundIdx} className="flex flex-col shrink-0">
                            <h3 className="font-semibold text-center text-sm text-gray-600 mb-3 px-2 whitespace-nowrap">
                                {getRoundName(roundNumber, totalRounds)}
                            </h3>
                            <div className="flex flex-col" style={{ gap: `${gap}px`, paddingTop: `${topPad}px` }}>
                                {roundMatchList.map((match, idx) => (
                                    <div key={idx} className="flex items-center">
                                        {/* Incoming connector (from previous round) */}
                                        {roundIdx > 0 && <InConnector />}

                                        <MatchCard
                                            match={match}
                                            getPlayerName={getPlayerName}
                                            isFinal={isLast}
                                            isAdmin={isAdmin}
                                        />

                                        {/* Outgoing connector (to next round) */}
                                        {!isLast && <OutConnector position={idx} gap={gap} />}
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

function InConnector() {
    return (
        <div className="w-5 flex items-center">
            <div className="w-full border-t-2 border-gray-300" />
        </div>
    );
}

function OutConnector({ position, gap }: { position: number; gap: number }) {
    const isTop = position % 2 === 0;
    const verticalHeight = (MATCH_HEIGHT + gap) / 2;

    return (
        <div className="relative w-5" style={{ height: `${MATCH_HEIGHT}px` }}>
            {/* Horizontal line out */}
            <div className="absolute left-0 top-1/2 w-2.5 border-t-2 border-gray-300" />
            {/* Vertical line */}
            {isTop && (
                <div
                    className="absolute border-r-2 border-gray-300"
                    style={{ right: 0, top: '50%', height: `${verticalHeight}px` }}
                />
            )}
            {!isTop && (
                <div
                    className="absolute border-r-2 border-gray-300"
                    style={{ right: 0, bottom: '50%', height: `${verticalHeight}px` }}
                />
            )}
            {/* Horizontal line to next round */}
            <div
                className="absolute border-t-2 border-gray-300"
                style={{
                    right: 0,
                    top: isTop ? `calc(50% + ${verticalHeight}px)` : `calc(50% - ${verticalHeight}px)`,
                    width: '10px',
                }}
            />
        </div>
    );
}

function MatchCard({ match, getPlayerName, isFinal, isAdmin }: {
    match: TournamentMatch | null;
    getPlayerName: (id: bigint | null) => string;
    isFinal: boolean;
    isAdmin?: boolean;
}) {
    const [showActions, setShowActions] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [reason, setReason] = useState('');

    if (!match) {
        return (
            <div className="w-44 border-2 border-dashed border-gray-200 rounded-md bg-gray-50/50" style={{ height: `${MATCH_HEIGHT}px` }}>
                <div className="flex items-center justify-center h-full text-xs text-gray-400">A aguardar</div>
            </div>
        );
    }

    const winner = match.winner_id;
    const canForce = isAdmin && !winner && match.opponent_id;
    const p1Name = getPlayerName(match.player_id);
    const p2Name = match.opponent_id ? getPlayerName(match.opponent_id) : 'BYE';

    const handleForce = (winnerId: bigint) => {
        const loserName = winnerId === match.player_id ? p2Name : p1Name;
        const winnerName = winnerId === match.player_id ? p1Name : p2Name;
        if (!confirm(`Forcar ${winnerName} como vencedor?\n${loserName} sera eliminado.\n\nRazao: ${reason || 'Sem razao'}`)) return;
        startTransition(async () => {
            await forceMatchResult(match.id, winnerId, reason || 'Decisao admin');
            setShowActions(false);
            setReason('');
        });
    };

    return (
        <div className="relative">
            <div
                className={`w-44 rounded-md overflow-hidden shadow-sm border flex flex-col ${isFinal ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-gray-200'}`}
                style={{ height: `${MATCH_HEIGHT}px` }}
                onClick={() => canForce && setShowActions(!showActions)}
            >
                <div className={`flex items-center justify-between px-2 flex-1 ${
                    winner === match.player_id ? 'bg-green-50' : 'bg-white'
                }`}>
                    <span className={`text-xs truncate ${
                        winner === match.player_id ? 'font-bold text-green-800' :
                        winner && winner !== match.player_id ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}>
                        {p1Name}
                    </span>
                    {winner === match.player_id && <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />}
                </div>
                <div className="border-t border-gray-100" />
                <div className={`flex items-center justify-between px-2 flex-1 ${
                    winner === match.opponent_id ? 'bg-green-50' : 'bg-white'
                }`}>
                    <span className={`text-xs truncate ${
                        !match.opponent_id ? 'text-gray-300 italic' :
                        winner === match.opponent_id ? 'font-bold text-green-800' :
                        winner && winner !== match.opponent_id ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}>
                        {p2Name}
                    </span>
                    {winner === match.opponent_id && <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />}
                </div>
                {/* Status bar */}
                <div className={`px-2 py-0.5 text-[10px] border-t flex justify-between items-center ${isFinal ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'}`}>
                    <span>
                        {match.walkover ? `W.O.${match.walkover_reason ? ` (${match.walkover_reason})` : ''}` : match.game_id ? `Jogo #${match.game_id}` : 'Aguardando'}
                        {isFinal && winner ? ' 🏆' : ''}
                    </span>
                    {canForce && <Gavel className="w-3 h-3 text-gray-400" />}
                </div>
            </div>

            {/* Admin force panel */}
            {showActions && canForce && (
                <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <Gavel className="w-3 h-3" /> Forcar Resultado
                    </p>
                    <input
                        type="text"
                        placeholder="Razao (opcional)"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-900"
                        onClick={e => e.stopPropagation()}
                    />
                    <div className="flex flex-col gap-1.5">
                        <button
                            onClick={e => { e.stopPropagation(); handleForce(match.player_id); }}
                            disabled={isPending}
                            className="w-full text-left px-2 py-1.5 text-xs rounded bg-green-50 hover:bg-green-100 text-green-800 font-medium disabled:opacity-50 transition-colors"
                        >
                            ✓ {p1Name} avanca
                        </button>
                        {match.opponent_id && (
                            <button
                                onClick={e => { e.stopPropagation(); handleForce(match.opponent_id!); }}
                                disabled={isPending}
                                className="w-full text-left px-2 py-1.5 text-xs rounded bg-green-50 hover:bg-green-100 text-green-800 font-medium disabled:opacity-50 transition-colors"
                            >
                                ✓ {p2Name} avanca
                            </button>
                        )}
                    </div>
                    <button
                        onClick={e => { e.stopPropagation(); setShowActions(false); }}
                        className="w-full text-xs text-gray-500 hover:text-gray-700 py-1"
                    >
                        Cancelar
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─────────────── List View ─────────────── */

function ListView({ rounds, totalRounds, getPlayerName, isAdmin }: ViewProps) {
    return (
        <div className="space-y-6">
            {rounds.map((roundMatchList, roundIdx) => {
                const roundNumber = roundIdx + 1;
                const filledMatches = roundMatchList.filter(Boolean) as TournamentMatch[];
                if (filledMatches.length === 0) return null;

                return (
                    <div key={roundIdx}>
                        <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                            {getRoundName(roundNumber, totalRounds)}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filledMatches.map(match => (
                                <ListMatchCard key={match.id} match={match} getPlayerName={getPlayerName} isAdmin={isAdmin} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ListMatchCard({ match, getPlayerName, isAdmin }: { match: TournamentMatch; getPlayerName: (id: bigint | null) => string; isAdmin?: boolean }) {
    const [showActions, setShowActions] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [reason, setReason] = useState('');

    const winner = match.winner_id;
    const p1Name = getPlayerName(match.player_id);
    const p2Name = match.opponent_id ? getPlayerName(match.opponent_id) : 'BYE';
    const p1Won = winner === match.player_id;
    const p2Won = winner === match.opponent_id;
    const canForce = isAdmin && !winner && match.opponent_id;

    const handleForce = (winnerId: bigint) => {
        const winnerName = winnerId === match.player_id ? p1Name : p2Name;
        const loserName = winnerId === match.player_id ? p2Name : p1Name;
        if (!confirm(`Forcar ${winnerName} como vencedor?\n${loserName} sera eliminado.\n\nRazao: ${reason || 'Sem razao'}`)) return;
        startTransition(async () => {
            await forceMatchResult(match.id, winnerId, reason || 'Decisao admin');
            setShowActions(false);
            setReason('');
        });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="px-3 py-1.5 bg-gray-50 border-b text-xs text-gray-500 flex justify-between items-center">
                <span>
                    {match.walkover ? `W.O.${match.walkover_reason ? ` — ${match.walkover_reason}` : ''}` : match.game_id ? `Jogo #${match.game_id}` : 'Aguardando Jogo'}
                </span>
                <div className="flex items-center gap-2">
                    {(p1Won || p2Won) && <span className="text-green-600 font-medium">Concluido</span>}
                    {canForce && (
                        <button onClick={() => setShowActions(!showActions)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Forcar resultado">
                            <Gavel className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
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

            {/* Force result panel */}
            {showActions && canForce && (
                <div className="border-t p-3 bg-amber-50 space-y-2">
                    <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                        <Gavel className="w-3 h-3" /> Forcar Resultado
                    </p>
                    <input
                        type="text"
                        placeholder="Razao: desistencia, lesao, etc."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 text-gray-900"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleForce(match.player_id)}
                            disabled={isPending}
                            className="flex-1 px-2 py-1.5 text-xs rounded bg-green-100 hover:bg-green-200 text-green-800 font-medium disabled:opacity-50 transition-colors"
                        >
                            ✓ {p1Name}
                        </button>
                        {match.opponent_id && (
                            <button
                                onClick={() => handleForce(match.opponent_id!)}
                                disabled={isPending}
                                className="flex-1 px-2 py-1.5 text-xs rounded bg-green-100 hover:bg-green-200 text-green-800 font-medium disabled:opacity-50 transition-colors"
                            >
                                ✓ {p2Name}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
