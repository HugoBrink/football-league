'use client'

import Link from 'next/link'
import React from 'react'
import { Home, List, User } from 'lucide-react'
import { usePathname } from 'next/navigation'

const navItems = [
    { name: 'League Table', href: '/dashboard', icon: Home },
    { name: 'Games', href: '/dashboard/games', icon: List },
    { name: 'Player Stats', href: '/players', icon: User },
]

export default function SideNav() {
    const pathname = usePathname()

    return (
        <div className="bg-gray-800 text-white w-full min-h-screen p-4 ">
            <h1 className="text-white text-2xl font-bold pb-2 cursor-default">Grupeta do Futebol</h1>
            {navItems.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 ${pathname === item.href ? 'bg-gray-700' : ''
                        }`}
                >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                </Link>
            ))}
        </div>
    )
}
