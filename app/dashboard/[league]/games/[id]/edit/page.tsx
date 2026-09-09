import { updateGame, createPlayerInline } from "@/app/lib/actions";
import { fetchTournamentMatches } from "@/app/lib/tournament";
import { fetchGame, fetchPlayers, getLeagueBySlug } from "@/app/lib/data";
import GameForm from "@/app/components/GameForm";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ id: string; league: string }> }) {
    const { id, league: leagueSlug } = await params;
    const league = await getLeagueBySlug(leagueSlug);
    if (!league) notFound();

    const [game, players, tournamentMatches] = await Promise.all([
        fetchGame(id),
        fetchPlayers(league.current_season, league.id),
        fetchTournamentMatches(league.current_season, league.id)
    ]);

    if (!game) return <div>Game not found</div>;

    const tournamentMatch = tournamentMatches.find(m => m.game_id === game.id);
    const pendingMatches = tournamentMatches.filter(m => !m.game_id || m.game_id === game.id);
    const tournamentOptions = pendingMatches.map(match => ({
        id: match.id,
        round: match.round,
        playerName: players.find((p: any) => String(p.id) === String(match.player_id))?.name ?? '?',
        opponentName: match.opponent_id
            ? players.find((p: any) => String(p.id) === String(match.opponent_id))?.name ?? '?'
            : 'TBD',
    }));

    const simplePlayers = players.map((p: any) => ({ id: String(p.id), name: p.name }));
    const brancosPlayersList = Array.isArray(game.brancos_players) ? game.brancos_players.map(String) : [];
    const pretosPlayersList = Array.isArray(game.pretos_players) ? game.pretos_players.map(String) : [];

    const updateGameAction = updateGame.bind(null, leagueSlug, game as any);
    const createPlayerWithLeague = async (name: string) => {
        'use server';
        return createPlayerInline(leagueSlug, name);
    };

    return (
        <GameForm
            players={simplePlayers}
            formAction={updateGameAction}
            onCreatePlayer={createPlayerWithLeague}
            tournamentMatches={tournamentOptions}
            leagueSlug={leagueSlug}
            initialData={{
                date: new Date(game.date).toISOString().split('T')[0],
                brancosCaptain: game.brancos_captain ? String(game.brancos_captain) : null,
                brancosPlayers: brancosPlayersList,
                pretosCaptain: game.pretos_captain ? String(game.pretos_captain) : null,
                pretosPlayers: pretosPlayersList,
                brancosScore: game.brancos_score ?? 0,
                pretosScore: game.pretos_score ?? 0,
                tournamentMatchId: tournamentMatch?.id,
                numero: game.numero,
                noResult: game.brancos_score == null,
            }}
        />
    );
}
