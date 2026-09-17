'use client'

import { useState } from 'react'

type Props = {
    brancosAvg: number
    pretosAvg: number
}

function expectedScore(a: number, b: number) {
    return 1 / (1 + Math.pow(10, (b - a) / 200));
}

function marginMult(gd: number) {
    if (gd < 3) return 1.0;
    if (gd <= 5) return 1.25;
    return 1.5;
}

type Row = {
    label: string
    deltaBrancos: number
    deltaPretos: number
    highlight: 'brancos' | 'pretos' | 'draw'
    multiplier: string
}

export default function EloSimulation({ brancosAvg, pretosAvg }: Props) {
    const [open, setOpen] = useState(false);

    const K = 32;
    const expB = expectedScore(brancosAvg, pretosAvg);

    const compute = (brancosWin: boolean | null, gd: number): { deltaB: number; deltaP: number } => {
        const mm = marginMult(gd);
        const actualB = brancosWin === null ? 0.5 : (brancosWin ? 1 : 0);
        return {
            deltaB: Math.round(K * mm * (actualB - expB)),
            deltaP: Math.round(K * mm * ((1 - actualB) - (1 - expB))),
        };
    };

    const bWin12 = compute(true, 2);
    const bWin35 = compute(true, 3);
    const bWin6 = compute(true, 6);
    const draw = compute(null, 0);
    const pWin12 = compute(false, 2);
    const pWin35 = compute(false, 3);
    const pWin6 = compute(false, 6);

    const rows: Row[] = [
        { label: 'Brancos por 1-2 golos', ...({ deltaBrancos: bWin12.deltaB, deltaPretos: bWin12.deltaP }), highlight: 'brancos', multiplier: '1.0x' },
        { label: 'Brancos por 3-5 golos', ...({ deltaBrancos: bWin35.deltaB, deltaPretos: bWin35.deltaP }), highlight: 'brancos', multiplier: '1.25x' },
        { label: 'Brancos por 6+ golos', ...({ deltaBrancos: bWin6.deltaB, deltaPretos: bWin6.deltaP }), highlight: 'brancos', multiplier: '1.5x' },
        { label: 'Empate', ...({ deltaBrancos: draw.deltaB, deltaPretos: draw.deltaP }), highlight: 'draw', multiplier: '1.0x' },
        { label: 'Pretos por 1-2 golos', ...({ deltaBrancos: pWin12.deltaB, deltaPretos: pWin12.deltaP }), highlight: 'pretos', multiplier: '1.0x' },
        { label: 'Pretos por 3-5 golos', ...({ deltaBrancos: pWin35.deltaB, deltaPretos: pWin35.deltaP }), highlight: 'pretos', multiplier: '1.25x' },
        { label: 'Pretos por 6+ golos', ...({ deltaBrancos: pWin6.deltaB, deltaPretos: pWin6.deltaP }), highlight: 'pretos', multiplier: '1.5x' },
    ];

    const formatDelta = (d: number) => d > 0 ? `+${d}` : String(d);

    const deltaColor = (d: number) => {
        if (d > 0) return 'text-green-600';
        if (d < 0) return 'text-red-500';
        return 'text-gray-400';
    };

    const rowBg = (h: 'brancos' | 'pretos' | 'draw') => {
        if (h === 'brancos') return 'bg-gray-50';
        if (h === 'pretos') return 'bg-gray-900/5';
        return 'bg-yellow-50';
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-3">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
                <span>{open ? '▾' : '▸'}</span>
                <span className="font-medium">🔮 Simulação de Elo — E se...?</span>
            </button>
            {open && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500">
                        Brancos ({brancosAvg}) vs Pretos ({pretosAvg}) — Prob. Brancos: {(expB * 100).toFixed(0)}%
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100 text-xs text-gray-600">
                                    <th className="px-3 py-2 text-left font-medium">Cenário</th>
                                    <th className="px-3 py-2 text-right font-medium">Brancos</th>
                                    <th className="px-3 py-2 text-right font-medium">Pretos</th>
                                    <th className="px-3 py-2 text-right font-medium">Mult.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rows.map(r => (
                                    <tr key={r.label} className={rowBg(r.highlight)}>
                                        <td className="px-3 py-2 text-gray-700">{r.label}</td>
                                        <td className={`px-3 py-2 text-right font-mono font-semibold ${deltaColor(r.deltaBrancos)}`}>
                                            {formatDelta(r.deltaBrancos)}
                                        </td>
                                        <td className={`px-3 py-2 text-right font-mono font-semibold ${deltaColor(r.deltaPretos)}`}>
                                            {formatDelta(r.deltaPretos)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs text-gray-400">
                                            {r.multiplier}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-3 py-2 bg-gray-50 text-[10px] text-gray-400">
                        K=32 · Escala=200 · Multiplicador aplicado a partir de 3 golos de diferença
                    </div>
                </div>
            )}
        </div>
    );
}
