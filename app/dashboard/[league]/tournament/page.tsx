import { fetchPlayers, getLeagueBySlug } from "@/app/lib/data";
import { Player } from "@/app/lib/definitions";
import { fetchTournamentMatches, computeCupNotifications } from "@/app/lib/tournament";
import { auth } from "@/auth";
import { createTournamentBracket } from "./actions";
import ClearTournamentButton from "./ClearTournamentButton";
import TournamentBracket from "./TournamentBracket";
import CupNotifications from "./CupNotifications";
import { notFound } from "next/navigation";

export default async function TournamentPage({ params }: { params: Promise<{ league: string }> }) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const [matches, players, session, notifications] = await Promise.all([
        fetchTournamentMatches(league.current_season, league.id),
        fetchPlayers(league.current_season, league.id),
        auth(),
        computeCupNotifications(league.current_season, league.id)
    ]);

    const createBracketWithLeague = async (playerIds: string[]) => {
        'use server';
        return createTournamentBracket(leagueSlug, playerIds);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Taca — {league.name} Season {league.current_season}</h2>
                    <p className="text-sm text-gray-500">Torneio eliminatorio 1v1</p>
                </div>
                {session?.user && matches.length > 0 && (
                    <ClearTournamentButton leagueSlug={leagueSlug} />
                )}
            </div>

            {session?.user && (notifications.forcedCaptainPairs.length > 0 || notifications.absenceWarnings.length > 0) && (
                <CupNotifications notifications={notifications} />
            )}

            <TournamentBracket
                matches={matches}
                players={players.map((p: Player) => ({ id: String(p.id), name: p.name }))}
                onCreateBracket={createBracketWithLeague}
            />
        </div>
    );
}
