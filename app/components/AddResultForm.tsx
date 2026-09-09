'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus } from 'lucide-react'
import { addResultToGame } from '@/app/lib/actions'
import { useRouter } from 'next/navigation'

export default function AddResultForm({ gameId, leagueSlug }: { gameId: number; leagueSlug: string }) {
    const [brancosScore, setBrancosScore] = useState(0)
    const [pretosScore, setPretosScore] = useState(0)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    return (
        <div className="w-full max-w-md mx-auto rounded-lg border bg-white p-4 space-y-3">
            <h3 className="font-semibold text-center text-sm">Adicionar Resultado</h3>
            <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">Brancos</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setBrancosScore(Math.max(0, brancosScore - 1))} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300">
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-2xl font-bold w-6 text-center tabular-nums">{brancosScore}</span>
                        <button type="button" onClick={() => setBrancosScore(brancosScore + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <span className="text-xl font-bold text-gray-400">-</span>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">Pretos</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPretosScore(Math.max(0, pretosScore - 1))} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300">
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-2xl font-bold w-6 text-center tabular-nums">{pretosScore}</span>
                        <button type="button" onClick={() => setPretosScore(pretosScore + 1)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
            <button
                onClick={() => {
                    startTransition(async () => {
                        await addResultToGame(leagueSlug, gameId, brancosScore, pretosScore)
                        router.refresh()
                    })
                }}
                disabled={isPending}
                className="w-full py-2 rounded-md text-white font-medium text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
                {isPending ? 'A guardar…' : 'Confirmar Resultado'}
            </button>
        </div>
    )
}
