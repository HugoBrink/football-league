import { createGame, createPlayerInline } from "@/app/lib/actions";
import { fetchPlayersNames, getLeagueBySlug } from "@/app/lib/data";
import { fetchTournamentMatches } from "@/app/lib/tournament";
import GameForm from "@/app/components/GameForm";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ league: string }> }) {
    const { league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const [players, tournamentMatches] = await Promise.all([
        fetchPlayersNames(league.current_season, league.id),
        fetchTournamentMatches(league.current_season, league.id)
    ]);

    const pendingMatches = tournamentMatches.filter(match => !match.game_id);
    const tournamentOptions = pendingMatches.map(match => ({
        id: match.id,
        round: match.round,
        playerName: players.find(p => String(p.id) === String(match.player_id))?.name ?? '?',
        opponentName: match.opponent_id
            ? players.find(p => String(p.id) === String(match.opponent_id))?.name ?? '?'
            : 'TBD',
    }));

    const simplePlayers = players.map((p: any) => ({ id: String(p.id), name: p.name }));

    const createGameWithLeague = createGame.bind(null, leagueSlug);
    const createPlayerWithLeague = async (name: string) => {
        'use server';
        return createPlayerInline(leagueSlug, name);
    };

    return (
        <GameForm
            players={simplePlayers}
            formAction={createGameWithLeague}
            onCreatePlayer={createPlayerWithLeague}
            tournamentMatches={tournamentOptions}
            leagueSlug={leagueSlug}
        />
    );
}
