import prisma from "./client";

export type TournamentMatch = {
    id: number;
    season: number;
    league_id: number;
    round: number;
    position: number;
    player_id: bigint;
    opponent_id: bigint | null;
    winner_id: bigint | null;
    game_id: number | null;
    walkover: boolean;
    walkover_reason: string | null;
};

export function getRoundName(round: number, totalRounds: number): string {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi Final';
    if (round === totalRounds - 2) return 'Quartas de Final';
    if (round === totalRounds - 3) return 'Oitavas de Final';
    return `Ronda ${round}`;
}

export function calculateTotalRounds(playerCount: number): number {
    return Math.ceil(Math.log2(playerCount));
}

export async function fetchTournamentMatches(season: number, leagueId: number) {
    return prisma.tournament_mocamfe.findMany({
        where: { season, league_id: leagueId },
        orderBy: [{ round: 'asc' }, { position: 'asc' }]
    });
}

export async function clearTournament(season: number, leagueId: number) {
    await prisma.tournament_mocamfe.deleteMany({ where: { season, league_id: leagueId } });
}

export async function createInitialBracket(playerIds: string[], season: number, leagueId: number) {
    await clearTournament(season, leagueId);

    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    const matches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
        const position = Math.floor(i / 2) + 1;
        const player1 = shuffled[i];
        const player2 = i + 1 < shuffled.length ? shuffled[i + 1] : null;

        matches.push({
            season,
            league_id: leagueId,
            round: 1,
            position,
            player_id: BigInt(player1),
            opponent_id: player2 ? BigInt(player2) : null,
            winner_id: null,
            game_id: null
        });

        if (i + 1 >= shuffled.length && player1) {
            const nextRoundPosition = Math.ceil(position / 2);
            matches.push({
                season,
                league_id: leagueId,
                round: 2,
                position: nextRoundPosition,
                player_id: BigInt(player1),
                opponent_id: null,
                winner_id: null,
                game_id: null
            });
        }
    }

    await prisma.tournament_mocamfe.createMany({ data: matches });
}

export async function updateMatchFromGame(gameId: number, season: number, leagueId: number) {
    const game = await prisma.games.findUnique({ where: { id: gameId } });
    if (!game) return null;

    const brancosPlayers = new Set((game.brancos_players as any[]).map(String));
    const pretosPlayers = new Set((game.pretos_players as any[]).map(String));
    if (game.brancos_captain) brancosPlayers.add(game.brancos_captain);
    if (game.pretos_captain) pretosPlayers.add(game.pretos_captain);

    const matches = await prisma.tournament_mocamfe.findMany({
        where: {
            season,
            league_id: leagueId,
            winner_id: null,
            OR: [{
                AND: [
                    { player_id: { in: [...brancosPlayers, ...pretosPlayers].map(BigInt) } },
                    { opponent_id: { in: [...brancosPlayers, ...pretosPlayers].map(BigInt) } }
                ]
            }]
        }
    });

    for (const match of matches) {
        const playerId = String(match.player_id);
        const opponentId = match.opponent_id ? String(match.opponent_id) : null;
        if (!opponentId) continue;

        const playerInBrancos = brancosPlayers.has(playerId);
        const opponentInBrancos = brancosPlayers.has(opponentId);
        if (playerInBrancos === opponentInBrancos) continue;

        const winnerId = game.brancos_score > game.pretos_score
            ? (playerInBrancos ? match.player_id : match.opponent_id)
            : (playerInBrancos ? match.opponent_id : match.player_id);

        if (winnerId) {
            await prisma.tournament_mocamfe.update({
                where: { id: match.id },
                data: { winner_id: winnerId, game_id: game.id }
            });

            const nextRound = match.round + 1;
            const nextPosition = Math.ceil(match.position / 2);

            const existingNext = await prisma.tournament_mocamfe.findFirst({
                where: { season, league_id: leagueId, round: nextRound, position: nextPosition }
            });

            if (!existingNext) {
                await prisma.tournament_mocamfe.create({
                    data: { season, league_id: leagueId, round: nextRound, position: nextPosition, player_id: winnerId, opponent_id: null, winner_id: null, game_id: null }
                });
            } else if (!existingNext.opponent_id) {
                await prisma.tournament_mocamfe.update({
                    where: { id: existingNext.id },
                    data: { opponent_id: winnerId }
                });
            }
        }
    }
}

// Cup notifications computation
export async function computeCupNotifications(season: number, leagueId: number) {
    const pendingMatches = await prisma.tournament_mocamfe.findMany({
        where: { season, league_id: leagueId, winner_id: null, opponent_id: { not: null } }
    });

    if (pendingMatches.length === 0) {
        return { forcedCaptainPairs: [] as any[], absenceWarnings: [] as any[] };
    }

    const games = await prisma.games.findMany({
        where: { season, league_id: leagueId },
        orderBy: { date: 'asc' }
    });

    const exemptions = await prisma.cup_absence_exemptions.findMany({
        where: { match_id: { in: pendingMatches.map(m => m.id) } }
    });

    const players = await prisma.players.findMany({ where: { season, league_id: leagueId } });
    const playerMap = new Map(players.map(p => [String(p.id), p.name]));

    type ForcedCaptainPair = {
        matchId: number;
        player1Id: string;
        player1Name: string;
        player2Id: string;
        player2Name: string;
        consecutiveSameTeamGames: number;
    };

    type AbsenceWarning = {
        matchId: number;
        playerId: string;
        playerName: string;
        opponentId: string;
        opponentName: string;
        consecutiveAbsences: number;
        hasExemption: boolean;
    };

    const forcedCaptainPairs: ForcedCaptainPair[] = [];
    const absenceWarnings: AbsenceWarning[] = [];

    for (const match of pendingMatches) {
        const playerId = String(match.player_id);
        const opponentId = match.opponent_id ? String(match.opponent_id) : null;
        if (!opponentId) continue;

        let consecutiveSameTeam = 0;
        let playerAbsences = 0;
        let opponentAbsences = 0;

        for (let i = games.length - 1; i >= 0; i--) {
            const game = games[i];
            const brancosSet = new Set([
                ...(game.brancos_players as any[]).map(String),
                ...(game.brancos_captain ? [String(game.brancos_captain)] : [])
            ]);
            const pretosSet = new Set([
                ...(game.pretos_players as any[]).map(String),
                ...(game.pretos_captain ? [String(game.pretos_captain)] : [])
            ]);

            const allGamePlayers = new Set([...brancosSet, ...pretosSet]);
            const playerPresent = allGamePlayers.has(playerId);
            const opponentPresent = allGamePlayers.has(opponentId);

            if (!playerPresent) playerAbsences++;
            else playerAbsences = 0;

            if (!opponentPresent) opponentAbsences++;
            else opponentAbsences = 0;

            if (playerPresent && opponentPresent) {
                const playerInBrancos = brancosSet.has(playerId);
                const opponentInBrancos = brancosSet.has(opponentId);
                if (playerInBrancos === opponentInBrancos) {
                    consecutiveSameTeam++;
                } else {
                    break;
                }
            }
        }

        if (consecutiveSameTeam >= 3) {
            forcedCaptainPairs.push({
                matchId: match.id,
                player1Id: playerId,
                player1Name: playerMap.get(playerId) ?? '?',
                player2Id: opponentId,
                player2Name: playerMap.get(opponentId) ?? '?',
                consecutiveSameTeamGames: consecutiveSameTeam,
            });
        }

        const matchExemptions = exemptions.filter(e => e.match_id === match.id);

        if (playerAbsences >= 3) {
            absenceWarnings.push({
                matchId: match.id,
                playerId,
                playerName: playerMap.get(playerId) ?? '?',
                opponentId,
                opponentName: playerMap.get(opponentId) ?? '?',
                consecutiveAbsences: playerAbsences,
                hasExemption: matchExemptions.some(e => String(e.player_id) === playerId),
            });
        }

        if (opponentAbsences >= 3) {
            absenceWarnings.push({
                matchId: match.id,
                playerId: opponentId,
                playerName: playerMap.get(opponentId) ?? '?',
                opponentId: playerId,
                opponentName: playerMap.get(playerId) ?? '?',
                consecutiveAbsences: opponentAbsences,
                hasExemption: matchExemptions.some(e => String(e.player_id) === opponentId),
            });
        }
    }

    return { forcedCaptainPairs, absenceWarnings };
}
