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

type RivalryEntry = {
    player: string
    opponent: string
    games: number
    wins: number
    winRate: number
}

type Props = {
    bestPartnerships: PairStats[]
    worstPartnerships: PairStats[]
    favoriteRivals: RivalryEntry[]
    nemeses: RivalryEntry[]
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

export default function PartnershipsRivalries({ bestPartnerships, worstPartnerships, favoriteRivals, nemeses }: Props) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Best Partnerships */}
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center mb-3">🤝 Dupla de Ouro</h3>
                    <p className="text-xs text-gray-500 text-center mb-3">Melhor win rate quando jogam juntos (min. 3 jogos)</p>
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
                    <p className="text-xs text-gray-500 text-center mb-3">Pior win rate quando jogam juntos (min. 3 jogos)</p>
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
                    <p className="text-xs text-gray-500 text-center mb-3">Melhor win rate contra um adversário específico (min. 3 jogos contra)</p>
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
                    <p className="text-xs text-gray-500 text-center mb-3">Pior win rate contra um adversário específico (min. 3 jogos contra)</p>
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
