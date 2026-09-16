'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { submitEloSuggestion, deleteEloSuggestion } from '@/app/lib/actions'

type Suggestion = {
    id: number
    author: string | null
    message: string
    created_at: Date
}

export default function EloSuggestionBox({
    suggestions,
    isAdmin,
}: {
    suggestions: Suggestion[]
    isAdmin: boolean
}) {
    const [author, setAuthor] = useState('')
    const [message, setMessage] = useState('')
    const [isPending, startTransition] = useTransition()
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = () => {
        if (!message.trim()) return
        startTransition(async () => {
            await submitEloSuggestion(author || null, message)
            setAuthor('')
            setMessage('')
            setSubmitted(true)
            setTimeout(() => setSubmitted(false), 3000)
        })
    }

    const handleDelete = (id: number) => {
        startTransition(async () => {
            await deleteEloSuggestion(id)
        })
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('pt-PT', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <div className="mt-6 border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-700">💬 Sugestões sobre o Elo</h3>
                <p className="text-xs text-gray-500 mt-0.5">Tens uma ideia ou opinião? Deixa aqui a tua sugestão.</p>
            </div>

            {/* Form */}
            <div className="p-4 space-y-3">
                <input
                    type="text"
                    placeholder="O teu nome (opcional)"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    maxLength={50}
                />
                <textarea
                    placeholder="Escreve aqui a tua sugestão..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    rows={3}
                    maxLength={1000}
                />
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={isPending || !message.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                A enviar...
                            </>
                        ) : (
                            'Enviar sugestão'
                        )}
                    </button>
                    {submitted && (
                        <span className="text-xs text-green-600 font-medium">✓ Sugestão enviada!</span>
                    )}
                </div>
            </div>

            {/* Suggestions list */}
            {suggestions.length > 0 && (
                <div className="border-t">
                    <div className="px-4 py-2 bg-gray-50">
                        <p className="text-xs font-medium text-gray-500">
                            {suggestions.length} sugestão{suggestions.length !== 1 ? 'ões' : ''}
                        </p>
                    </div>
                    <div className="divide-y max-h-64 overflow-y-auto">
                        {suggestions.map(s => (
                            <div key={s.id} className="px-4 py-3 hover:bg-gray-50 group">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="font-medium text-gray-700">
                                                {s.author || 'Anónimo'}
                                            </span>
                                            <span>·</span>
                                            <span>{formatDate(s.created_at)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{s.message}</p>
                                    </div>
                                    {isAdmin && (
                                        <button
                                            onClick={() => handleDelete(s.id)}
                                            disabled={isPending}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                            title="Apagar sugestão"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
