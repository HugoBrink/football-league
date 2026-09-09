'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { closeVoting } from '@/app/lib/actions'

export default function CloseVotingButton({ gameId }: { gameId: number }) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    return (
        <button
            onClick={() => {
                if (!confirm('Fechar votação? Os resultados serão revelados.')) return
                startTransition(async () => {
                    await closeVoting(gameId)
                    router.refresh()
                })
            }}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
        >
            {isPending ? 'A fechar…' : 'Fechar Votação'}
        </button>
    )
}
