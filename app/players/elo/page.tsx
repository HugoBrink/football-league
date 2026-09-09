import { computeEloRatings, getAllLeagues, getLeagueBySlug, getLeagueSeasons } from "@/app/lib/data";
import EloTable from "./EloTable";

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function EloPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const sp = await searchParams;
    const leagueParam = Array.isArray(sp?.league) ? sp?.league[0] : sp?.league;
    const seasonParam = Array.isArray(sp?.season) ? sp?.season[0] : sp?.season;

    const leagues = await getAllLeagues();
    const league = leagueParam
        ? await getLeagueBySlug(leagueParam)
        : leagues[0];

    if (!league) return <div>Liga nao encontrada</div>;

    // Default to current season; "overall" is opt-in
    const season = seasonParam === 'overall'
        ? undefined
        : seasonParam
            ? Number(seasonParam)
            : league.current_season;

    const [ratings, seasons] = await Promise.all([
        computeEloRatings(league.id, season),
        getLeagueSeasons(league.id),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{league.name} — Elo Rating</h2>
                <p className="text-sm text-gray-600">
                    Rating Elo calculado jogo a jogo. Começa em 1000.
                    Ganhar contra equipas mais fortes dá mais pontos. K=32.
                </p>
            </div>

            <EloTable
                ratings={ratings}
                seasons={seasons}
                currentSeason={season}
            />
        </div>
    );
}
