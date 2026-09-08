import { getLeagueBySlug, fetchImportablePlayers, fetchPlayers } from "@/app/lib/data";
import { notFound } from "next/navigation";
import PlayerCreateForm from "./PlayerCreateForm";

export default async function Page({ params }: { params: Promise<{ league: string }> }) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const [importable, currentPlayers] = await Promise.all([
        fetchImportablePlayers(league.current_season, league.id),
        fetchPlayers(league.current_season, league.id)
    ]);

    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-gray-900 mb-6">Adicionar Jogador — {league.name}</h1>
            <PlayerCreateForm
                leagueSlug={leagueSlug}
                importablePlayers={importable}
                currentPlayerNames={currentPlayers.map(p => p.name)}
            />
        </div>
    );
}
