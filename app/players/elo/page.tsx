import { computeEloRatings, fetchEloSuggestions, getAllLeagues, getLeagueBySlug, getLeagueSeasons } from "@/app/lib/data";
import { auth } from "@/auth";
import EloTable from "./EloTable";
import EloSuggestionBox from "./EloSuggestionBox";

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

    // Default to overall; specific season is opt-in
    const season = seasonParam && seasonParam !== 'overall'
        ? Number(seasonParam)
        : undefined;

    const [ratings, seasons, suggestions, session] = await Promise.all([
        computeEloRatings(league.id, season),
        getLeagueSeasons(league.id),
        fetchEloSuggestions(),
        auth(),
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
                leagueSlug={league.slug}
            />

            <EloSuggestionBox
                suggestions={suggestions}
                isAdmin={!!session?.user}
            />
        </div>
    );
}
