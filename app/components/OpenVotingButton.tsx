'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { openVoting } from '@/app/lib/actions'

export default function OpenVotingButton({ gameId, leagueId }: { gameId: number; leagueId: number }) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    return (
        <button
            onClick={() => {
                startTransition(async () => {
                    await openVoting(gameId, leagueId)
                    router.refresh()
                })
            }}
            disabled={isPending}
            className="text-xs text-blue-500 hover:text-blue-700 underline disabled:opacity-50"
        >
            {isPending ? 'A abrir…' : 'Abrir Votação'}
        </button>
    )
}
