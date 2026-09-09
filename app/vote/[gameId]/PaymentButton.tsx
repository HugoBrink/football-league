'use client'

import { useTransition } from 'react'
import { markPaid } from '@/app/lib/actions'
import { useRouter } from 'next/navigation'

export default function PaymentButton({ gameId, playerName, isPaid }: {
    gameId: number;
    playerName: string;
    isPaid: boolean;
}) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    if (isPaid) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                <span>💰</span>
                <span className="font-medium">{playerName}</span>
                <span className="text-xs text-green-500 ml-auto">Pago ✓</span>
            </div>
        )
    }

    return (
        <button
            onClick={() => {
                startTransition(async () => {
                    await markPaid(gameId, playerName)
                    router.refresh()
                })
            }}
            disabled={isPending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-200 transition-colors text-sm disabled:opacity-50"
        >
            <span>💰</span>
            <span className="font-medium">{playerName}</span>
            <span className="text-xs text-gray-400 ml-auto">{isPending ? 'A marcar…' : 'Marcar pago (5,90€)'}</span>
        </button>
    )
}
