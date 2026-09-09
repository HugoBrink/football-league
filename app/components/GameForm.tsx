'use client';

import { Star, X, Minus, Plus, ArrowLeft, Search, UserPlus, ClipboardPaste } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import PasteTeams from './PasteTeams';

type SimplePlayer = { id: string; name: string };

type TournamentMatchOption = {
    id: number;
    round: number;
    playerName: string;
    opponentName: string;
};

type Props = {
    players: SimplePlayer[];
    formAction: (formData: FormData) => Promise<void>;
    onCreatePlayer?: (name: string) => Promise<{ id: string; name: string }>;
    tournamentMatches?: TournamentMatchOption[];
    leagueSlug?: string;
    leagueId?: number;
    initialData?: {
        date: string;
        brancosCaptain: string | null;
        brancosPlayers: string[];
        pretosCaptain: string | null;
        pretosPlayers: string[];
        brancosScore: number;
        pretosScore: number;
        tournamentMatchId?: number;
        numero?: number;
    };
};

type TeamSide = 'brancos' | 'pretos';

const TEAM_SIZE = 7;

const ROUND_LABELS: Record<number, string> = {
    1: 'Primeira Ronda',
    2: 'Quartos de Final',
    3: 'Semi Final',
    4: 'Final',
};
const roundLabel = (round: number) => ROUND_LABELS[round] ?? `Ronda ${round}`;

export default function GameForm({ players, formAction, onCreatePlayer, tournamentMatches, leagueSlug, leagueId, initialData }: Readonly<Props>) {
    const isEdit = !!initialData;

    const [extraPlayers, setExtraPlayers] = useState<SimplePlayer[]>([]);
    const allPlayers = [...players, ...extraPlayers];

    const [brancos, setBrancos] = useState<string[]>(() => {
        if (!initialData) return [];
        const all = [initialData.brancosCaptain, ...initialData.brancosPlayers].filter(Boolean) as string[];
        return [...new Set(all)];
    });

    const [pretos, setPretos] = useState<string[]>(() => {
        if (!initialData) return [];
        const all = [initialData.pretosCaptain, ...initialData.pretosPlayers].filter(Boolean) as string[];
        return [...new Set(all)];
    });

    const [brancosCaptain, setBrancosCaptain] = useState<string | null>(initialData?.brancosCaptain ?? null);
    const [pretosCaptain, setPretosCaptain] = useState<string | null>(initialData?.pretosCaptain ?? null);

    const [brancosScore, setBrancosScore] = useState(initialData?.brancosScore ?? 0);
    const [pretosScore, setPretosScore] = useState(initialData?.pretosScore ?? 0);

    const [date, setDate] = useState(
        initialData?.date ?? new Date().toISOString().split('T')[0]
    );

    const [tournamentMatchId, setTournamentMatchId] = useState<string>(
        initialData?.tournamentMatchId ? String(initialData.tournamentMatchId) : ''
    );

    const [errors, setErrors] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();
    const [pasteMode, setPasteMode] = useState(false);

    const assigned = new Set([...brancos, ...pretos]);
    const available = allPlayers.filter(p => !assigned.has(String(p.id)));

    function handlePasteConfirm(bIds: string[], pIds: string[], bCaptain: string, pCaptain: string) {
        setBrancos(bIds);
        setPretos(pIds);
        setBrancosCaptain(bCaptain);
        setPretosCaptain(pCaptain);
        setPasteMode(false);
        setErrors([]);
    }

    async function handleCreatePlayer(name: string, side: TeamSide) {
        if (!onCreatePlayer) return;
        const newPlayer = await onCreatePlayer(name);
        setExtraPlayers(prev => [...prev, newPlayer]);
        addPlayer(newPlayer.id, side);
    }

    function addPlayer(playerId: string, side: TeamSide) {
        const id = String(playerId);
        if (side === 'brancos') {
            if (brancos.length >= TEAM_SIZE) return;
            setBrancos(prev => [...prev, id]);
            if (!brancosCaptain) setBrancosCaptain(id);
        } else {
            if (pretos.length >= TEAM_SIZE) return;
            setPretos(prev => [...prev, id]);
            if (!pretosCaptain) setPretosCaptain(id);
        }
        setErrors([]);
    }

    function removePlayer(playerId: string, side: TeamSide) {
        const id = String(playerId);
        if (side === 'brancos') {
            setBrancos(prev => prev.filter(p => p !== id));
            if (brancosCaptain === id) {
                setBrancosCaptain(brancos.find(p => p !== id) ?? null);
            }
        } else {
            setPretos(prev => prev.filter(p => p !== id));
            if (pretosCaptain === id) {
                setPretosCaptain(pretos.find(p => p !== id) ?? null);
            }
        }
    }

    function makeCaptain(playerId: string, side: TeamSide) {
        if (side === 'brancos') setBrancosCaptain(playerId);
        else setPretosCaptain(playerId);
    }

    function validate(): string[] {
        const errs: string[] = [];
        if (brancos.length !== TEAM_SIZE) errs.push(`Brancos precisa de ${TEAM_SIZE} jogadores (tem ${brancos.length})`);
        if (pretos.length !== TEAM_SIZE) errs.push(`Pretos precisa de ${TEAM_SIZE} jogadores (tem ${pretos.length})`);
        if (!brancosCaptain) errs.push('Escolhe um capitão para os Brancos');
        if (!pretosCaptain) errs.push('Escolhe um capitão para os Pretos');
        if (!date) errs.push('Escolhe a data do jogo');
        return errs;
    }

    function handleSubmit() {
        const errs = validate();
        if (errs.length > 0) {
            setErrors(errs);
            return;
        }

        const fd = new FormData();
        fd.set('date', date);
        fd.set('brancos-score', String(brancosScore));
        fd.set('pretos-score', String(pretosScore));
        fd.set('captain-brancos', brancosCaptain!);
        fd.set('captain-pretos', pretosCaptain!);

        const brancosNonCaptain = brancos.filter(id => id !== brancosCaptain);
        for (const id of brancosNonCaptain) {
            fd.append('players-brancos[]', id);
        }

        const pretosNonCaptain = pretos.filter(id => id !== pretosCaptain);
        for (const id of pretosNonCaptain) {
            fd.append('players-pretos[]', id);
        }

        if (tournamentMatchId) {
            fd.set('tournament-match-id', tournamentMatchId);
        }

        fd.set('league_id', String(leagueId ?? 1));

        startTransition(() => {
            formAction(fd);
        });
    }

    const getName = (id: string) => allPlayers.find(p => String(p.id) === id)?.name ?? '?';

    let submitLabel = isEdit ? 'Editar Jogo' : 'Criar Jogo';
    if (isPending) submitLabel = 'A guardar...';

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto px-4 pb-8">
            {/* Header */}
            <div className="flex flex-row items-center gap-2">
                <Link href={leagueSlug ? `/dashboard/${leagueSlug}/games` : '/dashboard/games'} className="bg-slate-400 text-white rounded-md px-2 py-1 sm:hidden">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1>{isEdit ? `Editar jogo número: ${initialData.numero}` : 'Novo jogo'}</h1>
            </div>

            {/* Tournament match selector */}
            {tournamentMatches && tournamentMatches.length > 0 && (
                <div className="w-full">
                    <label htmlFor="tournament-match-id" className="block text-sm font-medium text-gray-700">
                        Jogo da Taça Mocamfe (opcional)
                    </label>
                    <select
                        id="tournament-match-id"
                        value={tournamentMatchId}
                        onChange={e => setTournamentMatchId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="">Selecionar jogo do torneio...</option>
                        {tournamentMatches.map(match => (
                            <option key={match.id} value={match.id}>
                                {roundLabel(match.round)}: {match.playerName} vs {match.opponentName}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Date */}
            <div className="w-full">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Data do jogo</label>
                <input
                    type="date"
                    id="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full"
                />
            </div>

            {/* Paste mode */}
            {!isEdit && !pasteMode && (
                <button
                    type="button"
                    onClick={() => setPasteMode(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-md border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors text-sm font-medium"
                >
                    <ClipboardPaste className="w-4 h-4" />
                    Colar Equipas (texto)
                </button>
            )}

            {pasteMode && (
                <PasteTeams
                    players={allPlayers}
                    onConfirm={handlePasteConfirm}
                    onCancel={() => setPasteMode(false)}
                />
            )}

            {/* Teams side by side, each with its own search */}
            <div className="grid grid-cols-2 gap-3 w-full">
                <TeamZone
                    label="Brancos"
                    side="brancos"
                    playerIds={brancos}
                    captainId={brancosCaptain}
                    available={available}
                    getName={getName}
                    onAdd={addPlayer}
                    onRemove={removePlayer}
                    onMakeCaptain={makeCaptain}
                    onCreatePlayer={onCreatePlayer ? handleCreatePlayer : undefined}
                    variant="light"
                />
                <TeamZone
                    label="Pretos"
                    side="pretos"
                    playerIds={pretos}
                    captainId={pretosCaptain}
                    available={available}
                    getName={getName}
                    onAdd={addPlayer}
                    onRemove={removePlayer}
                    onMakeCaptain={makeCaptain}
                    onCreatePlayer={onCreatePlayer ? handleCreatePlayer : undefined}
                    variant="dark"
                />
            </div>

            {/* Scoreboard */}
            <div className="w-full">
                <h2 className="text-center font-bold text-lg mb-3">Resultado</h2>
                <div className="flex items-center justify-center gap-6">
                    <ScoreInput label="Brancos" value={brancosScore} onChange={setBrancosScore} variant="light" />
                    <span className="text-2xl font-bold text-gray-400">-</span>
                    <ScoreInput label="Pretos" value={pretosScore} onChange={setPretosScore} variant="dark" />
                </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
                <div className="w-full bg-red-50 border border-red-200 rounded-md p-3">
                    {errors.map(err => (
                        <p key={err} className="text-red-600 text-sm">{err}</p>
                    ))}
                </div>
            )}

            {/* Submit */}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full py-3 rounded-md text-white font-bold text-lg
                    bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {submitLabel}
            </button>
        </div>
    );
}

type TeamZoneProps = Readonly<{
    label: string;
    side: TeamSide;
    playerIds: string[];
    captainId: string | null;
    available: SimplePlayer[];
    getName: (id: string) => string;
    onAdd: (id: string, side: TeamSide) => void;
    onRemove: (id: string, side: TeamSide) => void;
    onMakeCaptain: (id: string, side: TeamSide) => void;
    onCreatePlayer?: (name: string, side: TeamSide) => Promise<void>;
    variant: 'light' | 'dark';
}>;

function TeamZone({
    label, side, playerIds, captainId, available, getName, onAdd, onRemove, onMakeCaptain, onCreatePlayer, variant,
}: TeamZoneProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isFull = playerIds.length >= TEAM_SIZE;

    const trimmed = search.trim();
    const filtered = trimmed
        ? available.filter(p => p.name.toLowerCase().includes(trimmed.toLowerCase()))
        : available;

    const showCreateOption = onCreatePlayer && trimmed.length >= 2 && filtered.length === 0;

    function handleSelect(playerId: string) {
        onAdd(playerId, side);
        setSearch('');
        setIsOpen(false);
        inputRef.current?.focus();
    }

    async function handleCreate() {
        if (!onCreatePlayer || !trimmed) return;
        setIsCreating(true);
        await onCreatePlayer(trimmed, side);
        setSearch('');
        setIsOpen(false);
        setIsCreating(false);
        inputRef.current?.focus();
    }

    const isLight = variant === 'light';
    const bgClass = isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-600';
    const textClass = isLight ? 'text-gray-900' : 'text-gray-100';
    const chipBg = isLight ? 'bg-white border-gray-200' : 'bg-gray-700 border-gray-500';
    const emptyBorder = isLight ? 'border-gray-200' : 'border-gray-600';
    const emptyText = isLight ? 'text-gray-300' : 'text-gray-500';
    const searchBg = isLight ? 'bg-white' : 'bg-gray-700 text-gray-100';
    const dropdownBg = isLight ? 'bg-white' : 'bg-gray-700';
    const dropdownHover = isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-600';

    const emptySlots = Math.max(0, TEAM_SIZE - playerIds.length);

    return (
        <div className={`rounded-lg border-2 p-3 ${bgClass}`}>
            <h3 className={`font-bold text-center mb-2 ${textClass}`}>
                {label} <span className="font-normal text-sm opacity-60">({playerIds.length}/{TEAM_SIZE})</span>
            </h3>

            <div className="flex flex-col gap-1.5">
                {playerIds.map(id => {
                    const isCaptain = id === captainId;
                    return (
                        <div
                            key={id}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md border ${chipBg} ${textClass}`}
                        >
                            <button
                                type="button"
                                onClick={() => onMakeCaptain(id, side)}
                                title={isCaptain ? 'Capitão' : 'Tornar capitão'}
                                className="shrink-0"
                            >
                                <Star
                                    className={`w-4 h-4 ${isCaptain ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                                />
                            </button>
                            <span className="flex-1 text-sm truncate">{getName(id)}</span>
                            <button
                                type="button"
                                onClick={() => onRemove(id, side)}
                                className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}

                {Array.from({ length: emptySlots }, (_, i) => (
                    <div
                        key={`empty-${side}-${i}`}
                        className={`flex items-center justify-center px-2 py-1 rounded-md border border-dashed ${emptyBorder} ${emptyText}`}
                    >
                        <span className="text-sm">---</span>
                    </div>
                ))}
            </div>

            {/* Search input */}
            {!isFull && (
                <div className="relative mt-2">
                    <div className="relative">
                        <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${emptyText}`} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setIsOpen(true); }}
                            onFocus={() => setIsOpen(true)}
                            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                            placeholder="Procurar..."
                            className={`w-full pl-7 pr-2 py-1.5 text-sm rounded-md border border-gray-300 ${searchBg}`}
                        />
                    </div>
                    {isOpen && (filtered.length > 0 || showCreateOption) && (
                        <div className={`absolute z-10 w-full mt-1 rounded-md border border-gray-300 shadow-lg ${dropdownBg} max-h-48 overflow-y-auto`}>
                            {filtered.map(player => (
                                <button
                                    key={String(player.id)}
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => handleSelect(String(player.id))}
                                    className={`w-full text-left px-3 py-1.5 text-sm ${textClass} ${dropdownHover} transition-colors`}
                                >
                                    {player.name}
                                </button>
                            ))}
                            {showCreateOption && (
                                <button
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={handleCreate}
                                    disabled={isCreating}
                                    className={`w-full text-left px-3 py-1.5 text-sm font-medium
                                        text-green-600 ${dropdownHover} transition-colors
                                        border-t border-gray-200 flex items-center gap-1.5
                                        disabled:opacity-50`}
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    {isCreating ? 'A criar...' : `Criar "${trimmed}"`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

type ScoreInputProps = Readonly<{
    label: string;
    value: number;
    onChange: (v: number) => void;
    variant: 'light' | 'dark';
}>;

function ScoreInput({ label, value, onChange, variant }: ScoreInputProps) {
    const bgClass = variant === 'light' ? 'bg-gray-50' : 'bg-gray-800';
    const textClass = variant === 'light' ? 'text-gray-900' : 'text-gray-100';

    return (
        <div className="flex flex-col items-center gap-1">
            <span className={`text-sm font-medium ${textClass}`}>{label}</span>
            <div className={`flex items-center gap-2 rounded-lg border-2 border-gray-300 px-2 py-1 ${bgClass}`}>
                <button
                    type="button"
                    onClick={() => onChange(Math.max(0, value - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-full
                        bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 transition-colors"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <span className={`text-3xl font-bold w-8 text-center tabular-nums ${textClass}`}>
                    {value}
                </span>
                <button
                    type="button"
                    onClick={() => onChange(value + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-full
                        bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
