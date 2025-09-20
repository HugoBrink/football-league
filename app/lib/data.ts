import prisma from "./client";

export const CURRENT_SEASON = 2;

// Pure data access functions
export async function fetchPlayers(season: number = CURRENT_SEASON) {
    const all = await prisma.players.findMany({
        orderBy: [
            { points: 'desc' },
            { goals_diff: 'desc' }
        ]
    });
    return all.filter(p => (p as any).season === season);
}

export async function fetchPlayersNames(season: number = CURRENT_SEASON) {
    const all = await prisma.players.findMany({
        orderBy: { points: 'desc' }
    });
    return all
        .filter(p => (p as any).season === season)
        .map(p => ({ id: (p as any).id, name: (p as any).name } as any));
}

export async function getPlayerById(id: string) {
    return await prisma.players.findUnique({
        where: { id: BigInt(id) }
    });
}

export async function fetchGames(season: number = CURRENT_SEASON) {
    const all = await prisma.games.findMany({ orderBy: { date: 'desc' } });
    return all.filter(g => (g as any).season === season);
}

export async function fetchGame(id: string) {
    const game = await prisma.games.findUnique({
        where: { id: Number(id) }
    });
    if (game) {
        return { ...game, brancos_players: game.brancos_players as any, pretos_players: game.pretos_players as any }
    }
    return null
}

// Stats helpers
export async function fetchTopPlayersByWins(limit: number = 5, season: number = CURRENT_SEASON) {
    const all = await prisma.players.findMany({
        orderBy: [
            { wins: 'desc' },
            { points: 'desc' },
            { goals_diff: 'desc' }
        ]
    });
    return all.filter(p => (p as any).season === season).slice(0, limit);
}
export async function fetchTopPlayersByGoalsDiff(
  limit: number = 5,
  season: number = CURRENT_SEASON
) {
  const all = await prisma.players.findMany({
    where: {
      season: season,
      games: { gte: 5 }, // só jogadores com >= 5 jogos
    },
    orderBy: [
      { goals_diff: 'desc' },
      { points: 'desc' },
      { wins: 'desc' },
    ],
    take: limit, // já corta no SQL
  });

  return all;
}

export async function fetchTopPlayersByPoints(limit: number = 5, season: number = CURRENT_SEASON) {
    const all = await prisma.players.findMany({
        orderBy: [
            { points: 'desc' },
            { wins: 'desc' },
            { goals_diff: 'desc' }
        ]
    });
    return all
        .filter(p => (p as any).season === season)
        .filter(p => (p.points ?? 0) > 0)
        .slice(0, limit);
}

// Compute longest unbeaten streak per player for a season
// Unbeaten streak = consecutive games without a loss (win or draw). In this dataset there are no explicit draws,
// but losing team gets 1 point. We'll treat winners (3 pts) as win, losers (1 pt) as loss.
// We infer participation from games.brancos_players and games.pretos_players (arrays of player ids as strings).
export async function computeLongestUnbeatenStreak(season: number = CURRENT_SEASON) {
    const gamesAll = await prisma.games.findMany({ orderBy: { date: 'asc' } });
    const games = gamesAll.filter(g => (g as any).season === season);

    type StreakInfo = {
        current: number;
        best: number;
        currentStart: Date | null;
        currentEnd: Date | null;
        bestStart: Date | null;
        bestEnd: Date | null;
    };
    const streaks = new Map<string, StreakInfo>(); // key: playerId string

    for (const game of games) {
        const brancosPlayersBase: string[] = (game.brancos_players as any[])?.map(String) ?? [];
        const pretosPlayersBase: string[] = (game.pretos_players as any[])?.map(String) ?? [];
        const brancosCaptain = (game as any).brancos_captain != null ? String((game as any).brancos_captain) : null;
        const pretosCaptain = (game as any).pretos_captain != null ? String((game as any).pretos_captain) : null;
        const brancosPlayers = new Set<string>(brancosPlayersBase);
        const pretosPlayers = new Set<string>(pretosPlayersBase);
        if (brancosCaptain) brancosPlayers.add(brancosCaptain);
        if (pretosCaptain) pretosPlayers.add(pretosCaptain);

        // Resolve any accidental overlaps deterministically
        for (const pid of Array.from(brancosPlayers)) {
            if (pretosPlayers.has(pid)) {
                const inBrancosArray = brancosPlayersBase.includes(pid);
                const inPretosArray = pretosPlayersBase.includes(pid);
                if (inBrancosArray && !inPretosArray) {
                    pretosPlayers.delete(pid);
                } else if (!inBrancosArray && inPretosArray) {
                    brancosPlayers.delete(pid);
                } else if (brancosCaptain === pid && pretosCaptain !== pid) {
                    pretosPlayers.delete(pid);
                } else if (pretosCaptain === pid && brancosCaptain !== pid) {
                    brancosPlayers.delete(pid);
                } else {
                    pretosPlayers.delete(pid);
                }
            }
        }
        const brancosWon = game.brancos_score > game.pretos_score;
        const pretosWon = game.pretos_score > game.brancos_score;

        const applyResult = (pid: string, didWin: boolean) => {
            const info = streaks.get(pid) ?? { current: 0, best: 0, currentStart: null, currentEnd: null, bestStart: null, bestEnd: null };
            if (didWin) {
                if (info.current === 0) info.currentStart = game.date as unknown as Date;
                info.current += 1;
                info.currentEnd = game.date as unknown as Date;
            } else {
                if (info.current > info.best) {
                    info.best = info.current;
                    info.bestStart = info.currentStart;
                    info.bestEnd = info.currentEnd;
                }
                info.current = 0;
                info.currentStart = null;
                info.currentEnd = null;
            }
            if (info.current > info.best) {
                info.best = info.current;
                info.bestStart = info.currentStart;
                info.bestEnd = info.currentEnd;
            }
            streaks.set(pid, info);
        };

        for (const pid of brancosPlayers) applyResult(pid, brancosWon);
        for (const pid of pretosPlayers) applyResult(pid, pretosWon);
    }

    // Join with player names
    const players = (await prisma.players.findMany()).filter(p => (p as any).season === season);
    const withNames = players.map(p => ({
        id: String(p.id),
        name: p.name,
        bestStreak: streaks.get(String(p.id))?.best ?? 0,
        startDate: streaks.get(String(p.id))?.bestStart ?? null,
        endDate: streaks.get(String(p.id))?.bestEnd ?? null,
    }));

    withNames.sort((a, b) => b.bestStreak - a.bestStreak || a.name.localeCompare(b.name));
    return withNames;
}

// Compute longest losing streak per player for a season
export async function computeLongestLosingStreak(season: number = CURRENT_SEASON) {
    const gamesAll = await prisma.games.findMany({ orderBy: { date: 'asc' } });
    const games = gamesAll.filter(g => (g as any).season === season);

    type StreakInfo = {
        current: number;
        best: number;
        currentStart: Date | null;
        currentEnd: Date | null;
        bestStart: Date | null;
        bestEnd: Date | null;
    };
    const streaks = new Map<string, StreakInfo>();

    for (const game of games) {
        const brancosPlayersBase: string[] = (game.brancos_players as any[])?.map(String) ?? [];
        const pretosPlayersBase: string[] = (game.pretos_players as any[])?.map(String) ?? [];
        const brancosCaptain = (game as any).brancos_captain != null ? String((game as any).brancos_captain) : null;
        const pretosCaptain = (game as any).pretos_captain != null ? String((game as any).pretos_captain) : null;
        const brancosPlayers = new Set<string>(brancosPlayersBase);
        const pretosPlayers = new Set<string>(pretosPlayersBase);
        if (brancosCaptain) brancosPlayers.add(brancosCaptain);
        if (pretosCaptain) pretosPlayers.add(pretosCaptain);

        for (const pid of Array.from(brancosPlayers)) {
            if (pretosPlayers.has(pid)) {
                const inBrancosArray = brancosPlayersBase.includes(pid);
                const inPretosArray = pretosPlayersBase.includes(pid);
                if (inBrancosArray && !inPretosArray) {
                    pretosPlayers.delete(pid);
                } else if (!inBrancosArray && inPretosArray) {
                    brancosPlayers.delete(pid);
                } else if (brancosCaptain === pid && pretosCaptain !== pid) {
                    pretosPlayers.delete(pid);
                } else if (pretosCaptain === pid && brancosCaptain !== pid) {
                    brancosPlayers.delete(pid);
                } else {
                    pretosPlayers.delete(pid);
                }
            }
        }
        const brancosLost = game.brancos_score < game.pretos_score;
        const pretosLost = game.pretos_score < game.brancos_score;

        const applyResult = (pid: string, didLose: boolean) => {
            const info = streaks.get(pid) ?? { current: 0, best: 0, currentStart: null, currentEnd: null, bestStart: null, bestEnd: null };
            if (didLose) {
                if (info.current === 0) info.currentStart = game.date as unknown as Date;
                info.current += 1;
                info.currentEnd = game.date as unknown as Date;
            } else {
                if (info.current > info.best) {
                    info.best = info.current;
                    info.bestStart = info.currentStart;
                    info.bestEnd = info.currentEnd;
                }
                info.current = 0;
                info.currentStart = null;
                info.currentEnd = null;
            }
            if (info.current > info.best) {
                info.best = info.current;
                info.bestStart = info.currentStart;
                info.bestEnd = info.currentEnd;
            }
            streaks.set(pid, info);
        };

        for (const pid of brancosPlayers) applyResult(pid, brancosLost);
        for (const pid of pretosPlayers) applyResult(pid, pretosLost);
    }

    const players = (await prisma.players.findMany()).filter(p => (p as any).season === season);
    const withNames = players.map(p => ({
        id: String(p.id),
        name: p.name,
        bestStreak: streaks.get(String(p.id))?.best ?? 0,
        startDate: streaks.get(String(p.id))?.bestStart ?? null,
        endDate: streaks.get(String(p.id))?.bestEnd ?? null,
    }));

    withNames.sort((a, b) => b.bestStreak - a.bestStreak || a.name.localeCompare(b.name));
    return withNames;
}

// Compute multiple player-level metrics from games
export async function computeSeasonStats(season: number = CURRENT_SEASON) {
    const [players, gamesAll] = await Promise.all([
        prisma.players.findMany(),
        prisma.games.findMany({ orderBy: { date: 'asc' } })
    ]);
    const seasonPlayers = players.filter(p => (p as any).season === season);
    const games = gamesAll.filter(g => (g as any).season === season);

    // Aggregate totals across all seasons by player name (global career-like totals)
    const totalsByName = new Map<string, { wins: number; games: number }>();
    for (const p of players) {
        const t = totalsByName.get(p.name) ?? { wins: 0, games: 0 };
        t.wins += p.wins ?? 0;
        t.games += p.games ?? 0;
        totalsByName.set(p.name, t);
    }

    type PerPlayer = {
        id: string;
        name: string;
        gamesPlayed: number;
        wins: number;
        losses: number;
        points: number;
        goalsDiff: number;
        appearancesSorted: Date[];
        last5Points: number;
        clutchWins: number; // wins by 1 goal
        blowoutWins: number; // wins by >=3
        blowoutLosses: number; // losses by >=3
        longestConsecAppearances: number;
        consistencyStdDev: number | null; // stdev of team goal diff in games played
        captainWins: number;
        captainGames: number;
    };

    const perPlayer = new Map<string, PerPlayer>();

    for (const p of seasonPlayers) {
        perPlayer.set(String(p.id), {
            id: String(p.id),
            name: p.name,
            gamesPlayed: 0,
            wins: p.wins ?? 0,
            losses: p.losses ?? 0,
            points: p.points ?? 0,
            goalsDiff: p.goals_diff ?? 0,
            appearancesSorted: [],
            last5Points: 0,
            clutchWins: 0,
            blowoutWins: 0,
            blowoutLosses: 0,
            longestConsecAppearances: 0,
            consistencyStdDev: null,
            captainWins: 0,
            captainGames: 0,
        });
    }

    // Build per-game participation and outcomes
    type Appearance = { gameId: number; playerId: string; date: Date; points: number; teamGoalDiff: number; won: boolean; lost: boolean; wasCaptain: boolean };
    const appearancesByPlayer: Record<string, Appearance[]> = {};
    const captainCounts = new Map<string, number>();

    for (const game of games) {
        const date = game.date as unknown as Date;
        const brancosPlayersRaw: string[] = (game.brancos_players as any[])?.map(String) ?? [];
        const pretosPlayersRaw: string[] = (game.pretos_players as any[])?.map(String) ?? [];
        const brancosWon = game.brancos_score > game.pretos_score;
        const pretosWon = game.pretos_score > game.brancos_score;
        const goalDiffAbs = Math.abs(game.goal_difference);
        const captainBrancos = game.brancos_captain != null ? String(game.brancos_captain) : null;
        const captainPretos = game.pretos_captain != null ? String(game.pretos_captain) : null;

        if (captainBrancos) captainCounts.set(captainBrancos, (captainCounts.get(captainBrancos) ?? 0) + 1);
        if (captainPretos) captainCounts.set(captainPretos, (captainCounts.get(captainPretos) ?? 0) + 1);

        // Build unique rosters including captains
        const brancosSet = new Set<string>(brancosPlayersRaw);
        const pretosSet = new Set<string>(pretosPlayersRaw);
        if (captainBrancos) brancosSet.add(captainBrancos);
        if (captainPretos) pretosSet.add(captainPretos);

        // Helper to push appearance
        const push = (pid: string, won: boolean, lost: boolean, teamGD: number, wasCaptain: boolean) => {
            const pts = won ? 3 : 1; // dataset uses 3 for winners, 1 for losers
            const arr = appearancesByPlayer[pid] ?? (appearancesByPlayer[pid] = []);
            arr.push({ gameId: game.id as number, playerId: pid, date, points: pts, teamGoalDiff: teamGD, won, lost, wasCaptain });
        };

        for (const pid of brancosSet) {
            push(pid, brancosWon, !brancosWon, game.goal_difference, captainBrancos === pid);
        }
        for (const pid of pretosSet) {
            push(pid, pretosWon, !pretosWon, -game.goal_difference, captainPretos === pid);
        }

        // Mark clutch/blowout for winners/losers using sets (includes captain-only)
        if (goalDiffAbs === 1) {
            for (const pid of brancosWon ? brancosSet : pretosSet) {
                const pp = perPlayer.get(pid); if (pp) pp.clutchWins += 1;
            }
        }
        if (goalDiffAbs >= 3) {
            for (const pid of brancosWon ? brancosSet : pretosSet) {
                const pp = perPlayer.get(pid); if (pp) pp.blowoutWins += 1;
            }
            for (const pid of brancosWon ? pretosSet : brancosSet) {
                const pp = perPlayer.get(pid); if (pp) pp.blowoutLosses += 1;
            }
        }
    }

    // Determine last 5 games overall in this season
    const lastFiveGameIds = new Set(games.slice(-5).map(g => g.id as number));

    // Aggregate per player
    for (const [pid, list] of Object.entries(appearancesByPlayer)) {
        list.sort((a, b) => a.date.getTime() - b.date.getTime());
        const pp = perPlayer.get(pid);
        if (!pp) continue;
        pp.gamesPlayed = list.length;
        pp.appearancesSorted = list.map(a => a.date);
        // Sum points from the last 5 games overall, not last 5 appearances
        pp.last5Points = list.reduce((s, a) => s + (lastFiveGameIds.has(a.gameId) ? a.points : 0), 0);
        // Prefer authoritative count from games' captain fields (handles legacy data where captain might not be listed in players arrays)
        pp.captainGames = captainCounts.get(pid) ?? list.filter(a => a.wasCaptain).length;
        pp.captainWins = list.filter(a => a.wasCaptain && a.won).length;
        if (list.length > 0) {
            const mean = list.reduce((s, a) => s + a.teamGoalDiff, 0) / list.length;
            const variance = list.reduce((s, a) => s + Math.pow(a.teamGoalDiff - mean, 2), 0) / list.length;
            pp.consistencyStdDev = Math.sqrt(variance);
        }

        // Longest consecutive appearances (by date order; assumes unique game dates)
        let best = 0; let cur = 0;
        let prevTime: number | null = null;
        for (const a of list) {
            const t = a.date.getTime();
            if (prevTime == null) {
                cur = 1; best = Math.max(best, cur);
            } else {
                // if next appearance is next chronological game they played; since we don't have global round numbers,
                // we consider any subsequent game they appear in as consecutive within their personal sequence
                cur += 1; best = Math.max(best, cur);
            }
            prevTime = t;
        }
        pp.longestConsecAppearances = best;
    }

    // Prepare leaderboards
    const entries = Array.from(perPlayer.values());

    const byWinRate = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => {
            // Use only current season's data
            const winRate = e.gamesPlayed > 0 ? e.wins / e.gamesPlayed : 0;
            return { name: e.name, id: e.id, winRate };
        })
        .sort((a, b) => b.winRate - a.winRate);

    const byAvgGD = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, avgGD: e.goalsDiff / e.gamesPlayed }))
        .sort((a, b) => b.avgGD - a.avgGD);

    const byGamesPlayed = entries
        .map(e => ({ name: e.name, id: e.id, games: e.gamesPlayed }))
        .sort((a, b) => b.games - a.games);

    const byFormLast5 = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, last5: e.last5Points }))
        .sort((a, b) => b.last5 - a.last5);

    const byConsistency = entries
        .filter(e => e.consistencyStdDev != null && e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, std: e.consistencyStdDev as number }))
        .sort((a, b) => a.std - b.std);

    const byCaptainWinRate = entries
        .filter(e => e.captainGames >= 5)
        .map(e => ({ name: e.name, id: e.id, captainWinRate: e.captainWins / e.captainGames, captainGames: e.captainGames }))
        .sort((a, b) => b.captainWinRate - a.captainWinRate || b.captainGames - a.captainGames);

    const byCaptainGames = entries
        .map(e => ({ name: e.name, id: e.id, captainGames: e.captainGames }))
        .filter(e => e.captainGames > 0)
        .sort((a, b) => b.captainGames - a.captainGames);

    const byClutchWins = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, clutchWins: e.clutchWins }))
        .sort((a, b) => b.clutchWins - a.clutchWins);

    const byBlowoutWins = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, blowoutWins: e.blowoutWins }))
        .sort((a, b) => b.blowoutWins - a.blowoutWins);

    const byBlowoutLosses = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, blowoutLosses: e.blowoutLosses }))
        .sort((a, b) => b.blowoutLosses - a.blowoutLosses);

    const byWorstGD = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, goalsDiff: e.goalsDiff }))
        .sort((a, b) => a.goalsDiff - b.goalsDiff);

    return {
        byWinRate,
        byAvgGD,
        byGamesPlayed,
        byFormLast5,
        byConsistency,
        byCaptainWinRate,
        byCaptainGames,
        byClutchWins,
        byBlowoutWins,
        byBlowoutLosses,
        byWorstGD,
    } as const;
}
