'use client'

import { Archive, Home, List, Swords, Trophy, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
    { name: 'League Table (S2)', href: '/dashboard', icon: Home },
    { name: 'Games (S2)', href: '/dashboard/games', icon: List },
    { name: 'Season 1 Archive', href: '/dashboard/season/1', icon: Archive },
    { name: 'Player Stats ', href: `/players`, icon: User },
    { name: 'Duels', href: `/players/duels`, icon: Swords },
    { name: 'Taça Mocamfe', href: '/dashboard/tournament', icon: Trophy },
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
