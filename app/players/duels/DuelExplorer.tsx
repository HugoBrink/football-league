'use client'

import { useMemo, useState } from 'react';

type PlayerOption = { id: string; name: string }

type GameDTO = {
    id: number
    date: string | Date
    brancos_players: any
    pretos_players: any
    brancos_score: number
    pretos_score: number
    goal_difference: number
}

type Props = {
    players: PlayerOption[]
    games: GameDTO[]
}

export default function DuelExplorer({ players, games }: Props) {
    const [a, setA] = useState<string>('')
    const [b, setB] = useState<string>('')

    const stats = useMemo(() => {
        if (!a || !b || a === b) return null
        let togetherGames = 0
        let togetherWinsA = 0
        let togetherWinsB = 0 // same as A since same team; kept for clarity

        let againstGames = 0
        let winsAAgainstB = 0
        let winsBAgainstA = 0

        let gamesWithA = 0
        let gamesWithB = 0
        let gamesWithBoth = 0

        const idA = String(a)
        const idB = String(b)

        for (const g of games) {
            const brancos: string[] = (g.brancos_players as any[])?.map(String) ?? []
            const pretos: string[] = (g.pretos_players as any[])?.map(String) ?? []
            const brancosCaptain = (g as any).brancos_captain != null ? String((g as any).brancos_captain) : null
            const pretosCaptain = (g as any).pretos_captain != null ? String((g as any).pretos_captain) : null

            // Determine each player's team considering both arrays and captain fields
            const aOnBrancos = brancos.includes(idA) || brancosCaptain === idA
            const aOnPretos = pretos.includes(idA) || pretosCaptain === idA
            const bOnBrancos = brancos.includes(idB) || brancosCaptain === idB
            const bOnPretos = pretos.includes(idB) || pretosCaptain === idB

            const brancosWon = g.brancos_score > g.pretos_score
            const pretosWon = g.pretos_score > g.brancos_score

            const aPresent = aOnBrancos || aOnPretos
            const bPresent = bOnBrancos || bOnPretos
            if (aPresent) gamesWithA += 1
            if (bPresent) gamesWithB += 1
            if (aPresent && bPresent) {
                gamesWithBoth += 1
                const sameTeam = (aOnBrancos && bOnBrancos) || (aOnPretos && bOnPretos)
                if (sameTeam) {
                    togetherGames += 1
                    if (aOnBrancos && brancosWon) togetherWinsA += 1
                    if (aOnPretos && pretosWon) togetherWinsA += 1
                    togetherWinsB = togetherWinsA
                } else {
                    againstGames += 1
                    if (aOnBrancos && brancosWon) winsAAgainstB += 1
                    if (aOnPretos && pretosWon) winsAAgainstB += 1
                    if (bOnBrancos && brancosWon) winsBAgainstA += 1
                    if (bOnPretos && pretosWon) winsBAgainstA += 1
                }
            }
        }

        // Frequent teammates for A
        const teammateCount: Record<string, number> = {}
        const teammateCountB: Record<string, number> = {}
        for (const g of games) {
            const brancos: string[] = (g.brancos_players as any[])?.map(String) ?? []
            const pretos: string[] = (g.pretos_players as any[])?.map(String) ?? []
            const brancosCaptain = (g as any).brancos_captain != null ? String((g as any).brancos_captain) : null
            const pretosCaptain = (g as any).pretos_captain != null ? String((g as any).pretos_captain) : null

            // Build unique team member sets including captain ids
            const brancosSet = new Set<string>(brancos)
            const pretosSet = new Set<string>(pretos)
            if (brancosCaptain) brancosSet.add(brancosCaptain)
            if (pretosCaptain) pretosSet.add(pretosCaptain)

            const aOnBrancos = brancosSet.has(idA)
            const aOnPretos = pretosSet.has(idA)
            const bOnBrancos = brancosSet.has(idB)
            const bOnPretos = pretosSet.has(idB)

            if (aOnBrancos) {
                for (const pid of brancosSet) {
                    if (pid === idA) continue
                    teammateCount[pid] = (teammateCount[pid] ?? 0) + 1
                }
            }
            if (aOnPretos) {
                for (const pid of pretosSet) {
                    if (pid === idA) continue
                    teammateCount[pid] = (teammateCount[pid] ?? 0) + 1
                }
            }
            if (bOnBrancos) {
                for (const pid of brancosSet) {
                    if (pid === idB) continue
                    teammateCountB[pid] = (teammateCountB[pid] ?? 0) + 1
                }
            }
            if (bOnPretos) {
                for (const pid of pretosSet) {
                    if (pid === idB) continue
                    teammateCountB[pid] = (teammateCountB[pid] ?? 0) + 1
                }
            }
        }
        const teammateRanks = Object.entries(teammateCount)
            .map(([pid, count]) => ({ id: pid, count, name: players.find(p => String(p.id) === pid)?.name ?? pid }))
            .sort((x, y) => y.count - x.count)
        const teammateRanksB = Object.entries(teammateCountB)
            .map(([pid, count]) => ({ id: pid, count, name: players.find(p => String(p.id) === pid)?.name ?? pid }))
            .sort((x, y) => y.count - x.count)

        return {
            togetherGames,
            togetherWinsA,
            togetherWinsB,
            againstGames,
            winsAAgainstB,
            winsBAgainstA,
            gamesWithA,
            gamesWithB,
            gamesWithBoth,
            teammateRanks,
            teammateRanksB,
        }
    }, [a, b, games, players])

    console.log(players)

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600" htmlFor="playerA">Player A</label>
                    <select id="playerA" className="border rounded px-2 py-1 text-sm flex-1" value={a} onChange={e => setA(e.target.value)}>
                        <option value="" disabled>Seleciona um jogador…</option>
                        {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600" htmlFor="playerB">Player B</label>
                    <select id="playerB" className="border rounded px-2 py-1 text-sm flex-1" value={b} onChange={e => setB(e.target.value)}>
                        <option value="" disabled>Seleciona um jogador…</option>
                        {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!a || !b || a === b ? (
                <div className="rounded-lg border p-4 text-sm text-gray-600">
                    Selecione dois jogadores diferentes para ver as estatísticas.
                </div>
            ) : stats && (
                    <>
                <div className="rounded-lg border p-4">
                    <h3 className="font-semibold text-center">Partilharam o palco em {stats.gamesWithBoth} jogos</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold text-center">Juntos</h3>
                        <div className="mt-2 text-gray-700">Jogos juntos: {stats.togetherGames}</div>
                        <div className="text-gray-700">Vitórias juntos: {stats.togetherWinsA}</div>
                    </div>
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold text-center">Um contra o outro</h3>
                        <div className="mt-2 text-gray-700">Jogos contra: {stats.againstGames}</div>
                        <div className="text-gray-700">{players.find(p => String(p.id) === String(a))?.name ?? 'A'} venceu {players.find(p => String(p.id) === String(b))?.name ?? 'B'}: {stats.winsAAgainstB}</div>
                        <div className="text-gray-700">{players.find(p => String(p.id) === String(b))?.name ?? 'B'} venceu {players.find(p => String(p.id) === String(a))?.name ?? 'A'}: {stats.winsBAgainstA}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4">
                        <h3 className="font-semibold text-center">Mais companheiro de {players.find(p => String(p.id) === String(a))?.name ?? 'A'}</h3>
                        <ol className="mt-2 list-decimal list-inside space-y-1">
                            {stats.teammateRanks.slice(0, 5).map(t => (
                                <li key={t.id} className="flex justify-between">
                                    <span>{t.name}</span>
                                    <span className="text-gray-600">{t.count}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="rounded-lg border p-4">
                        <h3 className=" font-semibold text-center">Mais companheiro de {players.find(p => String(p.id) === String(b))?.name ?? 'B'}</h3>
                        <ol className="mt-2 list-decimal list-inside space-y-1">
                            {stats.teammateRanksB.slice(0, 5).map(t => (
                                <li key={t.id} className="flex justify-between">
                                    <span>{t.name}</span>
                                    <span className="text-gray-600">{t.count}</span>
                                </li>
                            ))}
                        </ol>
                        </div>
                            </div>
                            </>
                )}

        </div>
    )
}
