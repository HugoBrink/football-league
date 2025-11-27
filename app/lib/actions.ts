'use server'

import { auth, signIn } from "@/auth";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWinningAndLosingTeams } from "../helpers/functions";
import prisma from "./client";
import { CURRENT_SEASON } from "./data";
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
    tournament_match_id: z.number().optional() // Optional tournament match ID
});

const CreateGame = gameSchema.omit({ numero: true });

async function batchUpdatePlayers(
    playerIds: string[],
    { games = 1, wins = 0, losses = 0, draws = 0, points = 0, goalsDiff = 0 }
) {
    const playerIdsBigInt = playerIds.map(id => BigInt(id));
    return prisma.players.updateMany({
        where: {
            id: { in: playerIdsBigInt }
        },
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

export async function createPlayer(formData: FormData) {
    const name = formData.get('name') as string;

    await prisma.players.create({ data: { name, season: CURRENT_SEASON } });

    redirect('/dashboard/players/create');
}


export async function deletePlayer(id: string) {
    return await prisma.players.delete({
        where: { id: BigInt(id) }
    });
}

export async function createGame(formData: FormData): Promise<void> {
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
        // In case of draw, both teams get 2 points and draws increment
        await Promise.all([
            batchUpdatePlayers(winningTeam, {
                draws: 1,
                points: 2,
                goalsDiff: 0
            }),
            batchUpdatePlayers(losingTeam, {
                draws: 1,
                points: 2,
                goalsDiff: 0
            })
        ]);
    } else {
        await Promise.all([
            batchUpdatePlayers(winningTeam, {
                wins: 1,
                points: 3,
                goalsDiff: absGoalDifference
            }),
            batchUpdatePlayers(losingTeam, {
                losses: 1,
                points: 1,
                goalsDiff: -absGoalDifference
            })
        ]);
    }

    const game = await prisma.games.create({
        data: { ...parsedFormData.data, season: CURRENT_SEASON }
    });

    // Always try to update tournament matches, even if not explicitly linked
    if (game.id) {
        await updateMatchFromGame(game.id);
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/tournament');
    redirect('/dashboard/games');
}


export async function deleteGame(game: Game) {
    const session = await auth();

    if (!session?.user) {
        throw new Error('Not authorized');
    }

    const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(game);
    const absGoalDifference = Math.abs(game.goal_difference);

    if (isDraw) {
        // Reverse draw: remove 2 points and decrement draws
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

    // Find and update any tournament matches that were using this game
    await prisma.tournament_mocamfe.updateMany({
        where: { game_id: game.id },
        data: {
            game_id: null,
            winner_id: null
        }
    });

    await prisma.games.delete({ where: { id: game.id } });
    revalidatePath('/dashboard/tournament');
    redirect('/dashboard/games');
}

export async function updateGame(game: Game, formData: FormData) {

    const { winningTeam, losingTeam, isDraw } = getWinningAndLosingTeams(game);
    const absGoalDifference = Math.abs(game.goal_difference);

    // Reverse the old game stats
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

    // Apply the new game stats
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

    // Always try to update tournament matches, even if not explicitly linked
    if (updatedGame.id) {
        await updateMatchFromGame(updatedGame.id);
    }

    revalidatePath('/dashboard/games');
    revalidatePath('/dashboard/tournament');
    redirect('/dashboard/games');
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
