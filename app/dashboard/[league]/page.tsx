import Table from "@/app/components/Table";
import { fetchPlayers, getLeagueBySlug } from "@/app/lib/data";
import Add from "@/app/components/Add";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LeagueDashboard({ params }: { params: Promise<{ league: string }> }) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const players = await fetchPlayers(league.current_season, league.id);

    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <h1>{league.name} — Season {league.current_season}</h1>
                    <Link href={`/dashboard/${leagueSlug}/games`}
                        className="bg-slate-400 text-white rounded-md px-2 py-1 sm:hidden">
                        Ver Jogos
                    </Link>
                </div>
                <Add type="players" leagueSlug={leagueSlug} />
                <Add type="games" leagueSlug={leagueSlug} />
            </div>
            <Table players={players} />
        </div>
    );
}
