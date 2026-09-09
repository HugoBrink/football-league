'use client'

import { useState, useTransition } from 'react'
import { submitVote } from '@/app/lib/actions'
import { useRouter } from 'next/navigation'

type Props = {
    gameId: number
    playerNames: string[]
}

export default function VoteForm({ gameId, playerNames }: Props) {
    const [voter, setVoter] = useState('')
    const [bestPlayer, setBestPlayer] = useState('')
    const [disruptor, setDisruptor] = useState('')
    const [wall, setWall] = useState('')
    const [bestGoal, setBestGoal] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const otherPlayers = playerNames.filter(n => n !== voter)

    const handleSubmit = () => {
        if (!voter || !bestPlayer || !disruptor || !wall) {
            setError('Preenche todos os campos obrigatórios.')
            return
        }
        setError(null)
        startTransition(async () => {
            const result = await submitVote({
                gameId,
                voterName: voter,
                bestPlayer,
                disruptor,
                wall,
                bestGoal: bestGoal || null,
            })
            if (result.success) {
                setSubmitted(true)
                router.refresh()
            } else {
                setError(result.error ?? 'Erro ao submeter voto.')
            }
        })
    }

    if (submitted) {
        return (
            <div className="bg-white rounded-lg border p-6 text-center space-y-2">
                <div className="text-3xl">✅</div>
                <h2 className="font-semibold">Voto submetido!</h2>
                <p className="text-sm text-gray-500">Obrigado. Os resultados serão revelados quando a votação fechar.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-center">Votação MVP</h2>
            <p className="text-xs text-gray-500 text-center">Voto anónimo. Não podes votar em ti próprio.</p>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-600 text-center">
                    {error}
                </div>
            )}

            {/* Voter identification */}
            <div>
                <label className="block text-sm font-medium mb-1" htmlFor="voter">Quem és tu?</label>
                <select
                    id="voter"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
                    value={voter}
                    onChange={e => {
                        setVoter(e.target.value)
                        if (bestPlayer === e.target.value) setBestPlayer('')
                        if (disruptor === e.target.value) setDisruptor('')
                        if (wall === e.target.value) setWall('')
                        if (bestGoal === e.target.value) setBestGoal(null)
                    }}
                >
                    <option value="" disabled>Seleciona o teu nome…</option>
                    {playerNames.map(n => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>

            {voter && (
                <>
                    {/* Best Player */}
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="bestPlayer">
                            ⭐ Melhor em Campo
                        </label>
                        <select
                            id="bestPlayer"
                            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
                            value={bestPlayer}
                            onChange={e => setBestPlayer(e.target.value)}
                        >
                            <option value="" disabled>Seleciona…</option>
                            {otherPlayers.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    {/* Disruptor */}
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="disruptor">
                            ⚡ Maior Desequilibrador
                        </label>
                        <select
                            id="disruptor"
                            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
                            value={disruptor}
                            onChange={e => setDisruptor(e.target.value)}
                        >
                            <option value="" disabled>Seleciona…</option>
                            {otherPlayers.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    {/* Wall */}
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="wall">
                            🧱 Maior Muralha
                        </label>
                        <select
                            id="wall"
                            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
                            value={wall}
                            onChange={e => setWall(e.target.value)}
                        >
                            <option value="" disabled>Seleciona…</option>
                            {otherPlayers.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    {/* Best Goal (optional) */}
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="bestGoal">
                            ⚽ Melhor Golo <span className="text-gray-400 font-normal">(opcional)</span>
                        </label>
                        <select
                            id="bestGoal"
                            className="w-full border rounded-lg px-3 py-2.5 text-sm bg-white"
                            value={bestGoal ?? ''}
                            onChange={e => setBestGoal(e.target.value || null)}
                        >
                            <option value="">Nenhum</option>
                            {otherPlayers.map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={isPending || !bestPlayer || !disruptor || !wall}
                        className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isPending ? 'A submeter…' : 'Submeter Voto'}
                    </button>
                </>
            )}
        </div>
    )
}
