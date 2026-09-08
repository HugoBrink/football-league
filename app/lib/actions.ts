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
    brancos_score: z.coerce.number(),
    pretos_score: z.coerce.number(),
    goal_difference: z.number(),
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

export async function deletePlayer(id: string) {
    return prisma.players.delete({ where: { id: BigInt(id) } });
}

export async function createGame(leagueSlug: string, formData: FormData): Promise<void> {
    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');

    const rawFormData = {
        date: formData.get('date'),
        brancos_score: formData.get('brancos-score'),
        pretos_score: formData.get('pretos-score'),
        goal_difference: Number(formData.get('brancos-score')) - Number(formData.get('pretos-score')),
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

    const { goal_difference } = parsedFormData.data;
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

    const game = await prisma.games.create({
        data: { ...parsedFormData.data, season: league.current_season, league_id: league.id }
    });

    if (game.id) {
        await updateMatchFromGame(game.id, league.current_season, league.id);
    }

    revalidatePath(`/dashboard/${leagueSlug}`);
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
    redirect(`/dashboard/${leagueSlug}/games`);
}

export async function deleteGame(leagueSlug: string, game: Game) {
    const session = await auth();
    if (!session?.user) throw new Error('Not authorized');

    const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(game);
    const absGoalDifference = Math.abs(game.goal_difference);

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

    await prisma.tournament_mocamfe.updateMany({
        where: { game_id: game.id },
        data: { game_id: null, winner_id: null }
    });

    await prisma.games.delete({ where: { id: game.id } });
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
    redirect(`/dashboard/${leagueSlug}/games`);
}

export async function updateGame(leagueSlug: string, game: Game, formData: FormData) {
    const league = await prisma.leagues.findUnique({ where: { slug: leagueSlug } });
    if (!league) throw new Error('League not found');

    const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(game);
    const absGoalDifference = Math.abs(game.goal_difference);

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

    const rawFormData = {
        date: formData.get('date'),
        brancos_score: formData.get('brancos-score'),
        pretos_score: formData.get('pretos-score'),
        goal_difference: Number(formData.get('brancos-score')) - Number(formData.get('pretos-score')),
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

    const { winningTeam: winningTeamUpdated, losingTeam: losingTeamUpdated, isDraw: isDrawUpdated } = getWinningAndLosingTeams(parsedFormData.data as Game);
    const absGoalDifferenceUpdated = Math.abs(parsedFormData.data.goal_difference);

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

    const updatedGame = await prisma.games.update({
        where: { id: game.id },
        data: parsedFormData.data
    });

    if (updatedGame.id) {
        await updateMatchFromGame(updatedGame.id, league.current_season, league.id);
    }

    revalidatePath(`/dashboard/${leagueSlug}/games`);
    revalidatePath(`/dashboard/${leagueSlug}/tournament`);
    redirect(`/dashboard/${leagueSlug}/games`);
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
