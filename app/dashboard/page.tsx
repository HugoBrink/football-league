import { getAllLeagues } from "../lib/data";
import Link from "next/link";
import { MapPin } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DashboardLanding() {
    const leagues = await getAllLeagues();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Grupeta do Futebol</h1>
                <p className="text-gray-500 mt-2">Escolhe a tua liga</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
                {leagues.map(league => (
                    <Link
                        key={league.slug}
                        href={`/dashboard/${league.slug}`}
                        className="flex flex-col items-center gap-3 p-8 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all bg-white"
                    >
                        <MapPin className="w-8 h-8 text-blue-500" />
                        <span className="text-xl font-bold">{league.name}</span>
                        <span className="text-sm text-gray-500">{league.city}</span>
                        <span className="text-xs text-gray-400">Season {league.current_season}</span>
                    </Link>
                ))}
            </div>
            <Link
                href="/dashboard/geral"
                className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
                Ver Classificacao Geral
            </Link>
        </div>
    );
}
