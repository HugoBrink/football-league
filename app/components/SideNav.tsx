import React from 'react'
import { PowerIcon } from 'lucide-react'
import { signOut } from '../../auth'
import NavLinks from './NavLinks'
import { auth } from '@/auth'
import { getAllLeagues, getLeagueSeasons } from '@/app/lib/data'
import { headers } from 'next/headers'

export default async function SideNav() {
    const session = await auth();
    const leagues = await getAllLeagues();

    // Get current league slug from URL to load past seasons
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || headersList.get('next-url') || '';
    const leagueMatch = pathname.match(/\/dashboard\/([^/]+)/);
    const currentLeagueSlug = leagueMatch?.[1];
    const currentLeague = leagues.find(l => l.slug === currentLeagueSlug);

    let pastSeasons: number[] = [];
    if (currentLeague) {
        const allSeasons = await getLeagueSeasons(currentLeague.id);
        pastSeasons = allSeasons.filter(s => s < currentLeague.current_season).sort((a, b) => b - a);
    }

    const leagueData = leagues.map(l => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        city: l.city,
        current_season: l.current_season,
    }));

    return (
        <div className="sticky top-0 bg-gray-800 text-white w-full h-screen p-4 flex flex-col justify-between">
            <div>
                <h1 className="text-white text-2xl font-bold pb-2 cursor-default">Grupeta do Futebol</h1>
                <NavLinks leagues={leagueData} pastSeasons={pastSeasons} />
            </div>
            {session?.user && (
                <form
                    action={async () => {
                        'use server';
                        await signOut();
                    }}
                >
                    <button className="flex items-center justify-center space-x-2 w-full p-1 rounded-lg bg-gray-500 hover:bg-gray-700">
                        <PowerIcon className="w-6" />
                        <div className="hidden md:block">Sign Out</div>
                    </button>
                </form>
            )}
        </div>
    );
}
