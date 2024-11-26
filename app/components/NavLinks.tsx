'use client'

import React from 'react'
import { Home, List, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
    { name: 'League Table', href: '/dashboard', icon: Home },
    { name: 'Games', href: '/dashboard/games', icon: List },
    { name: 'Player Stats (in development)', href: '/players', icon: User },
]
export default function NavLinks() {
    const pathname = usePathname()
    return (
        navItems.map((item) => (
            <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 ${pathname === item.href ? 'bg-gray-700' : ''
                    }`}
            >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
            </Link>
        ))
    )
}
