import { CURRENT_SEASON, fetchGames, fetchPlayersNames } from "@/app/lib/data";
import SeasonSelect from "../SeasonSelect";
import DuelExplorer from "./DuelExplorer";

type SearchParams = { [key: string]: string | string[] | undefined }

export default async function Page({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
    const sp: SearchParams | undefined = searchParams && typeof (searchParams as any).then === 'function'
        ? await (searchParams as Promise<SearchParams>)
        : (searchParams as SearchParams | undefined);
    const seasonParam = Array.isArray(sp?.season) ? sp?.season[0] : sp?.season;
    const season = seasonParam ? Number(seasonParam) : CURRENT_SEASON;

    let [players, games] = await Promise.all([
        fetchPlayersNames(season),
        fetchGames(season)
    ]);
    // Fallback if no data for selected season
    if (players.length === 0) {
        players = await fetchPlayersNames(1);
    }
    if (games.length === 0) {
        games = await fetchGames(1);
    }

    const seasonsList = Array.from({ length: Math.max(CURRENT_SEASON, season) }, (_, i) => i + 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Duels — Season {season}</h2>
                    <p className="text-sm text-gray-500">Compare dois jogadores: jogos juntos e contra, e companheiros mais frequentes.</p>
                </div>
                <SeasonSelect season={season} seasons={seasonsList} />
            </div>

            <DuelExplorer
                players={players.map(p => ({ id: String(p.id), name: p.name }))}
                games={games as any}
            />
        </div>
    )
}
