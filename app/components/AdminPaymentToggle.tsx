'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { adminMarkPaid } from '@/app/lib/actions'

export default function AdminPaymentToggle({ gameId, playerName, isPaid }: {
    gameId: number;
    playerName: string;
    isPaid: boolean;
}) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    return (
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
            isPaid ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
        }`}>
            <span className={`text-sm font-medium ${isPaid ? 'text-green-800' : 'text-gray-700'}`}>
                {isPaid && '💰 '}{playerName}
            </span>
            <button
                onClick={() => {
                    startTransition(async () => {
                        await adminMarkPaid(gameId, playerName)
                        router.refresh()
                    })
                }}
                disabled={isPending}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${
                    isPaid
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                        : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
                {isPending ? '…' : isPaid ? 'Remover' : 'Marcar pago'}
            </button>
        </div>
    )
}
