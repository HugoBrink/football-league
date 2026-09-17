'use client'

import { Fragment, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

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

type SortField = 'elo' | 'peak' | 'games' | 'winRate' | 'name'

type Props = {
    ratings: EloEntry[]
    seasons: number[]
    currentSeason: number | undefined
    leagueSlug: string
}

// ─── Mini chart (inline in table row) ────────────────────────────────────────
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

// ─── Full chart (expanded row) ───────────────────────────────────────────────
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

    const tickCount = 5
    const yTicks = Array.from({ length: tickCount }, (_, i) => {
        const elo = minElo + (range * i) / (tickCount - 1)
        return Math.round(elo)
    })

    const xTickCount = Math.min(history.length, 8)
    const xTicks = Array.from({ length: xTickCount }, (_, i) => {
        const idx = Math.round((i / (xTickCount - 1)) * (history.length - 1))
        return { idx, gameNum: history[idx].gameNum }
    })

    const lastElo = history.at(-1)!.elo
    const isUp = lastElo >= 1000

    return (
        <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[600px]">
                {yTicks.map(elo => (
                    <g key={elo}>
                        <line x1={padL} y1={toY(elo)} x2={w - padR} y2={toY(elo)} stroke="#e5e7eb" strokeWidth="0.5" />
                        <text x={padL - 5} y={toY(elo) + 3} textAnchor="end" fontSize="10" fill="#6b7280">{elo}</text>
                    </g>
                ))}
                <line x1={padL} y1={baseY} x2={w - padR} y2={baseY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4,4" />
                <text x={w - padR + 2} y={baseY + 3} fontSize="9" fill="#9ca3af">1000</text>
                {xTicks.map(t => (
                    <text key={t.idx} x={toX(t.idx)} y={h - 5} textAnchor="middle" fontSize="10" fill="#6b7280">#{t.gameNum}</text>
                ))}
                <polyline
                    points={points}
                    fill="none"
                    stroke={isUp ? '#22c55e' : '#ef4444'}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
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

// ─── FAQ Tables ──────────────────────────────────────────────────────────────
function FaqTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">
                <thead>
                    <tr className="bg-gray-100">
                        {headers.map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-semibold border border-gray-200">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            {row.map((cell, j) => (
                                <td key={j} className="px-2 py-1.5 border border-gray-200">{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── FAQ component ───────────────────────────────────────────────────────────
function EloFAQ({ currentSeason }: { currentSeason: number | undefined }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="mt-4">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
                <span>{open ? '▾' : '▸'}</span>
                <span className="font-medium">ℹ️ FAQ — Como funciona o Elo?</span>
            </button>
            {open && (
                <div className="mt-3 space-y-3 text-sm">
                    {currentSeason == null ? (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                            Modo <strong>Overall</strong> — conta todos os jogos de todas as seasons (cumulativo).
                        </p>
                    ) : (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                            Modo <strong>Season {currentSeason}</strong> — apenas jogos desta season (todos começam em 1000).
                        </p>
                    )}

                    {/* 1. Como funciona */}
                    <details className="group border rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                            Como funciona o Elo?
                        </summary>
                        <div className="px-3 pb-3 text-gray-600 text-xs space-y-2">
                            <p>Todos começam com <strong>1000 pontos</strong>. Ganhar a quem é melhor que tu dá mais pontos, perder contra quem é pior tira mais.</p>
                            <p>O <strong>Elo da equipa</strong> é a média dos Elos individuais de todos os jogadores. Todos na mesma equipa ganham/perdem o mesmo.</p>
                            <p>O Elo é <strong>cumulativo</strong> — nunca reseta entre seasons.</p>
                        </div>
                    </details>

                    {/* 2. Equipas equilibradas */}
                    <details className="group border rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                            Equipas equilibradas (1000 vs 1000)
                        </summary>
                        <div className="px-3 pb-3 text-gray-600 text-xs space-y-1">
                            <p>Quando as equipas têm Elo igual, ambas têm 50% de probabilidade de ganhar:</p>
                            <FaqTable
                                headers={['Cenário', 'Vencedor', 'Perdedor']}
                                rows={[
                                    ['Vitória por 1-2 golos', '+16', '-16'],
                                    ['Vitória por 3-5 golos', '+20', '-20'],
                                    ['Vitória por 6+ golos', '+24', '-24'],
                                    ['Empate', '0', '0'],
                                ]}
                            />
                        </div>
                    </details>

                    {/* 3. Favorito vs Underdog */}
                    <details className="group border rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                            Favorito (1050) vs Underdog (950)
                        </summary>
                        <div className="px-3 pb-3 text-gray-600 text-xs space-y-1">
                            <p>O favorito tem ~76% de chance de ganhar:</p>
                            <FaqTable
                                headers={['Cenário', 'Favorito', 'Underdog']}
                                rows={[
                                    ['Favorito ganha por 1-2 golos', '+8', '-8'],
                                    ['Favorito ganha por 3-5 golos', '+10', '-10'],
                                    ['Empate', '-8', '+8'],
                                    ['Upset! Underdog ganha por 1-2', '-24', '+24'],
                                    ['Upset + Goleada! Underdog por 3-5', '-30', '+30'],
                                ]}
                            />
                        </div>
                    </details>

                    {/* 4. Grande diferença */}
                    <details className="group border rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                            Grande favorito (1100) vs Grande underdog (900)
                        </summary>
                        <div className="px-3 pb-3 text-gray-600 text-xs space-y-1">
                            <p>O favorito tem ~91% de chance de ganhar:</p>
                            <FaqTable
                                headers={['Cenário', 'Favorito', 'Underdog']}
                                rows={[
                                    ['Favorito ganha por 1-2 golos', '+3', '-3'],
                                    ['Upset! Underdog ganha por 1-2', '-29', '+29'],
                                    ['Upset + Goleada! Underdog por 3-5', '-36', '+36'],
                                ]}
                            />
                        </div>
                    </details>

                    {/* 5. Goleadas */}
                    <details className="group border rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                            Goleadas contam mais?
                        </summary>
                        <div className="px-3 pb-3 text-gray-600 text-xs space-y-1">
                            <p>Sim! A partir de 3 golos de diferença o impacto no Elo aumenta:</p>
                            <FaqTable
                                headers={['Diferença de golos', 'Multiplicador', 'Efeito']}
                                rows={[
                                    ['0-2 golos', '1.0x', 'Normal'],
                                    ['3-5 golos', '1.25x', '+25%'],
                                    ['6+ golos', '1.5x', '+50% (máximo)'],
                                ]}
                            />
                            <p>Se eras favorito e levaste uma goleada, perdes muito mais do que numa derrota normal.</p>
                        </div>
                    </details>

                    {/* 6. Desequilíbrio */}
                    <details className="group border rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                            Quando é que um jogo é desequilibrado?
                        </summary>
                        <div className="px-3 pb-3 text-gray-600 text-xs space-y-1">
                            <FaqTable
                                headers={['Diferença Elo', 'Chance do favorito', 'Favorito ganha', 'Upset']}
                                rows={[
                                    ['0', '50%', '+16', '+16'],
                                    ['25', '57%', '+14', '+18'],
                                    ['50', '64%', '+12', '+21'],
                                    ['75', '70%', '+10', '+23'],
                                    ['100', '76%', '+8', '+24'],
                                    ['150', '85%', '+5', '+27'],
                                    ['200', '91%', '+3', '+29'],
                                ]}
                            />
                            <p>Até ~25 pontos é praticamente justo. A partir de <strong>50+</strong> nota-se, e com <strong>100+</strong> é claramente desequilibrado.</p>
                        </div>
                    </details>

                    {/* 7. Origem dos valores */}
                    <details className="group border rounded-lg">
                        <summary className="px-3 py-2 cursor-pointer font-medium text-gray-700 hover:text-gray-900 select-none">
                            De onde vêm estes valores?
                        </summary>
                        <div className="px-3 pb-3 text-gray-600 text-xs space-y-2">
                            <p>O sistema Elo foi inventado por <strong>Arpad Elo</strong> nos anos 60 para classificar jogadores de xadrez. É o mesmo sistema que a FIFA usa para rankings de seleções e que sites como o FiveThirtyEight usam para prever resultados de futebol.</p>

                            <p className="font-semibold text-gray-700 mt-2">A fórmula:</p>
                            <div className="bg-gray-100 rounded p-3 flex flex-col items-start gap-3">
                                {/* Formula 1: Expected result */}
                                <div className="flex items-center gap-1.5 font-mono text-[12px]">
                                    <span className="italic">E</span>
                                    <span>=</span>
                                    <div className="inline-flex flex-col items-center">
                                        <span className="px-2">1</span>
                                        <span className="border-t border-gray-500 px-2 whitespace-nowrap">
                                            1 + 10<sup className="text-[9px]">(Elo<sub>adv</sub> − Elo<sub>eq</sub>) / 200</sup>
                                        </span>
                                    </div>
                                </div>
                                {/* Formula 2: Elo change */}
                                <div className="flex items-center gap-1.5 font-mono text-[12px]">
                                    <span>Δ<span className="italic">Elo</span></span>
                                    <span>=</span>
                                    <span><span className="italic">K</span> × <span className="italic">M</span> × (<span className="italic">R</span> − <span className="italic">E</span>)</span>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 space-y-0.5">
                                <p><span className="italic font-mono">E</span> = resultado esperado (probabilidade de ganhar)</p>
                                <p><span className="italic font-mono">K</span> = 32 &nbsp; <span className="italic font-mono">M</span> = multiplicador de goleada &nbsp; <span className="italic font-mono">R</span> = resultado real (1 = vitória, 0.5 = empate, 0 = derrota)</p>
                            </div>

                            <p className="font-semibold text-gray-700 mt-2">Os parâmetros:</p>
                            <FaqTable
                                headers={['Parâmetro', 'Valor', 'O que faz']}
                                rows={[
                                    ['K', '32', 'Controla a volatilidade — quantos pontos se trocam por jogo. Mais alto = mudanças maiores. (No xadrez de elite usam 16, para principiantes 40)'],
                                    ['Escala', '200', 'Controla o peso da diferença de Elo. Com 200 pts de diferença, o favorito tem ~91% de chance'],
                                    ['Elo inicial', '1000', 'O ponto de partida para todos. Arbitrário (no xadrez usam 1500)'],
                                    ['Multiplicador', '1.0 – 1.5x', 'Amplifica o K em goleadas (3+ golos). Não é Elo original — inspirado no FiveThirtyEight'],
                                ]}
                            />

                            <p className="font-semibold text-gray-700 mt-2">Exemplo passo a passo:</p>
                            <div className="bg-gray-100 rounded p-2 text-[11px] space-y-0.5">
                                <p>Equipa A (Elo 1050) vs Equipa B (Elo 950). A ganha por 4 golos de diferença.</p>
                                <p>1. Resultado esperado de A = 1 / (1 + 10^((950-1050)/200)) = <strong>0.76</strong> (76%)</p>
                                <p>2. Resultado real de A = <strong>1</strong> (vitória)</p>
                                <p>3. Multiplicador = <strong>1.25</strong> (3-5 golos de diferença)</p>
                                <p>4. Δ Elo = 32 × 1.25 × (1 − 0.76) = <strong>+10</strong></p>
                                <p>→ A sobe para 1060, B desce para 940.</p>
                            </div>
                        </div>
                    </details>

                    <p className="text-xs text-gray-400">Clica nas colunas do cabeçalho para mudar a ordenação. Clica num jogador para ver o gráfico.</p>
                </div>
            )}
        </div>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function EloTable({ ratings, seasons, currentSeason, leagueSlug }: Props) {
    const [expanded, setExpanded] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<SortField>('elo')
    const [minGames, setMinGames] = useState(10)
    const [isPending, startTransition] = useTransition()

    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const onSeasonChange = (value: string) => {
        const next = new URLSearchParams(searchParams?.toString())
        if (value === 'overall') {
            next.set('season', 'overall')
        } else {
            next.set('season', value)
        }
        startTransition(() => {
            router.push(`${pathname}?${next.toString()}`)
        })
    }

    const filtered = useMemo(() => {
        let list = ratings.filter(r => r.gamesPlayed >= minGames)

        switch (sortBy) {
            case 'elo':
                list = [...list].sort((a, b) => b.elo - a.elo)
                break
            case 'peak':
                list = [...list].sort((a, b) => b.peak - a.peak)
                break
            case 'games':
                list = [...list].sort((a, b) => b.gamesPlayed - a.gamesPlayed)
                break
            case 'winRate':
                list = [...list].sort((a, b) => {
                    const wrA = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0
                    const wrB = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0
                    return wrB - wrA
                })
                break
            case 'name':
                list = [...list].sort((a, b) => a.name.localeCompare(b.name))
                break
        }
        return list
    }, [ratings, sortBy, minGames])

    const topElo = filtered[0]?.elo ?? 1000
    const bottomElo = filtered.length > 0 ? filtered.at(-1)!.elo : 1000

    const seasonLabel = currentSeason != null ? `Season ${currentSeason}` : 'Overall'

    return (
        <div className="space-y-4">
            {/* ─── Controls ──────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 bg-gray-50">
                {/* Season picker */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium" htmlFor="eloSeason">Season</label>
                    <select
                        id="eloSeason"
                        className="border rounded px-2 py-1 text-sm"
                        value={currentSeason != null ? String(currentSeason) : 'overall'}
                        onChange={e => onSeasonChange(e.target.value)}
                    >
                        <option value="overall">Overall (todas)</option>
                        {seasons.sort((a, b) => b - a).map(s => (
                            <option key={s} value={s}>Season {s}</option>
                        ))}
                    </select>
                </div>

                <div className="h-6 border-l border-gray-300 hidden sm:block" />

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium" htmlFor="eloSort">Ordenar</label>
                    <select
                        id="eloSort"
                        className="border rounded px-2 py-1 text-sm"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortField)}
                    >
                        <option value="elo">Elo</option>
                        <option value="peak">Peak</option>
                        <option value="games">Jogos</option>
                        <option value="winRate">Win Rate</option>
                        <option value="name">Nome</option>
                    </select>
                </div>

                <div className="h-6 border-l border-gray-300 hidden sm:block" />

                {/* Min games filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium" htmlFor="minGames">Min jogos</label>
                    <input
                        id="minGames"
                        type="number"
                        min={0}
                        max={50}
                        className="border rounded px-2 py-1 text-sm w-16"
                        value={minGames}
                        onChange={e => setMinGames(Math.max(0, Number(e.target.value)))}
                    />
                </div>

                <div className="ml-auto text-xs text-gray-400">
                    {filtered.length} jogador{filtered.length !== 1 ? 'es' : ''}
                </div>
            </div>

            {/* ─── Loading overlay ─────────────────────────────── */}
            <div className="relative">
            {isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">A carregar...</span>
                    </div>
                </div>
            )}

            {/* ─── Podium ────────────────────────────────────── */}
            {filtered.length >= 3 && sortBy === 'elo' && (
                <div className="flex items-end justify-center gap-4 mb-2">
                    {/* 2nd place */}
                    <div className="text-center">
                        <div className="text-2xl">🥈</div>
                        <Link href={`/players/${encodeURIComponent(filtered[1].name)}?league=${leagueSlug}`} className="font-semibold text-sm hover:text-blue-600 hover:underline">{filtered[1].name}</Link>
                        <div className="text-lg font-bold">{filtered[1].elo}</div>
                        <div className="bg-slate-300 rounded-t w-20 h-16" />
                    </div>
                    {/* 1st place */}
                    <div className="text-center">
                        <div className="text-3xl">🥇</div>
                        <Link href={`/players/${encodeURIComponent(filtered[0].name)}?league=${leagueSlug}`} className="font-bold hover:text-blue-600 hover:underline">{filtered[0].name}</Link>
                        <div className="text-xl font-bold text-yellow-600">{filtered[0].elo}</div>
                        <div className="bg-yellow-300 rounded-t w-20 h-24" />
                    </div>
                    {/* 3rd place */}
                    <div className="text-center">
                        <div className="text-2xl">🥉</div>
                        <Link href={`/players/${encodeURIComponent(filtered[2].name)}?league=${leagueSlug}`} className="font-semibold text-sm hover:text-blue-600 hover:underline">{filtered[2].name}</Link>
                        <div className="text-lg font-bold">{filtered[2].elo}</div>
                        <div className="bg-amber-200 rounded-t w-20 h-12" />
                    </div>
                </div>
            )}

            {/* ─── Table ─────────────────────────────────────── */}
            <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left">#</th>
                            <th className="px-3 py-2 text-left">Jogador</th>
                            <th
                                className={`px-3 py-2 text-right cursor-pointer hover:text-blue-600 ${sortBy === 'elo' ? 'text-blue-600 underline' : ''}`}
                                onClick={() => setSortBy('elo')}
                            >
                                Elo
                            </th>
                            <th
                                className={`px-3 py-2 text-right cursor-pointer hover:text-blue-600 ${sortBy === 'peak' ? 'text-blue-600 underline' : ''}`}
                                onClick={() => setSortBy('peak')}
                            >
                                Peak
                            </th>
                            <th
                                className={`px-3 py-2 text-center hidden sm:table-cell cursor-pointer hover:text-blue-600 ${sortBy === 'games' ? 'text-blue-600 underline' : ''}`}
                                onClick={() => setSortBy('games')}
                            >
                                J
                            </th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">V</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">D</th>
                            <th className="px-3 py-2 text-center hidden sm:table-cell">E</th>
                            <th
                                className={`px-3 py-2 text-center hidden sm:table-cell cursor-pointer hover:text-blue-600 ${sortBy === 'winRate' ? 'text-blue-600 underline' : ''}`}
                                onClick={() => setSortBy('winRate')}
                            >
                                %V
                            </th>
                            <th className="px-3 py-2 text-center hidden md:table-cell">Tendência</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                                    Nenhum jogador com os filtros selecionados.
                                </td>
                            </tr>
                        )}
                        {filtered.map((r, idx) => {
                            const diff = r.elo - 1000
                            const barWidth = topElo === bottomElo ? 50 : ((r.elo - bottomElo) / (topElo - bottomElo)) * 100
                            const isExpanded = expanded === r.id
                            const winRate = r.gamesPlayed > 0 ? ((r.wins / r.gamesPlayed) * 100).toFixed(0) : '0'

                            return (
                                <Fragment key={r.id}>
                                    <tr
                                        className="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setExpanded(isExpanded ? null : r.id)}
                                    >
                                        <td className="px-3 py-2 font-mono text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/players/${encodeURIComponent(r.name)}?league=${leagueSlug}`}
                                                    className="font-medium hover:text-blue-600 hover:underline"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    {r.name}
                                                </Link>
                                                <span className={`text-xs font-mono ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {diff >= 0 ? '+' : ''}{diff}
                                                </span>
                                            </div>
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
                                        <td className="px-3 py-2 text-center hidden sm:table-cell font-medium">{winRate}%</td>
                                        <td className="px-3 py-2 text-center hidden md:table-cell">
                                            <MiniChart history={r.history} currentElo={r.elo} />
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={10} className="px-4 py-4">
                                                <div className="text-sm font-medium mb-2">
                                                    Evolução do Elo — {r.name} ({seasonLabel})
                                                </div>
                                                <FullChart history={r.history} />
                                                <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                                                    <span>Elo atual: <strong className={diff >= 0 ? 'text-green-600' : 'text-red-500'}>{r.elo}</strong></span>
                                                    <span>Peak: <strong>{r.peak}</strong></span>
                                                    <span>Win rate: <strong>{winRate}%</strong></span>
                                                    <span>Jogos: <strong>{r.gamesPlayed}</strong></span>
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

            </div>{/* end loading overlay wrapper */}

            {/* ─── FAQ ─────────────────────────────────────── */}
            <EloFAQ currentSeason={currentSeason} />
        </div>
    )
}
