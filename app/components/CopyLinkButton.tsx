'use client'

import { useState } from 'react'

export default function CopyLinkButton({ path }: { path: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        const url = `${window.location.origin}${path}`
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border rounded px-2 py-1 transition-colors"
        >
            {copied ? '✅ Copiado!' : '📋 Copiar link de votação'}
        </button>
    )
}
