'use client'

import { Archive, Globe, Home, List, Swords, Trophy, User, ChevronDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

type League = {
    id: number;
    slug: string;
    name: string;
    city: string;
    current_season: number;
    pastSeasons: number[];
};

type NavLinksProps = {
    leagues: League[];
};

export default function NavLinks({ leagues }: NavLinksProps) {
    const pathname = usePathname();
    const [seasonsOpen, setSeasonsOpen] = useState(false);

    // Detect current league from URL
    const currentLeagueSlug = leagues.find(l => pathname.startsWith(`/dashboard/${l.slug}`))?.slug;
    const currentLeague = leagues.find(l => l.slug === currentLeagueSlug);

    const leagueNavItems = currentLeague ? [
        { name: `Tabela da Liga (S${currentLeague.current_season})`, href: `/dashboard/${currentLeague.slug}`, icon: Home },
        { name: `Jogos (S${currentLeague.current_season})`, href: `/dashboard/${currentLeague.slug}/games`, icon: List },
        { name: 'Taca', href: `/dashboard/${currentLeague.slug}/tournament`, icon: Trophy },
        { name: 'Estatisticas', href: `/players?league=${currentLeague.slug}`, icon: User },
        { name: 'Duelos', href: `/players/duels?league=${currentLeague.slug}`, icon: Swords },
        { name: 'Elo Rating', href: `/players/elo?league=${currentLeague.slug}`, icon: TrendingUp },
    ] : [];

    // Auto-open seasons if we're on a season archive page
    useEffect(() => {
        if (currentLeague && pathname.includes('/season/')) {
            setSeasonsOpen(true);
        }
    }, [pathname, currentLeague]);

    const isActive = (href: string) => {
        if (href.includes('?')) {
            return pathname === href.split('?')[0];
        }
        return pathname === href;
    };

    return (
        <div className="space-y-1">
            {/* League selector tabs */}
            <div className="flex gap-1 mb-3">
                {leagues.map(league => (
                    <Link
                        key={league.slug}
                        href={`/dashboard/${league.slug}`}
                        className={`flex-1 text-center py-1.5 px-2 rounded-md text-sm font-medium transition-colors
                            ${currentLeagueSlug === league.slug
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        {league.city}
                    </Link>
                ))}
            </div>

            {/* League-specific nav items */}
            {leagueNavItems.map(item => (
                <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 ${isActive(item.href) ? 'bg-gray-700' : ''}`}
                >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                </Link>
            ))}

            {/* Separator */}
            <div className="border-t border-gray-600 my-2" />

            {/* Global standings */}
            <Link
                href="/dashboard/geral"
                className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 ${pathname === '/dashboard/geral' ? 'bg-gray-700' : ''}`}
            >
                <Globe className="h-5 w-5" />
                <span>Classificacao Geral</span>
            </Link>

            {/* Past seasons (collapsible) */}
            {currentLeague && currentLeague.pastSeasons.length > 0 && (
                <>
                    <button
                        onClick={() => setSeasonsOpen(!seasonsOpen)}
                        className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-gray-700 text-left"
                    >
                        <div className="flex items-center space-x-2">
                            <Archive className="h-5 w-5" />
                            <span>Seasons Anteriores</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${seasonsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {seasonsOpen && (
                        <div className="ml-7 space-y-1">
                            {currentLeague.pastSeasons.map(s => (
                                <Link
                                    key={s}
                                    href={`/dashboard/${currentLeague.slug}/season/${s}`}
                                    className={`block p-1.5 rounded-md text-sm hover:bg-gray-700 ${pathname.startsWith(`/dashboard/${currentLeague.slug}/season/${s}`) ? 'bg-gray-700' : ''}`}
                                >
                                    Season {s}
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
