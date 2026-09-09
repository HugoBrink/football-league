import { computeEloRatings, getAllLeagues, getLeagueBySlug } from "@/app/lib/data";
import EloTable from "./EloTable";

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function EloPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const sp = await searchParams;
    const leagueParam = Array.isArray(sp?.league) ? sp?.league[0] : sp?.league;

    const leagues = await getAllLeagues();
    const league = leagueParam
        ? await getLeagueBySlug(leagueParam)
        : leagues[0];

    if (!league) return <div>Liga nao encontrada</div>;

    const ratings = await computeEloRatings(league.id);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold">{league.name} — Elo Rating</h2>
                <p className="text-sm text-gray-600">
                    Rating calculado com base em <strong>todos os jogos de todas as seasons</strong>. Começa em 1000.
                    Ganhar contra equipas mais fortes dá mais pontos. K=32.
                </p>
            </div>

            <EloTable ratings={ratings} />
        </div>
    );
}
