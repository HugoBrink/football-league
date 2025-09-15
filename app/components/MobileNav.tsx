'use client'

import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

type Item = { name: string; href: string }

type Props = {
    items: Item[]
    title?: string
}

export default function MobileNav({ items, title = 'Menu' }: Props) {
    const router = useRouter()
    const pathname = usePathname()

    const value = useMemo(() => {
        const current = items.find(i => i.href === pathname)
        return current?.href ?? ''
    }, [items, pathname])

    return (
        <div className="sm:hidden sticky top-0 z-30 bg-gray-800 text-white px-4 py-3 flex items-center gap-3">
            <div className="text-sm font-medium">{title}</div>
            <select
                aria-label="Mobile navigation"
                className="flex-1 bg-gray-700 text-white text-sm rounded px-2 py-1"
                value={value}
                onChange={(e) => router.push(e.target.value)}
            >
                <option value="" disabled>Escolhe uma página…</option>
                {items.map(i => (
                    <option key={i.href} value={i.href}>{i.name}</option>
                ))}
            </select>
        </div>
    )
}
