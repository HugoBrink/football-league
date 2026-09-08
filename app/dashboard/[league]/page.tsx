import Table from "@/app/components/Table";
import { fetchPlayers, getLeagueBySlug } from "@/app/lib/data";
import Add from "@/app/components/Add";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import AdminMenu from "./AdminMenu";

export default async function LeagueDashboard({ params }: { params: Promise<{ league: string }> }) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const [players, session] = await Promise.all([
        fetchPlayers(league.current_season, league.id),
        auth()
    ]);

    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <h1 className="text-gray-900">{league.name} — Season {league.current_season}</h1>
                    <Link href={`/dashboard/${leagueSlug}/games`}
                        className="bg-slate-400 text-white rounded-md px-2 py-1 sm:hidden">
                        Ver Jogos
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <Add type="players" leagueSlug={leagueSlug} />
                    <Add type="games" leagueSlug={leagueSlug} />
                    {session?.user && (
                        <AdminMenu leagueSlug={leagueSlug} currentSeason={league.current_season} />
                    )}
                </div>
            </div>
            <Table players={players} />
        </div>
    );
}
