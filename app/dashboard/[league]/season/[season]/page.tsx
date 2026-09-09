import Table from "@/app/components/Table";
import { fetchPlayers, getLeagueBySlug } from "@/app/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SeasonOverview({ params }: { params: Promise<{ season: string; league: string }> }) {
    const { season, league: leagueSlug } = await params;
    const seasonNumber = Number(season);
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const players = await fetchPlayers(seasonNumber, league.id);

    return (
        <div>
            <div className="flex justify-between items-center w-full sm:pt-0 px-6 pt-4">
                <div className="gap-2 flex flex-col items-center">
                    <h1>{league.name} — Season {seasonNumber}</h1>
                    <Link href={`/dashboard/${leagueSlug}/season/${seasonNumber}/games`}
                        className="bg-slate-400 text-white rounded-md px-2 py-1">
                        Ver Jogos
                    </Link>
                </div>
            </div>
            <Table players={players} leagueSlug={leagueSlug} />
        </div>
    );
}
