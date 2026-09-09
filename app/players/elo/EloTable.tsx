'use client'

import { Fragment, useState } from 'react'

type HistoryPoint = { gameNum: number; elo: number; date: Date }

type EloEntry = {
    id: string
    name: string
    elo: number
    peak: number
    gamesPlayed: number
    wins: number
    losses: number
    draws: number
    history: HistoryPoint[]
}

type Props = {
    ratings: EloEntry[]
}

function MiniChart({ history, currentElo }: { history: HistoryPoint[]; currentElo: number }) {
    if (history.length < 2) return <span className="text-gray-400 text-xs">—</span>

    const w = 120
    const h = 36
    const padding = 2

    const elos = history.map(p => p.elo)
    const minElo = Math.min(...elos) - 10
    const maxElo = Math.max(...elos) + 10
    const range = maxElo - minElo || 1

    const points = history.map((p, i) => {
        const x = padding + (i / (history.length - 1)) * (w - padding * 2)
        const y = h - padding - ((p.elo - minElo) / range) * (h - padding * 2)
        return `${x},${y}`
    }).join(' ')

    const isUp = currentElo >= 1000

    return (
        <svg width={w} height={h} className="inline-block">
            <polyline
                points={points}
                fill="none"
                stroke={isUp ? '#22c55e' : '#ef4444'}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            {/* baseline at 1000 */}
            <line
                x1={padding}
                y1={h - padding - ((1000 - minElo) / range) * (h - padding * 2)}
                x2={w - padding}
                y2={h - padding - ((1000 - minElo) / range) * (h - padding * 2)}
                stroke="#9ca3af"
                strokeWidth="0.5"
                strokeDasharray="3,3"
            />
        </svg>
    )
}

function FullChart({ history }: { history: HistoryPoint[] }) {
    if (history.length < 2) return <div className="text-gray-400 text-sm p-4">Poucos jogos para gráfico.</div>

    const w = 600
    const h = 200
    const padL = 45
    const padR = 10
    const padT = 10
    const padB = 30

    const elos = history.map(p => p.elo)
    const minElo = Math.min(...elos, 1000) - 20
    const maxElo = Math.max(...elos, 1000) + 20
    const range = maxElo - minElo || 1

    const toX = (i: number) => padL + (i / (history.length - 1)) * (w - padL - padR)
    const toY = (elo: number) => padT + (1 - (elo - minElo) / range) * (h - padT - padB)

    const points = history.map((p, i) => `${toX(i)},${toY(p.elo)}`).join(' ')

    const baseY = toY(1000)

    // Y-axis ticks
    const tickCount = 5
    const yTicks = Array.from({ length: tickCount }, (_, i) => {
        const elo = minElo + (range * i) / (tickCount - 1)
        return Math.round(elo)
    })

    // X-axis ticks (game numbers)
    const xTickCount = Math.min(history.length, 8)
    const xTicks = Array.from({ length: xTickCount }, (_, i) => {
        const idx = Math.round((i / (xTickCount - 1)) * (history.length - 1))
        return { idx, gameNum: history[idx].gameNum }
    })

    const lastElo = history[history.length - 1].elo
    const isUp = lastElo >= 1000

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[600px]">
                {/* Grid lines */}
                {yTicks.map(elo => (
                    <g key={elo}>
                        <line x1={padL} y1={toY(elo)} x2={w - padR} y2={toY(elo)} stroke="#e5e7eb" strokeWidth="0.5" />
                        <text x={padL - 5} y={toY(elo) + 3} textAnchor="end" fontSize="10" fill="#6b7280">{elo}</text>
                    </g>
                ))}
                {/* Baseline at 1000 */}
                <line x1={padL} y1={baseY} x2={w - padR} y2={baseY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4,4" />
                <text x={w - padR + 2} y={baseY + 3} fontSize="9" fill="#9ca3af">1000</text>
                {/* X-axis labels */}
                {xTicks.map(t => (
                    <text key={t.idx} x={toX(t.idx)} y={h - 5} textAnchor="middle" fontSize="10" fill="#6b7280">#{t.gameNum}</text>
                ))}
                {/* Elo line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={isUp ? '#22c55e' : '#ef4444'}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                {/* Endpoint dot */}
                <circle
                    cx={toX(history.length - 1)}
                    cy={toY(lastElo)}
                    r="3"
                    fill={isUp ? '#22c55e' : '#ef4444'}
                />
            </svg>
        </div>
    )
}

export default function EloTable({ ratings }: Props) {
    const [expanded, setExpanded] = useState<string | null>(null)

    const topElo = ratings[0]?.elo ?? 1000
    const minElo = ratings.length > 0 ? ratings[ratings.length - 1].elo : 1000

    return (
        <div className="space-y-2">
            {/* Podium */}
            {ratings.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-6">
                    {/* 2nd place */}
                    <div className="text-center">
                        <div className="text-2xl">🥈</div>
                        <div className="font-semibold text-sm">{ratings[1].name}</div>
                        <div className="text-lg font-bold">{ratings[1].elo}</div>
                        <div className="bg-gray-200 rounded-t w-20 h-16" />
                    </div>
                    {/* 1st place */}
                    <div className="text-center">
                        <div className="text-3xl">🥇</div>
                        <div className="font-bold">{ratings[0].name}</div>
                        <div className="text-xl font-bold text-yellow-600">{ratings[0].elo}</div>
                        <div className="bg-yellow-200 rounded-t w-20 h-24" />
                    </div>
                    {/* 3rd place */}
                    <div className="text-center">
                        <div className="text-2xl">🥉</div>
                        <div className="font-semibold text-sm">{ratings[2].name}</div>
                        <div className="text-lg font-bold">{ratings[2].elo}</div>
                        <div className="bg-orange-100 rounded-t w-20 h-12" />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Jogador</th>
                            <th className="px-3 py-2 text-right">Elo</th>
                            <th className="px-3 py-2 text-right">Peak</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">J</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">V</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">D</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">E</th>
                            <th className="px-3 py-2 text-center hidden md:table-cell">Tendência</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ratings.map((r, idx) => {
                            const diff = r.elo - 1000
                            const barWidth = topElo === minElo ? 50 : ((r.elo - minElo) / (topElo - minElo)) * 100
                            const isExpanded = expanded === r.id

                            return (
                                <Fragment key={r.id}>
                                    <tr
                                        className="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setExpanded(isExpanded ? null : r.id)}
                                    >
                                        <td className="px-3 py-2 font-mono text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{r.name}</span>
                                                <span className={`text-xs font-mono ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {diff >= 0 ? '+' : ''}{diff}
                                                </span>
                                            </div>
                                            {/* Elo bar */}
                                            <div className="mt-1 h-1 bg-gray-100 rounded-full w-full max-w-[200px]">
                                                <div
                                                    className={`h-1 rounded-full ${diff >= 0 ? 'bg-green-400' : 'bg-red-300'}`}
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold">{r.elo}</td>
                                        <td className="px-3 py-2 text-right text-gray-500">{r.peak}</td>
                                        <td className="px-3 py-2 text-center hidden sm:table-cell">{r.gamesPlayed}</td>
                                        <td className="px-3 py-2 text-center hidden sm:table-cell text-green-600">{r.wins}</td>
                                        <td className="px-3 py-2 text-center hidden sm:table-cell text-red-500">{r.losses}</td>
                                        <td className="px-3 py-2 text-center hidden sm:table-cell text-gray-500">{r.draws}</td>
                                        <td className="px-3 py-2 text-center hidden md:table-cell">
                                            <MiniChart history={r.history} currentElo={r.elo} />
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={9} className="px-4 py-4">
                                                <div className="text-sm font-medium mb-2">
                                                    Evolução do Elo — {r.name}
                                                </div>
                                                <FullChart history={r.history} />
                                                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                                    <span>Elo atual: <strong className={diff >= 0 ? 'text-green-600' : 'text-red-500'}>{r.elo}</strong></span>
                                                    <span>Peak: <strong>{r.peak}</strong></span>
                                                    <span>Win rate: <strong>{r.gamesPlayed > 0 ? ((r.wins / r.gamesPlayed) * 100).toFixed(0) : 0}%</strong></span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="text-xs text-gray-500 space-y-1 mt-4">
                <p>ℹ️ O sistema Elo começa em 1000 para todos os jogadores. Ganhar contra equipas com Elo mais alto dá mais pontos, e vice-versa.</p>
                <p>O rating é cumulativo — conta todos os jogos de todas as seasons da liga.</p>
                <p>Clica num jogador para ver o gráfico de evolução.</p>
            </div>
        </div>
    )
}
