type PlayerEloSnapshot = {
    name: string
    eloBefore: number
    eloAfter: number
    delta: number
    isCaptain: boolean
}

type GameEloSnapshot = {
    brancos: PlayerEloSnapshot[]
    pretos: PlayerEloSnapshot[]
    brancosAvgBefore: number
    pretosAvgBefore: number
    brancosAvgAfter: number
    pretosAvgAfter: number
}

function DeltaBadge({ delta }: { delta: number }) {
    if (delta === 0) return <span className="text-gray-400 text-xs font-mono">±0</span>
    const isPositive = delta > 0
    return (
        <span className={`text-xs font-mono font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{delta}
        </span>
    )
}

function TeamColumn({ label, players, avgBefore, avgAfter, labelColor, voterSet, paidSet }: {
    label: string
    players: PlayerEloSnapshot[]
    avgBefore: number
    avgAfter: number
    labelColor: string
    voterSet?: Set<string>
    paidSet?: Set<string>
}) {
    const avgDelta = avgAfter - avgBefore

    return (
        <div className="flex-1 min-w-0">
            {/* Team header */}
            <div className={`text-center rounded-t-lg py-2 px-3 ${labelColor}`}>
                <div className="font-bold text-sm">{label}</div>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">Elo equipa:</span>
                    <span className="font-semibold text-sm">{avgBefore}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-semibold text-sm">{avgAfter}</span>
                    <DeltaBadge delta={avgDelta} />
                </div>
            </div>

            {/* Player rows */}
            <div className="border border-t-0 rounded-b-lg divide-y">
                {players.map(p => (
                    <div key={p.name} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <div className="flex-1 min-w-0">
                            <span className="font-medium">{p.name}</span>
                            {p.isCaptain && <span className="ml-1 text-xs text-yellow-600" title="Capitão">©</span>}
                            {voterSet?.has(p.name) && <span className="ml-1 text-xs" title="Votou">🗳️</span>}
                            {paidSet?.has(p.name) && <span className="ml-1 text-xs" title="Pagou 5.90€">💰</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 tabular-nums">
                            <span>{p.eloBefore}</span>
                            <span className="text-gray-300">→</span>
                            <span className="font-medium text-gray-700">{p.eloAfter}</span>
                        </div>
                        <div className="w-10 text-right">
                            <DeltaBadge delta={p.delta} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function GameEloBreakdown({ snapshot, voterSet, paidSet }: { snapshot: GameEloSnapshot; voterSet?: Set<string>; paidSet?: Set<string> }) {
    const eloDiff = snapshot.brancosAvgBefore - snapshot.pretosAvgBefore
    const favoriteLabel = eloDiff > 5
        ? 'Brancos favoritos'
        : eloDiff < -5
            ? 'Pretos favoritos'
            : 'Equipas equilibradas'

    return (
        <div className="w-full max-w-2xl mx-auto space-y-3">
            <div className="text-center">
                <h3 className="font-semibold text-sm">Elo Breakdown</h3>
                <p className="text-xs text-gray-500">
                    {favoriteLabel} ({Math.abs(eloDiff)} pts diferença)
                </p>
            </div>
            <div className="flex gap-4">
                <TeamColumn
                    label="Brancos"
                    players={snapshot.brancos}
                    avgBefore={snapshot.brancosAvgBefore}
                    avgAfter={snapshot.brancosAvgAfter}
                    labelColor="bg-gray-100"
                    voterSet={voterSet}
                    paidSet={paidSet}
                />
                <TeamColumn
                    label="Pretos"
                    players={snapshot.pretos}
                    avgBefore={snapshot.pretosAvgBefore}
                    avgAfter={snapshot.pretosAvgAfter}
                    labelColor="bg-gray-800 text-white [&_.text-gray-500]:text-gray-300"
                    voterSet={voterSet}
                    paidSet={paidSet}
                />
            </div>
            <p className="text-[10px] text-gray-400 text-center">
                Elo calculado cumulativamente sobre todos os jogos da liga. K=32.
            </p>
        </div>
    )
}
