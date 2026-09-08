import { fetchGames, fetchPlayersNames, getAllLeagues, getLeagueBySlug } from "@/app/lib/data";
import SeasonSelect from "../SeasonSelect";
import DuelExplorer from "./DuelExplorer";

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const sp = await searchParams;
    const leagueParam = Array.isArray(sp.league) ? sp.league[0] : sp.league;

    const leagues = await getAllLeagues();
    const league = leagueParam
        ? await getLeagueBySlug(leagueParam)
        : leagues[0];

    if (!league) return <div>Liga nao encontrada</div>;

    const seasonParam = Array.isArray(sp.season) ? sp.season[0] : sp.season;
    const season = seasonParam ? Number(seasonParam) : league.current_season;

    let [players, games] = await Promise.all([
        fetchPlayersNames(season, league.id),
        fetchGames(season, league.id),
    ]);

    if (players.length === 0) {
        players = await fetchPlayersNames(1, league.id);
    }
    if (games.length === 0) {
        games = await fetchGames(1, league.id);
    }

    const seasonsList = Array.from(
        { length: Math.max(league.current_season, season) },
        (_, i) => i + 1,
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">{league.name} — Duels Season {season}</h2>
                    <p className="text-sm text-gray-600">
                        Compare dois jogadores: jogos juntos e contra, e companheiros mais frequentes.
                    </p>
                </div>
                <SeasonSelect season={season} seasons={seasonsList} />
            </div>

            <DuelExplorer
                players={players.map((p) => ({ id: String(p.id), name: p.name }))}
                games={games as any}
            />
        </div>
    );
}
