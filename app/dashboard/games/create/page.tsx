import { createGame, createPlayerInline } from "@/app/lib/actions";
import { fetchPlayersNames } from "@/app/lib/data";
import { fetchTournamentMatches } from "@/app/lib/tournament";
import GameForm from "@/app/components/GameForm";

export default async function Page() {
    const [players, tournamentMatches] = await Promise.all([
        fetchPlayersNames(),
        fetchTournamentMatches()
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

    return (
        <GameForm
            players={simplePlayers}
            formAction={createGame}
            onCreatePlayer={createPlayerInline}
            tournamentMatches={tournamentOptions}
        />
    );
}
