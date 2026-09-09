'use client';

import { useState } from 'react';
import { ClipboardPaste, Check, AlertTriangle, X, RotateCcw } from 'lucide-react';

type SimplePlayer = { id: string; name: string };

type MatchedPlayer = {
    inputName: string;
    match: SimplePlayer | null;
    score: number;
    alternatives: SimplePlayer[];
};

type Props = {
    players: SimplePlayer[];
    onConfirm: (brancos: string[], pretos: string[], brancosCaptain: string, pretosCaptain: string) => void;
    onCancel: () => void;
};

function normalize(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s.]/g, '')
        .trim();
}

function similarity(input: string, candidate: string): number {
    const a = normalize(input);
    const b = normalize(candidate);

    if (a === b) return 1.0;
    if (b.startsWith(a) || a.startsWith(b)) return 0.9;
    if (b.includes(a) || a.includes(b)) return 0.8;

    // Check individual words
    const aWords = a.split(/\s+/);
    const bWords = b.split(/\s+/);
    for (const aw of aWords) {
        for (const bw of bWords) {
            if (aw.length >= 3 && bw.length >= 3) {
                if (aw === bw) return 0.85;
                if (bw.startsWith(aw) || aw.startsWith(bw)) return 0.75;
            }
        }
    }

    // Check first letter + similar length
    if (a[0] === b[0]) {
        const lenRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
        if (lenRatio > 0.6) return 0.3 + lenRatio * 0.2;
    }

    // Levenshtein for short strings
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    const lev = 1 - dist / maxLen;
    return Math.max(0, lev * 0.7);
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function parseTeams(text: string): { brancos: string[]; pretos: string[] } {
    const lines = text
        .split('\n')
        .map(l => l.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim())
        .filter(l => l.length > 0);

    let currentTeam: 'brancos' | 'pretos' | null = null;
    const brancos: string[] = [];
    const pretos: string[] = [];

    for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.includes('branco')) {
            currentTeam = 'brancos';
            continue;
        }
        if (lower.includes('preto') || lower.includes('escur')) {
            currentTeam = 'pretos';
            continue;
        }
        if (currentTeam === 'brancos') brancos.push(line);
        else if (currentTeam === 'pretos') pretos.push(line);
    }

    return { brancos, pretos };
}

function findBestMatch(name: string, players: SimplePlayer[], used: Set<string>): MatchedPlayer {
    const scored = players
        .filter(p => !used.has(p.id))
        .map(p => ({ player: p, score: similarity(name, p.name) }))
        .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternatives = scored.slice(1, 6).map(s => s.player);

    if (best && best.score >= 0.4) {
        return { inputName: name, match: best.player, score: best.score, alternatives };
    }
    return { inputName: name, match: null, score: 0, alternatives: scored.slice(0, 5).map(s => s.player) };
}

export default function PasteTeams({ players, onConfirm, onCancel }: Props) {
    const [text, setText] = useState('');
    const [step, setStep] = useState<'paste' | 'review'>('paste');
    const [brancosMatches, setBrancosMatches] = useState<MatchedPlayer[]>([]);
    const [pretosMatches, setPretosMatches] = useState<MatchedPlayer[]>([]);

    const handleParse = () => {
        const { brancos, pretos } = parseTeams(text);
        if (brancos.length === 0 && pretos.length === 0) return;

        const usedIds = new Set<string>();

        const bMatches = brancos.map(name => {
            const m = findBestMatch(name, players, usedIds);
            if (m.match) usedIds.add(m.match.id);
            return m;
        });

        const pMatches = pretos.map(name => {
            const m = findBestMatch(name, players, usedIds);
            if (m.match) usedIds.add(m.match.id);
            return m;
        });

        setBrancosMatches(bMatches);
        setPretosMatches(pMatches);
        setStep('review');
    };

    const changeMatch = (side: 'brancos' | 'pretos', index: number, newPlayer: SimplePlayer | null) => {
        if (!newPlayer) {
            const setter = side === 'brancos' ? setBrancosMatches : setPretosMatches;
            setter(prev => prev.map((m, i) => i === index ? { ...m, match: null, score: 0 } : m));
            return;
        }

        const oldPlayer = (side === 'brancos' ? brancosMatches : pretosMatches)[index]?.match;

        // Find who currently holds newPlayer (could be in either side)
        let conflictSide: 'brancos' | 'pretos' | null = null;
        let conflictIndex = -1;

        const bIdx = brancosMatches.findIndex(m => m.match?.id === newPlayer.id);
        if (bIdx !== -1 && !(side === 'brancos' && bIdx === index)) {
            conflictSide = 'brancos';
            conflictIndex = bIdx;
        }
        const pIdx = pretosMatches.findIndex(m => m.match?.id === newPlayer.id);
        if (pIdx !== -1 && !(side === 'pretos' && pIdx === index)) {
            conflictSide = 'pretos';
            conflictIndex = pIdx;
        }

        // Build new state for both sides in one go
        const newBrancos = brancosMatches.map((m, i) => {
            // This is the row we're assigning the new player to
            if (side === 'brancos' && i === index) {
                return { ...m, match: newPlayer, score: 1.0 };
            }
            // This is the conflict row that gets the old player (swap)
            if (conflictSide === 'brancos' && i === conflictIndex) {
                return { ...m, match: oldPlayer ?? null, score: oldPlayer ? 0.5 : 0 };
            }
            return m;
        });

        const newPretos = pretosMatches.map((m, i) => {
            if (side === 'pretos' && i === index) {
                return { ...m, match: newPlayer, score: 1.0 };
            }
            if (conflictSide === 'pretos' && i === conflictIndex) {
                return { ...m, match: oldPlayer ?? null, score: oldPlayer ? 0.5 : 0 };
            }
            return m;
        });

        setBrancosMatches(newBrancos);
        setPretosMatches(newPretos);
    };

    const handleConfirm = () => {
        const bIds = brancosMatches.filter(m => m.match).map(m => m.match!.id);
        const pIds = pretosMatches.filter(m => m.match).map(m => m.match!.id);
        if (bIds.length === 0 || pIds.length === 0) return;
        onConfirm(bIds, pIds, bIds[0], pIds[0]);
    };

    const allUsed = new Set([
        ...brancosMatches.filter(m => m.match).map(m => m.match!.id),
        ...pretosMatches.filter(m => m.match).map(m => m.match!.id),
    ]);

    const hasUnmatched = [...brancosMatches, ...pretosMatches].some(m => !m.match);

    if (step === 'paste') {
        return (
            <div className="w-full bg-white border-2 border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700 font-medium">
                        <ClipboardPaste className="w-4 h-4" />
                        Colar Equipas
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-sm text-gray-600">
                    Cola o texto com as equipas. O sistema deteta automaticamente &ldquo;Brancos&rdquo; e &ldquo;Pretos&rdquo; e faz match com os jogadores.
                </p>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Brancos 🥋\nRafa\nMoura\nJaime\n...\n\nPretos 🎩\nHems\nRafa S.\nVala\n...`}
                    rows={14}
                    className="w-full border-2 border-gray-300 rounded-md p-3 text-sm text-gray-900 font-mono resize-none"
                    autoFocus
                />
                <button
                    onClick={handleParse}
                    disabled={!text.trim()}
                    className="w-full py-2.5 rounded-md text-white font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                    Analisar Nomes
                </button>
            </div>
        );
    }

    return (
        <div className="w-full bg-white border-2 border-blue-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <ClipboardPaste className="w-4 h-4" />
                    Confirmar Matches
                </div>
                <button onClick={() => setStep('paste')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    <RotateCcw className="w-3.5 h-3.5" /> Voltar
                </button>
            </div>

            {hasUnmatched && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Alguns nomes nao foram reconhecidos. Corrige manualmente.
                </div>
            )}

            <button
                type="button"
                onClick={() => {
                    const oldB = brancosMatches;
                    const oldP = pretosMatches;
                    setBrancosMatches(oldP);
                    setPretosMatches(oldB);
                }}
                className="w-full flex items-center justify-center gap-2 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors text-sm font-medium"
            >
                ⇄ Trocar Equipas
            </button>

            <div className="grid grid-cols-2 gap-3">
                <MatchReviewColumn
                    label="Brancos"
                    matches={brancosMatches}
                    allPlayers={players}
                    usedIds={allUsed}
                    onChange={(i, p) => changeMatch('brancos', i, p)}
                    variant="light"
                />
                <MatchReviewColumn
                    label="Pretos"
                    matches={pretosMatches}
                    allPlayers={players}
                    usedIds={allUsed}
                    onChange={(i, p) => changeMatch('pretos', i, p)}
                    variant="dark"
                />
            </div>

            <button
                onClick={handleConfirm}
                className="w-full py-2.5 rounded-md text-white font-medium bg-green-600 hover:bg-green-700 transition-colors"
            >
                <Check className="w-4 h-4 inline mr-1" />
                Confirmar e Preencher
            </button>
        </div>
    );
}

type MatchReviewColumnProps = {
    label: string;
    matches: MatchedPlayer[];
    allPlayers: SimplePlayer[];
    usedIds: Set<string>;
    onChange: (index: number, player: SimplePlayer | null) => void;
    variant: 'light' | 'dark';
};

function MatchReviewColumn({ label, matches, allPlayers, usedIds, onChange, variant }: MatchReviewColumnProps) {
    const isLight = variant === 'light';
    const bgClass = isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-600';
    const textClass = isLight ? 'text-gray-900' : 'text-gray-100';

    return (
        <div className={`rounded-lg border-2 p-3 ${bgClass}`}>
            <h3 className={`font-bold text-center mb-2 ${textClass}`}>{label}</h3>
            <div className="flex flex-col gap-2">
                {matches.map((m, i) => (
                    <MatchRow
                        key={i}
                        matched={m}
                        allPlayers={allPlayers}
                        usedIds={usedIds}
                        onChange={p => onChange(i, p)}
                        isCaptain={i === 0}
                        variant={variant}
                    />
                ))}
            </div>
        </div>
    );
}

type MatchRowProps = {
    matched: MatchedPlayer;
    allPlayers: SimplePlayer[];
    usedIds: Set<string>;
    onChange: (player: SimplePlayer | null) => void;
    isCaptain: boolean;
    variant: 'light' | 'dark';
};

function MatchRow({ matched, allPlayers, usedIds, onChange, isCaptain, variant }: MatchRowProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [search, setSearch] = useState('');

    const isLight = variant === 'light';
    const chipBg = isLight ? 'bg-white' : 'bg-gray-700';

    const isGood = matched.match && matched.score >= 0.7;
    const isWeak = matched.match && matched.score < 0.7;
    const isMissing = !matched.match;

    const borderColor = isGood ? 'border-green-300' : isWeak ? 'border-amber-300' : 'border-red-300';
    const iconColor = isGood ? 'text-green-500' : isWeak ? 'text-amber-500' : 'text-red-500';

    // Show ALL players, not just unused — sorted: unused first, then used
    const allSorted = [...allPlayers].sort((a, b) => {
        const aUsed = usedIds.has(a.id) && a.id !== matched.match?.id;
        const bUsed = usedIds.has(b.id) && b.id !== matched.match?.id;
        if (aUsed !== bUsed) return aUsed ? 1 : -1;
        return a.name.localeCompare(b.name);
    });

    const filtered = search
        ? allSorted.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        : allSorted;

    return (
        <div className="relative">
            <div
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border ${borderColor} ${chipBg} cursor-pointer`}
                onClick={() => setShowDropdown(!showDropdown)}
            >
                {isGood && <Check className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
                {isWeak && <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
                {isMissing && <X className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        {isCaptain && <span className="text-yellow-500 text-xs">⭐</span>}
                        <span className={`text-sm font-medium truncate ${isLight ? 'text-gray-900' : 'text-gray-100'}`}>
                            {matched.match?.name ?? '???'}
                        </span>
                    </div>
                    <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        &larr; &ldquo;{matched.inputName}&rdquo;
                    </span>
                </div>
            </div>

            {showDropdown && (
                <div className={`absolute z-20 w-full mt-1 rounded-md border border-gray-300 shadow-lg ${isLight ? 'bg-white' : 'bg-gray-700'} max-h-48 overflow-y-auto`}>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Procurar..."
                        className={`w-full px-2 py-1.5 text-sm border-b border-gray-200 sticky top-0 ${isLight ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-100'}`}
                        autoFocus
                        onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                    />
                    {filtered.map(p => {
                        const isCurrentMatch = p.id === matched.match?.id;
                        const isUsedElsewhere = usedIds.has(p.id) && !isCurrentMatch;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                    onChange(p);
                                    setShowDropdown(false);
                                    setSearch('');
                                }}
                                className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between
                                    ${isCurrentMatch
                                        ? (isLight ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-blue-900 text-blue-200 font-medium')
                                        : isUsedElsewhere
                                            ? (isLight ? 'text-gray-400 hover:bg-gray-50' : 'text-gray-500 hover:bg-gray-600')
                                            : (isLight ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-100 hover:bg-gray-600')
                                    } transition-colors`}
                            >
                                <span>{p.name}</span>
                                {isCurrentMatch && <Check className="w-3 h-3" />}
                                {isUsedElsewhere && <span className="text-xs opacity-60">🔄 trocar</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
