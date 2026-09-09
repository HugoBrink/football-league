'use server'

import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWinningAndLosingTeams } from "../helpers/functions";
import prisma from "./client";
import { Game } from "./definitions";
import { updateMatchFromGame } from "./tournament";

const gameSchema = z.object({
    date: z.coerce.date(),
    brancos_score: z.coerce.number().nullable(),
    pretos_score: z.coerce.number().nullable(),
    goal_difference: z.number().nullable(),
    brancos_captain: z.string(),
    brancos_players: z.array(z.string()),
    pretos_captain: z.string(),
    pretos_players: z.array(z.string()),
    numero: z.number().optional(),
    tournament_match_id: z.number().optional(),
});

const CreateGame = gameSchema.omit({ numero: true });

async function batchUpdatePlayers(
    playerIds: string[],
    { games = 1, wins = 0, losses = 0, draws = 0, points = 0, goalsDiff = 0 }
) {
    const playerIdsBigInt = playerIds.map(id => BigInt(id));
    return prisma.players.updateMany({
        where: { id: { in: playerIdsBigInt } },
        data: {
            games: { increment: games },
            wins: { increment: wins },
            losses: { increment: losses },
            draws: { increment: draws },
            points: { increment: points },
            goals_diff: { increment: goalsDiff }
        }
    });
}

export async function createPlayer(leagueSlug: string, formData: FormData) {
    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');
    const name = formData.get('name') as string;
    await prisma.players.create({ data: { name, season: league.current_season, league_id: league.id } });
    redirect(`/dashboard/${leagueSlug}/players/create`);
}

export async function createPlayerInline(leagueSlug: string, name: string): Promise<{ id: string; name: string }> {
    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');
    const player = await prisma.players.create({ data: { name, season: league.current_season, league_id: league.id } });
    revalidatePath(`/dashboard/${leagueSlug}`);
    return { id: String(player.id), name: player.name };
}

export async function importPlayerFromOtherLeague(leagueSlug: string, playerName: string) {
    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');

    const existing = await prisma.players.findFirst({
        where: { name: playerName, season: league.current_season, league_id: league.id }
    });
    if (existing) throw new Error('Player already exists in this league');

    await prisma.players.create({
        data: { name: playerName, season: league.current_season, league_id: league.id, points: 0, games: 0, wins: 0, losses: 0, draws: 0, goals_diff: 0 }
    });

    revalidatePath(`/dashboard/${leagueSlug}`);
    revalidatePath(`/dashboard/${leagueSlug}/players/create`);
}

export async function deletePlayer(id: string) {
    return prisma.players.delete({ where: { id: BigInt(id) } });
}

export async function renamePlayer(leagueId: number, oldName: string, newName: string) {
    const authSession = await auth();
    if (!authSession?.user) throw new Error('Not authorized');

    if (!newName.trim()) throw new Error('Name cannot be empty');

    // Update all player rows with this name in this league (across seasons)
    await prisma.players.updateMany({
        where: { name: oldName, league_id: leagueId },
        data: { name: newName.trim() },
    });

    // Update vote records
    await prisma.$executeRaw`UPDATE game_votes SET voter_name = ${newName.trim()} WHERE voter_name = ${oldName} AND game_id IN (SELECT id FROM games WHERE league_id = ${leagueId})`;
    await prisma.$executeRaw`UPDATE game_votes SET best_player = ${newName.trim()} WHERE best_player = ${oldName} AND game_id IN (SELECT id FROM games WHERE league_id = ${leagueId})`;
    await prisma.$executeRaw`UPDATE game_votes SET disruptor = ${newName.trim()} WHERE disruptor = ${oldName} AND game_id IN (SELECT id FROM games WHERE league_id = ${leagueId})`;
    await prisma.$executeRaw`UPDATE game_votes SET wall = ${newName.trim()} WHERE wall = ${oldName} AND game_id IN (SELECT id FROM games WHERE league_id = ${leagueId})`;
    await prisma.$executeRaw`UPDATE game_votes SET best_goal = ${newName.trim()} WHERE best_goal = ${oldName} AND game_id IN (SELECT id FROM games WHERE league_id = ${leagueId})`;

    revalidatePath('/players');
    revalidatePath('/dashboard');
}

export async function adminMarkPaid(gameId: number, playerName: string) {
    const authSession = await auth();
    if (!authSession?.user) throw new Error('Not authorized');

    // Upsert: if vote exists, mark paid; if not, create a minimal record
    const existing = await prisma.game_votes.findUnique({
        where: { game_id_voter_name: { game_id: gameId, voter_name: playerName } },
    });

    if (existing) {
        await prisma.game_votes.update({
            where: { game_id_voter_name: { game_id: gameId, voter_name: playerName } },
            data: { has_paid: !existing.has_paid },
        });
    } else {
        // Create a payment-only record (no votes)
        await prisma.game_votes.create({
            data: {
                game_id: gameId,
                voter_name: playerName,
                best_player: '',
                disruptor: '',
                wall: '',
                has_paid: true,
            },
        });
    }

    revalidatePath('/dashboard');
}

export async function createGame(leagueSlug: string, formData: FormData): Promise<void> {
    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');

    const noResult = formData.get('no-result') === '1';
    const bScore = noResult ? null : Number(formData.get('brancos-score'));
    const pScore = noResult ? null : Number(formData.get('pretos-score'));

    const rawFormData = {
        date: formData.get('date'),
        brancos_score: bScore,
        pretos_score: pScore,
        goal_difference: bScore != null && pScore != null ? bScore - pScore : null,
        brancos_captain: formData.get('captain-brancos'),
        brancos_players: formData.getAll('players-brancos[]'),
        pretos_captain: formData.get('captain-pretos'),
        pretos_players: formData.getAll('players-pretos[]'),
        tournament_match_id: formData.get('tournament-match-id') ? Number(formData.get('tournament-match-id')) : undefined
    };

    const parsedFormData = CreateGame.safeParse(rawFormData);

    if (!parsedFormData.success) {
        console.log(parsedFormData.error.flatten().fieldErrors);
        return;
    }

    const hasResult = parsedFormData.data.brancos_score != null && parsedFormData.data.pretos_score != null;

    // Only update player stats if there's a result
    if (hasResult) {
        const goal_difference = parsedFormData.data.goal_difference!;
        const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(parsedFormData.data as Game);
        const absGoalDifference = Math.abs(goal_difference);

        if (isDraw) {
            await Promise.all([
                batchUpdatePlayers(winningTeam, { draws: 1, points: 2, goalsDiff: 0 }),
                batchUpdatePlayers(losingTeam, { draws: 1, points: 2, goalsDiff: 0 })
            ]);
        } else {
            await Promise.all([
                batchUpdatePlayers(winningTeam, { wins: 1, points: 3, goalsDiff: absGoalDifference }),
                batchUpdatePlayers(losingTeam, { losses: 1, points: 1, goalsDiff: -absGoalDifference })
            ]);
        }
    }

    const game = await prisma.games.create({
        data: { ...parsedFormData.data, season: league.current_season, league_id: league.id }
    });

    if (game.id && hasResult) {
        await updateMatchFromGame(game.id, league.current_season, league.id);
    }

    // Only open voting if the game has a result
    if (hasResult) {
        await prisma.voting_sessions.updateMany({
            where: { league_id: league.id, is_open: true },
            data: { is_open: false, closed_at: new Date() },
        });
        await prisma.voting_sessions.create({
            data: { game_id: game.id, league_id: league.id, is_open: true },
        });
    }

    revalidatePath(`/dashboard/${leagueSlug}`);
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
    redirect(`/dashboard/${leagueSlug}/games/${game.id}`);
}

export async function deleteGame(leagueSlug: string, game: Game) {
    const session = await auth();
    if (!session?.user) throw new Error('Not authorized');

    // Only revert player stats if the game had a result
    if (game.brancos_score != null && game.pretos_score != null) {
        const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(game);
        const absGoalDifference = Math.abs(game.goal_difference ?? 0);

        if (isDraw) {
            await Promise.all([
                batchUpdatePlayers(winningTeam, { games: -1, draws: -1, points: -2, goalsDiff: 0 }),
                batchUpdatePlayers(losingTeam, { games: -1, draws: -1, points: -2, goalsDiff: 0 })
            ]);
        } else {
            await Promise.all([
                batchUpdatePlayers(winningTeam, { games: -1, wins: -1, points: -3, goalsDiff: -absGoalDifference }),
                batchUpdatePlayers(losingTeam, { games: -1, losses: -1, points: -1, goalsDiff: absGoalDifference })
            ]);
        }
    }

    await prisma.tournament_mocamfe.updateMany({
        where: { game_id: game.id },
        data: { game_id: null, winner_id: null }
    });

    // Clean up voting data for this game
    await prisma.game_votes.deleteMany({ where: { game_id: game.id } });
    await prisma.voting_sessions.deleteMany({ where: { game_id: game.id } });

    await prisma.games.delete({ where: { id: game.id } });
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
    redirect(`/dashboard/${leagueSlug}/games`);
}

export async function updateGame(leagueSlug: string, game: Game, formData: FormData) {
    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');

    // Revert old stats if the game had a result
    if (game.brancos_score != null && game.pretos_score != null) {
        const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(game);
        const absGoalDifference = Math.abs(game.goal_difference ?? 0);

        if (isDraw) {
            await Promise.all([
                batchUpdatePlayers(winningTeam, { games: -1, draws: -1, points: -2, goalsDiff: 0 }),
                batchUpdatePlayers(losingTeam, { games: -1, draws: -1, points: -2, goalsDiff: 0 })
            ]);
        } else {
            await Promise.all([
                batchUpdatePlayers(winningTeam, { games: -1, wins: -1, points: -3, goalsDiff: -absGoalDifference }),
                batchUpdatePlayers(losingTeam, { games: -1, losses: -1, points: -1, goalsDiff: absGoalDifference })
            ]);
        }
    }

    const noResult = formData.get('no-result') === '1';
    const bScore = noResult ? null : Number(formData.get('brancos-score'));
    const pScore = noResult ? null : Number(formData.get('pretos-score'));

    const rawFormData = {
        date: formData.get('date'),
        brancos_score: bScore,
        pretos_score: pScore,
        goal_difference: bScore != null && pScore != null ? bScore - pScore : null,
        brancos_captain: formData.get('captain-brancos'),
        brancos_players: formData.getAll('players-brancos[]'),
        pretos_captain: formData.get('captain-pretos'),
        pretos_players: formData.getAll('players-pretos[]'),
        tournament_match_id: formData.get('tournament-match-id') ? Number(formData.get('tournament-match-id')) : undefined
    };
    const parsedFormData = gameSchema.safeParse(rawFormData);

    if (!parsedFormData.success) {
        console.log(parsedFormData.error.flatten().fieldErrors);
        return;
    }

    const hasNewResult = parsedFormData.data.brancos_score != null && parsedFormData.data.pretos_score != null;

    if (hasNewResult) {
        const { winningTeam: winningTeamUpdated, losingTeam: losingTeamUpdated, isDraw: isDrawUpdated } = getWinningAndLosingTeams(parsedFormData.data as Game);
        const absGoalDifferenceUpdated = Math.abs(parsedFormData.data.goal_difference ?? 0);

        if (isDrawUpdated) {
            await Promise.all([
                batchUpdatePlayers(winningTeamUpdated, { games: 1, draws: 1, points: 2, goalsDiff: 0 }),
                batchUpdatePlayers(losingTeamUpdated, { games: 1, draws: 1, points: 2, goalsDiff: 0 })
            ]);
        } else {
            await Promise.all([
                batchUpdatePlayers(winningTeamUpdated, { games: 1, wins: 1, points: 3, goalsDiff: absGoalDifferenceUpdated }),
                batchUpdatePlayers(losingTeamUpdated, { games: 1, losses: 1, points: 1, goalsDiff: -absGoalDifferenceUpdated })
            ]);
        }
    }

    const updatedGame = await prisma.games.update({
        where: { id: game.id },
        data: parsedFormData.data
    });

    if (updatedGame.id && hasNewResult) {
        await updateMatchFromGame(updatedGame.id, league.current_season, league.id);
    }

    revalidatePath(`/dashboard/${leagueSlug}/games`);
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
    redirect(`/dashboard/${leagueSlug}/games/${game.id}`);
}

// Season management
export async function startNewSeason(leagueSlug: string) {
    const session = await auth();
    if (!session?.user) throw new Error('Not authorized');

    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');

    const currentPlayers = await prisma.players.findMany({
        where: { season: league.current_season, league_id: league.id }
    });

    const newSeason = league.current_season + 1;

    await prisma.players.createMany({
        data: currentPlayers.map(p => ({
            name: p.name,
            season: newSeason,
            league_id: league.id,
            points: 0, games: 0, wins: 0, losses: 0, draws: 0, goals_diff: 0
        }))
    });

    await prisma.leagues.update({
        where: { slug: leagueSlug },
        data: { current_season: newSeason }
    });

    revalidatePath(`/dashboard/${leagueSlug}`);
    redirect(`/dashboard/${leagueSlug}`);
}

// Force a match result (admin picks winner manually)
export async function forceMatchResult(matchId: number, winnerId: bigint, reason: string) {
    const session = await auth();
    if (!session?.user) throw new Error('Not authorized');

    const match = await prisma.tournament_mocamfe.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');
    if (match.winner_id) throw new Error('Match already has a winner');

    await prisma.tournament_mocamfe.update({
        where: { id: matchId },
        data: { winner_id: winnerId, walkover: true, walkover_reason: reason }
    });

    // Advance winner to next round
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const existingNext = await prisma.tournament_mocamfe.findFirst({
        where: { season: match.season, league_id: match.league_id, round: nextRound, position: nextPosition }
    });
    if (!existingNext) {
        await prisma.tournament_mocamfe.create({
            data: { season: match.season, league_id: match.league_id, round: nextRound, position: nextPosition, player_id: winnerId, opponent_id: null, winner_id: null, game_id: null }
        });
    } else if (!existingNext.opponent_id) {
        await prisma.tournament_mocamfe.update({ where: { id: existingNext.id }, data: { opponent_id: winnerId } });
    }

    revalidatePath('/dashboard');
}

// Cup admin actions
export async function confirmWalkover(matchId: number, eliminatedPlayerId: bigint, reason?: string) {
    const session = await auth();
    if (!session?.user) throw new Error('Not authorized');

    const match = await prisma.tournament_mocamfe.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Match not found');

    const winnerId = match.player_id === eliminatedPlayerId ? match.opponent_id : match.player_id;

    await prisma.tournament_mocamfe.update({
        where: { id: matchId },
        data: { winner_id: winnerId, walkover: true, walkover_reason: reason ?? 'Ausencia' }
    });

    if (winnerId) {
        const nextRound = match.round + 1;
        const nextPosition = Math.ceil(match.position / 2);
        const existingNext = await prisma.tournament_mocamfe.findFirst({
            where: { season: match.season, league_id: match.league_id, round: nextRound, position: nextPosition }
        });
        if (!existingNext) {
            await prisma.tournament_mocamfe.create({
                data: { season: match.season, league_id: match.league_id, round: nextRound, position: nextPosition, player_id: winnerId, opponent_id: null, winner_id: null, game_id: null }
            });
        } else if (!existingNext.opponent_id) {
            await prisma.tournament_mocamfe.update({ where: { id: existingNext.id }, data: { opponent_id: winnerId } });
        }
    }

    revalidatePath('/dashboard');
}

export async function grantAbsenceExemption(matchId: number, playerId: bigint, reason: string) {
    const session = await auth();
    if (!session?.user) throw new Error('Not authorized');

    await prisma.cup_absence_exemptions.create({
        data: { match_id: matchId, player_id: playerId, reason, granted_by: BigInt(1) }
    });

    revalidatePath('/dashboard');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// MVP Voting
// ---------------------------------------------------------------------------

const voteSchema = z.object({
    gameId: z.number(),
    voterName: z.string().min(1),
    bestPlayer: z.string().min(1),
    disruptor: z.string().min(1),
    wall: z.string().min(1),
    bestGoal: z.string().nullable(),
});

export async function submitVote(data: {
    gameId: number;
    voterName: string;
    bestPlayer: string;
    disruptor: string;
    wall: string;
    bestGoal: string | null;
}): Promise<{ success: boolean; error?: string }> {
    const parsed = voteSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: 'Dados inválidos.' };

    const { gameId, voterName, bestPlayer, disruptor, wall, bestGoal } = parsed.data;

    // Check voting session is open
    const session = await prisma.voting_sessions.findUnique({ where: { game_id: gameId } });
    if (!session || !session.is_open) return { success: false, error: 'A votação para este jogo está fechada.' };

    // Check voter hasn't already voted
    const existing = await prisma.game_votes.findUnique({
        where: { game_id_voter_name: { game_id: gameId, voter_name: voterName } },
    });
    if (existing) return { success: false, error: 'Já votaste neste jogo.' };

    // Verify voter can't vote for themselves
    if (voterName === bestPlayer || voterName === disruptor || voterName === wall || voterName === bestGoal) {
        return { success: false, error: 'Não podes votar em ti próprio.' };
    }

    await prisma.game_votes.create({
        data: { game_id: gameId, voter_name: voterName, best_player: bestPlayer, disruptor, wall, best_goal: bestGoal, has_paid: false },
    });

    return { success: true };
}

export async function markPaid(gameId: number, voterName: string): Promise<{ success: boolean; error?: string }> {
    const existing = await prisma.game_votes.findUnique({
        where: { game_id_voter_name: { game_id: gameId, voter_name: voterName } },
    });
    if (!existing) return { success: false, error: 'Voto não encontrado.' };

    await prisma.game_votes.update({
        where: { game_id_voter_name: { game_id: gameId, voter_name: voterName } },
        data: { has_paid: true },
    });

    return { success: true };
}

export async function closeVoting(gameId: number) {
    const authSession = await auth();
    if (!authSession?.user) throw new Error('Not authorized');

    await prisma.voting_sessions.update({
        where: { game_id: gameId },
        data: { is_open: false, closed_at: new Date() },
    });

    revalidatePath('/dashboard');
}

export async function openVoting(gameId: number, leagueId: number) {
    const authSession = await auth();
    if (!authSession?.user) throw new Error('Not authorized');

    const existing = await prisma.voting_sessions.findUnique({ where: { game_id: gameId } });
    if (existing) {
        await prisma.voting_sessions.update({
            where: { game_id: gameId },
            data: { is_open: true, closed_at: null },
        });
    } else {
        await prisma.voting_sessions.create({
            data: { game_id: gameId, league_id: leagueId, is_open: true },
        });
    }

    revalidatePath('/dashboard');
}

export async function addResultToGame(leagueSlug: string, gameId: number, brancosScore: number, pretosScore: number) {
    const authSession = await auth();
    if (!authSession?.user) throw new Error('Not authorized');

    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');

    const game = await prisma.games.findUnique({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');
    if (game.brancos_score != null) throw new Error('Game already has a result');

    const goalDifference = brancosScore - pretosScore;
    const updatedGame = { ...game, brancos_score: brancosScore, pretos_score: pretosScore, goal_difference: goalDifference } as Game;

    const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(updatedGame);
    const absGoalDifference = Math.abs(goalDifference);

    if (isDraw) {
        await Promise.all([
            batchUpdatePlayers(winningTeam, { draws: 1, points: 2, goalsDiff: 0 }),
            batchUpdatePlayers(losingTeam, { draws: 1, points: 2, goalsDiff: 0 })
        ]);
    } else {
        await Promise.all([
            batchUpdatePlayers(winningTeam, { wins: 1, points: 3, goalsDiff: absGoalDifference }),
            batchUpdatePlayers(losingTeam, { losses: 1, points: 1, goalsDiff: -absGoalDifference })
        ]);
    }

    await prisma.games.update({
        where: { id: gameId },
        data: { brancos_score: brancosScore, pretos_score: pretosScore, goal_difference: goalDifference }
    });

    await updateMatchFromGame(gameId, league.current_season, league.id);

    // Now that we have a result, close any open voting and open for this game
    await prisma.voting_sessions.updateMany({
        where: { league_id: league.id, is_open: true },
        data: { is_open: false, closed_at: new Date() },
    });
    await prisma.voting_sessions.create({
        data: { game_id: gameId, league_id: league.id, is_open: true },
    });

    revalidatePath(`/dashboard/${leagueSlug}`);
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
}
