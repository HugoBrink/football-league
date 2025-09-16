import { CURRENT_SEASON, fetchPlayers } from "@/app/lib/data";
import { Player } from "@/app/lib/definitions";
import { fetchTournamentMatches } from "@/app/lib/tournament";
import { auth } from "@/auth";
import { createTournamentBracket } from "./actions";
import ClearTournamentButton from "./ClearTournamentButton";
import TournamentBracket from "./TournamentBracket";

export default async function TournamentPage() {
    const [matches, players, session] = await Promise.all([
        fetchTournamentMatches(),
        fetchPlayers(CURRENT_SEASON),
        auth()
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Taça Mocamfe — Season {CURRENT_SEASON}</h2>
                    <p className="text-sm text-gray-500">Torneio eliminatório 1v1</p>
                </div>
                {session?.user && matches.length > 0 && (
                    <ClearTournamentButton />
                )}
            </div>

            <TournamentBracket
                matches={matches}
                players={players.map((p: Player) => ({ id: String(p.id), name: p.name }))}
                onCreateBracket={createTournamentBracket}
            />
        </div>
    );
}
