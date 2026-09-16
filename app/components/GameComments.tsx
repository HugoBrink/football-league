'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { submitGameComment, deleteGameComment } from '@/app/lib/actions'

type Comment = {
    id: number
    author: string
    message: string
    created_at: Date
}

export default function GameComments({
    gameId,
    comments,
    isAdmin,
}: {
    gameId: number
    comments: Comment[]
    isAdmin: boolean
}) {
    const [author, setAuthor] = useState('')
    const [message, setMessage] = useState('')
    const [isPending, startTransition] = useTransition()
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = () => {
        if (!author.trim() || !message.trim()) return
        startTransition(async () => {
            await submitGameComment(gameId, author, message)
            setMessage('')
            setSubmitted(true)
            setTimeout(() => setSubmitted(false), 3000)
        })
    }

    const handleDelete = (id: number) => {
        startTransition(async () => {
            await deleteGameComment(id)
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
        <div className="w-full border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-700">
                    💬 Comentários
                    {comments.length > 0 && (
                        <span className="ml-1 font-normal text-xs text-gray-400">({comments.length})</span>
                    )}
                </h3>
            </div>

            {/* Comments list */}
            {comments.length > 0 && (
                <div className="divide-y max-h-72 overflow-y-auto">
                    {comments.map(c => (
                        <div key={c.id} className="px-4 py-3 hover:bg-gray-50 group">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span className="font-semibold text-gray-700">{c.author}</span>
                                        <span>·</span>
                                        <span>{formatDate(c.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{c.message}</p>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        disabled={isPending}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all shrink-0"
                                        title="Apagar comentário"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form */}
            <div className="p-4 space-y-2 border-t">
                <input
                    type="text"
                    placeholder="O teu nome"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                    maxLength={50}
                />
                <textarea
                    placeholder="Escreve um comentário..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                    rows={2}
                    maxLength={500}
                />
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={isPending || !author.trim() || !message.trim()}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                A enviar...
                            </>
                        ) : (
                            'Comentar'
                        )}
                    </button>
                    {submitted && (
                        <span className="text-xs text-green-600 font-medium">✓ Comentário adicionado!</span>
                    )}
                </div>
            </div>
        </div>
    )
}
