import prisma from "./client";
import { CURRENT_SEASON } from "./data";

export type TournamentMatch = {
    id: number;
    season: number;
    round: number;
    position: number;
    player_id: bigint;
    opponent_id: bigint | null;
    winner_id: bigint | null;
    game_id: number | null;
};

export function getRoundName(round: number, totalRounds: number): string {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi Final';
    if (round === totalRounds - 2) return 'Quartas de Final';
    if (round === totalRounds - 3) return 'Oitavas de Final';
    return `Ronda ${round}`;
}

export function calculateTotalRounds(playerCount: number): number {
    // Returns the number of rounds needed to complete the tournament
    // e.g., 20 players → 5 rounds (need 4 rounds to get to 2 players, plus 1 for the final)
    return Math.ceil(Math.log2(playerCount));
}

export async function fetchTournamentMatches(season: number = CURRENT_SEASON) {
    return await prisma.tournament_mocamfe.findMany({
        where: { season },
        orderBy: [
            { round: 'asc' },
            { position: 'asc' }
        ]
    });
}

export async function clearTournament(season: number = CURRENT_SEASON) {
    await prisma.tournament_mocamfe.deleteMany({
        where: { season }
    });
}

export async function createInitialBracket(playerIds: string[], season: number = CURRENT_SEASON) {
    // Clear existing tournament if any
    await clearTournament(season);

    // Shuffle players
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

    // Create first round matches
    const matches = [];
    for (let i = 0; i < shuffled.length; i += 2) {
        const position = Math.floor(i / 2) + 1;
        const player1 = shuffled[i];
        const player2 = i + 1 < shuffled.length ? shuffled[i + 1] : null;

        matches.push({
            season,
            round: 1,
            position,
            player_id: BigInt(player1),
            opponent_id: player2 ? BigInt(player2) : null,
            winner_id: null,
            game_id: null
        });

        // If this is the last player and we have an odd number,
        // they automatically advance to the next round
        if (i + 1 >= shuffled.length && player1) {
            const nextRoundPosition = Math.ceil(position / 2);
            matches.push({
                season,
                round: 2,
                position: nextRoundPosition,
                player_id: BigInt(player1),
                opponent_id: null,
                winner_id: null,
                game_id: null
            });
        }
    }

    // Batch create all matches
    await prisma.tournament_mocamfe.createMany({
        data: matches
    });
}

export async function updateMatchFromGame(gameId: number, season: number = CURRENT_SEASON) {
    const game = await prisma.games.findUnique({ where: { id: gameId } });
    if (!game) return null;

    // Convert player arrays to Sets for faster lookups
    const brancosPlayers = new Set((game.brancos_players as any[]).map(String));
    const pretosPlayers = new Set((game.pretos_players as any[]).map(String));

    // Add captains to their respective teams
    if (game.brancos_captain) brancosPlayers.add(game.brancos_captain);
    if (game.pretos_captain) pretosPlayers.add(game.pretos_captain);

    // Find tournament matches where these players face each other
    const matches = await prisma.tournament_mocamfe.findMany({
        where: {
            season,
            winner_id: null, // Only look for unresolved matches
            OR: [
                {
                    AND: [
                        { player_id: { in: [...brancosPlayers, ...pretosPlayers].map(BigInt) } },
                        { opponent_id: { in: [...brancosPlayers, ...pretosPlayers].map(BigInt) } }
                    ]
                }
            ]
        }
    });

    for (const match of matches) {
        // Convert IDs to strings for Set operations
        const playerId = String(match.player_id);
        const opponentId = match.opponent_id ? String(match.opponent_id) : null;

        // Skip if we can't determine teams
        if (!opponentId) continue;

        // Determine which team each player was on
        const playerInBrancos = brancosPlayers.has(playerId);
        const opponentInBrancos = brancosPlayers.has(opponentId);

        // Skip if players were on the same team
        if (playerInBrancos === opponentInBrancos) continue;

        // Determine winner
        const winnerId = game.brancos_score > game.pretos_score
            ? (playerInBrancos ? match.player_id : match.opponent_id)
            : (playerInBrancos ? match.opponent_id : match.player_id);

        if (winnerId) {
            // Update current match
            await prisma.tournament_mocamfe.update({
                where: { id: match.id },
                data: {
                    winner_id: winnerId,
                    game_id: game.id
                }
            });

            // Create next round match if needed
            const nextRound = match.round + 1;
            const nextPosition = Math.ceil(match.position / 2);

            const existingNext = await prisma.tournament_mocamfe.findFirst({
                where: {
                    season,
                    round: nextRound,
                    position: nextPosition
                }
            });

            if (!existingNext) {
                await prisma.tournament_mocamfe.create({
                    data: {
                        season,
                        round: nextRound,
                        position: nextPosition,
                        player_id: winnerId,
                        opponent_id: null,
                        winner_id: null,
                        game_id: null
                    }
                });
            } else if (!existingNext.opponent_id) {
                await prisma.tournament_mocamfe.update({
                    where: { id: existingNext.id },
                    data: {
                        opponent_id: winnerId
                    }
                });
            }
        }
    }
}
