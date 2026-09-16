'use client'

import { useMemo, useState } from 'react'

type PairStats = {
    playerA: string
    playerB: string
    togetherGames: number
    togetherWins: number
    togetherWinRate: number
    againstGames: number
    winsA: number
    winsB: number
}

type VsEntry = {
    player: string
    opponent: string
    games: number
    wins: number
    winRate: number
}

type Props = {
    allPairs: PairStats[]
    allVsStats: VsEntry[]
    playerNames: string[]
}

function WinRateBar({ rate, className }: { rate: number; className?: string }) {
    return (
        <div className={`h-2 bg-gray-100 rounded-full w-full max-w-[80px] ${className ?? ''}`}>
            <div
                className={`h-2 rounded-full ${rate >= 0.5 ? 'bg-green-400' : 'bg-red-300'}`}
                style={{ width: `${rate * 100}%` }}
            />
        </div>
    )
}

export default function PartnershipsRivalries({ allPairs, allVsStats, playerNames }: Props) {
    const [minTogether, setMinTogether] = useState(3)
    const [minAgainst, setMinAgainst] = useState(3)

    const { bestPartnerships, worstPartnerships, favoriteRivals, nemeses } = useMemo(() => {
        const togetherPairs = allPairs.filter(p => p.togetherGames >= minTogether)
        const best = [...togetherPairs].sort((a, b) => b.togetherWinRate - a.togetherWinRate || b.togetherWins - a.togetherWins).slice(0, 10)
        const worst = [...togetherPairs].sort((a, b) => a.togetherWinRate - b.togetherWinRate || a.togetherWins - b.togetherWins).slice(0, 10)

        const favs: VsEntry[] = []
        const nems: VsEntry[] = []

        for (const player of playerNames) {
            let bestWinRate = -1
            let bestRival: VsEntry | null = null
            let worstWinRate = 2
            let worstNemesis: VsEntry | null = null

            for (const vs of allVsStats) {
                if (vs.player !== player) continue
                if (vs.games < minAgainst) continue

                if (vs.winRate > bestWinRate || (vs.winRate === bestWinRate && vs.games > (bestRival?.games ?? 0))) {
                    bestWinRate = vs.winRate
                    bestRival = vs
                }
                if (vs.winRate < worstWinRate || (vs.winRate === worstWinRate && vs.games > (worstNemesis?.games ?? 0))) {
                    worstWinRate = vs.winRate
                    worstNemesis = vs
                }
            }

            if (bestRival) favs.push(bestRival)
            if (worstNemesis) nems.push(worstNemesis)
        }

        favs.sort((a, b) => b.winRate - a.winRate || b.games - a.games)
        nems.sort((a, b) => a.winRate - b.winRate || b.games - a.games)

        return {
            bestPartnerships: best,
            worstPartnerships: worst,
            favoriteRivals: favs.slice(0, 10),
            nemeses: nems.slice(0, 10),
        }
    }, [allPairs, allVsStats, playerNames, minTogether, minAgainst])

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="min-together" className="text-gray-600 whitespace-nowrap">Min. jogos juntos:</label>
                    <input
                        id="min-together"
                        type="number"
                        min={1}
                        max={20}
                        value={minTogether}
                        onChange={e => setMinTogether(Math.max(1, Number(e.target.value)))}
                        className="w-16 px-2 py-1 border rounded text-center text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="min-against" className="text-gray-600 whitespace-nowrap">Min. jogos contra:</label>
                    <input
                        id="min-against"
                        type="number"
                        min={1}
                        max={20}
                        value={minAgainst}
                        onChange={e => setMinAgainst(Math.max(1, Number(e.target.value)))}
                        className="w-16 px-2 py-1 border rounded text-center text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Best Partnerships */}
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center mb-3">🤝 Dupla de Ouro</h3>
                    <p className="text-xs text-gray-500 text-center mb-3">Melhor win rate quando jogam juntos (min. {minTogether} jogos)</p>
                    {bestPartnerships.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center">Sem dados suficientes</div>
                    ) : (
                        <div className="space-y-2">
                            {bestPartnerships.map((p, i) => (
                                <div key={`${p.playerA}-${p.playerB}`} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-400 font-mono w-5 text-right">{i + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium">{p.playerA}</span>
                                        <span className="text-gray-400 mx-1">&</span>
                                        <span className="font-medium">{p.playerB}</span>
                                    </div>
                                    <WinRateBar rate={p.togetherWinRate} />
                                    <span className="text-green-600 font-semibold w-12 text-right">
                                        {(p.togetherWinRate * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-gray-400 text-xs w-16 text-right">
                                        {p.togetherWins}V/{p.togetherGames}J
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Worst Partnerships */}
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center mb-3">💀 Dupla Tóxica</h3>
                    <p className="text-xs text-gray-500 text-center mb-3">Pior win rate quando jogam juntos (min. {minTogether} jogos)</p>
                    {worstPartnerships.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center">Sem dados suficientes</div>
                    ) : (
                        <div className="space-y-2">
                            {worstPartnerships.map((p, i) => (
                                <div key={`${p.playerA}-${p.playerB}`} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-400 font-mono w-5 text-right">{i + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium">{p.playerA}</span>
                                        <span className="text-gray-400 mx-1">&</span>
                                        <span className="font-medium">{p.playerB}</span>
                                    </div>
                                    <WinRateBar rate={p.togetherWinRate} />
                                    <span className="text-red-500 font-semibold w-12 text-right">
                                        {(p.togetherWinRate * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-gray-400 text-xs w-16 text-right">
                                        {p.togetherWins}V/{p.togetherGames}J
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Favorite Rivals */}
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center mb-3">🎯 Rival Favorito</h3>
                    <p className="text-xs text-gray-500 text-center mb-3">Melhor win rate contra um adversário específico (min. {minAgainst} jogos contra)</p>
                    {favoriteRivals.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center">Sem dados suficientes</div>
                    ) : (
                        <div className="space-y-2">
                            {favoriteRivals.map((r, i) => (
                                <div key={`${r.player}-${r.opponent}`} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-400 font-mono w-5 text-right">{i + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium">{r.player}</span>
                                        <span className="text-gray-400 mx-1">vs</span>
                                        <span className="text-gray-500">{r.opponent}</span>
                                    </div>
                                    <WinRateBar rate={r.winRate} />
                                    <span className="text-green-600 font-semibold w-12 text-right">
                                        {(r.winRate * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-gray-400 text-xs w-16 text-right">
                                        {r.wins}V/{r.games}J
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Nemeses */}
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center mb-3">😈 Nemesis</h3>
                    <p className="text-xs text-gray-500 text-center mb-3">Pior win rate contra um adversário específico (min. {minAgainst} jogos contra)</p>
                    {nemeses.length === 0 ? (
                        <div className="text-gray-400 text-sm text-center">Sem dados suficientes</div>
                    ) : (
                        <div className="space-y-2">
                            {nemeses.map((r, i) => (
                                <div key={`${r.player}-${r.opponent}`} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-400 font-mono w-5 text-right">{i + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium">{r.player}</span>
                                        <span className="text-gray-400 mx-1">vs</span>
                                        <span className="text-red-400">{r.opponent}</span>
                                    </div>
                                    <WinRateBar rate={r.winRate} />
                                    <span className="text-red-500 font-semibold w-12 text-right">
                                        {(r.winRate * 100).toFixed(0)}%
                                    </span>
                                    <span className="text-gray-400 text-xs w-16 text-right">
                                        {r.wins}V/{r.games}J
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
