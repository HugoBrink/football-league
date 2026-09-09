'use client'

import { useState, useTransition } from 'react'
import { renamePlayer } from '@/app/lib/actions'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'

export default function RenamePlayerForm({ playerName, leagueId, leagueSlug }: {
    playerName: string;
    leagueId: number;
    leagueSlug: string;
}) {
    const [editing, setEditing] = useState(false)
    const [newName, setNewName] = useState(playerName)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    if (!editing) {
        return (
            <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
                <Pencil className="w-3 h-3" />
                Editar nome
            </button>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="border rounded-md px-2 py-1 text-sm flex-1"
                autoFocus
            />
            <button
                onClick={() => {
                    if (newName.trim() === playerName) {
                        setEditing(false)
                        return
                    }
                    startTransition(async () => {
                        await renamePlayer(leagueId, playerName, newName.trim())
                        router.push(`/players/${encodeURIComponent(newName.trim())}?league=${leagueSlug}`)
                    })
                }}
                disabled={isPending || !newName.trim()}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
                {isPending ? 'A guardar…' : 'Guardar'}
            </button>
            <button
                onClick={() => { setNewName(playerName); setEditing(false) }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
                Cancelar
            </button>
        </div>
    )
}
