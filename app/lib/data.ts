import prisma from "./client";

export const DEFAULT_SEASON = 3;

// League helpers
export async function getLeagueBySlug(slug: string) {
    return prisma.leagues.findUnique({ where: { slug } });
}

export async function getAllLeagues() {
    return prisma.leagues.findMany({ orderBy: { id: 'asc' } });
}

export async function getLeagueSeasons(leagueId: number) {
    const seasons = await prisma.games.findMany({
        where: { league_id: leagueId },
        select: { season: true },
        distinct: ['season'],
        orderBy: { season: 'desc' }
    });
    return seasons.map(s => s.season);
}

// Fetch players from other leagues that don't exist yet in this league's current season
export async function fetchImportablePlayers(season: number, leagueId: number) {
    const currentNames = await prisma.players.findMany({
        where: { season, league_id: leagueId },
        select: { name: true }
    });
    const currentNameSet = new Set(currentNames.map(p => p.name));

    const otherPlayers = await prisma.players.findMany({
        where: { league_id: { not: leagueId } },
        select: { name: true, league_id: true },
        distinct: ['name', 'league_id'],
        orderBy: { name: 'asc' }
    });

    const leagues = await prisma.leagues.findMany();
    const leagueMap = new Map(leagues.map(l => [l.id, l.name]));

    const importable = otherPlayers
        .filter(p => !currentNameSet.has(p.name))
        .map(p => ({ name: p.name, fromLeague: leagueMap.get(p.league_id) ?? 'Desconhecida' }));

    // Deduplicate by name (player might exist in multiple seasons of same league)
    const seen = new Set<string>();
    return importable.filter(p => {
        if (seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
    });
}

// Player data
export async function fetchPlayers(season: number, leagueId: number) {
    return prisma.players.findMany({
        where: { season, league_id: leagueId },
        orderBy: [{ points: 'desc' }, { goals_diff: 'desc' }]
    });
}

export async function fetchPlayersNames(season: number, leagueId: number) {
    const players = await prisma.players.findMany({
        where: { season, league_id: leagueId },
        orderBy: { points: 'desc' }
    });
    return players.map(p => ({ id: p.id, name: p.name }));
}

export async function getPlayerById(id: string) {
    return prisma.players.findUnique({ where: { id: BigInt(id) } });
}

// Game data
export async function fetchGames(season: number, leagueId: number) {
    return prisma.games.findMany({
        where: { season, league_id: leagueId },
        orderBy: { date: 'desc' }
    });
}

export async function fetchGame(id: string) {
    const game = await prisma.games.findUnique({ where: { id: Number(id) } });
    if (game) {
        return { ...game, brancos_players: game.brancos_players as any, pretos_players: game.pretos_players as any };
    }
    return null;
}

// Stats helpers
export async function fetchTopPlayersByWins(limit: number = 5, season: number, leagueId: number) {
    return prisma.players.findMany({
        where: { season, league_id: leagueId },
        orderBy: [{ wins: 'desc' }, { points: 'desc' }, { goals_diff: 'desc' }],
        take: limit
    });
}

export async function fetchTopPlayersByGoalsDiff(limit: number = 5, season: number, leagueId: number) {
    return prisma.players.findMany({
        where: { season, league_id: leagueId, games: { gte: 5 } },
        orderBy: [{ goals_diff: 'desc' }, { points: 'desc' }, { wins: 'desc' }],
        take: limit
    });
}

export async function fetchTopPlayersByPoints(limit: number = 5, season: number, leagueId: number) {
    return prisma.players.findMany({
        where: { season, league_id: leagueId, points: { gt: 0 } },
        orderBy: [{ points: 'desc' }, { wins: 'desc' }, { goals_diff: 'desc' }],
        take: limit
    });
}

// Global standings (cross-league)
export async function fetchGlobalStandings(season: number) {
    const allPlayers = await prisma.players.findMany({
        where: { season },
        orderBy: [{ points: 'desc' }, { goals_diff: 'desc' }]
    });

    const leagues = await prisma.leagues.findMany();
    const leagueMap = new Map(leagues.map(l => [l.id, l.slug]));

    type AggregatedPlayer = {
        name: string;
        points: number;
        games: number;
        wins: number;
        losses: number;
        draws: number;
        goals_diff: number;
        leagues: string[];
    };

    const aggregated = new Map<string, AggregatedPlayer>();
    for (const p of allPlayers) {
        const leagueSlug = leagueMap.get(p.league_id) ?? 'unknown';
        const existing = aggregated.get(p.name);
        if (existing) {
            existing.points += p.points ?? 0;
            existing.games += p.games ?? 0;
            existing.wins += p.wins ?? 0;
            existing.losses += p.losses ?? 0;
            existing.draws += p.draws ?? 0;
            existing.goals_diff += p.goals_diff ?? 0;
            if (!existing.leagues.includes(leagueSlug)) existing.leagues.push(leagueSlug);
        } else {
            aggregated.set(p.name, {
                name: p.name,
                points: p.points ?? 0,
                games: p.games ?? 0,
                wins: p.wins ?? 0,
                losses: p.losses ?? 0,
                draws: p.draws ?? 0,
                goals_diff: p.goals_diff ?? 0,
                leagues: [leagueSlug],
            });
        }
    }
    return [...aggregated.values()].sort((a, b) => b.points - a.points || b.goals_diff - a.goals_diff);
}

// Streak computations
export async function computeLongestUnbeatenStreak(season: number, leagueId: number) {
    const games = await prisma.games.findMany({
        where: { season, league_id: leagueId },
        orderBy: { date: 'asc' }
    });

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
        const brancosCaptain = game.brancos_captain != null ? String(game.brancos_captain) : null;
        const pretosCaptain = game.pretos_captain != null ? String(game.pretos_captain) : null;
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
            if (!didLose) {
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

    const players = await prisma.players.findMany({ where: { season, league_id: leagueId } });
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

export async function computeLongestLosingStreak(season: number, leagueId: number) {
    const games = await prisma.games.findMany({
        where: { season, league_id: leagueId },
        orderBy: { date: 'asc' }
    });

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
        const brancosCaptain = game.brancos_captain != null ? String(game.brancos_captain) : null;
        const pretosCaptain = game.pretos_captain != null ? String(game.pretos_captain) : null;
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

    const players = await prisma.players.findMany({ where: { season, league_id: leagueId } });
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

// Season stats computation
export async function computeSeasonStats(season: number, leagueId: number) {
    const [players, games] = await Promise.all([
        prisma.players.findMany({ where: { season, league_id: leagueId } }),
        prisma.games.findMany({ where: { season, league_id: leagueId }, orderBy: { date: 'asc' } })
    ]);

    type PerPlayer = {
        id: string;
        name: string;
        gamesPlayed: number;
        wins: number;
        losses: number;
        draws: number;
        points: number;
        goalsDiff: number;
        appearancesSorted: Date[];
        last5Points: number;
        clutchWins: number;
        blowoutWins: number;
        blowoutLosses: number;
        longestConsecAppearances: number;
        consistencyStdDev: number | null;
        captainWins: number;
        captainGames: number;
    };

    const perPlayer = new Map<string, PerPlayer>();

    for (const p of players) {
        perPlayer.set(String(p.id), {
            id: String(p.id),
            name: p.name,
            gamesPlayed: 0,
            wins: p.wins ?? 0,
            losses: p.losses ?? 0,
            draws: p.draws ?? 0,
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

    type Appearance = { gameId: number; playerId: string; date: Date; points: number; teamGoalDiff: number; won: boolean; lost: boolean; drew: boolean; wasCaptain: boolean };
    const appearancesByPlayer: Record<string, Appearance[]> = {};
    const captainCounts = new Map<string, number>();

    for (const game of games) {
        const date = game.date as unknown as Date;
        const brancosPlayersRaw: string[] = (game.brancos_players as any[])?.map(String) ?? [];
        const pretosPlayersRaw: string[] = (game.pretos_players as any[])?.map(String) ?? [];
        const isDraw = game.brancos_score === game.pretos_score;
        const brancosWon = game.brancos_score > game.pretos_score;
        const pretosWon = game.pretos_score > game.brancos_score;
        const goalDiffAbs = Math.abs(game.goal_difference);
        const captainBrancos = game.brancos_captain != null ? String(game.brancos_captain) : null;
        const captainPretos = game.pretos_captain != null ? String(game.pretos_captain) : null;

        if (captainBrancos) captainCounts.set(captainBrancos, (captainCounts.get(captainBrancos) ?? 0) + 1);
        if (captainPretos) captainCounts.set(captainPretos, (captainCounts.get(captainPretos) ?? 0) + 1);

        const brancosSet = new Set<string>(brancosPlayersRaw);
        const pretosSet = new Set<string>(pretosPlayersRaw);
        if (captainBrancos) brancosSet.add(captainBrancos);
        if (captainPretos) pretosSet.add(captainPretos);

        const push = (pid: string, won: boolean, lost: boolean, drew: boolean, teamGD: number, wasCaptain: boolean) => {
            const pts = drew ? 2 : (won ? 3 : 1);
            const arr = appearancesByPlayer[pid] ?? (appearancesByPlayer[pid] = []);
            arr.push({ gameId: game.id as number, playerId: pid, date, points: pts, teamGoalDiff: teamGD, won, lost, drew, wasCaptain });
        };

        for (const pid of brancosSet) {
            push(pid, brancosWon, !brancosWon && !isDraw, isDraw, game.goal_difference, captainBrancos === pid);
        }
        for (const pid of pretosSet) {
            push(pid, pretosWon, !pretosWon && !isDraw, isDraw, -game.goal_difference, captainPretos === pid);
        }

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

    const lastFiveGameIds = new Set(games.slice(-5).map(g => g.id as number));

    for (const [pid, list] of Object.entries(appearancesByPlayer)) {
        list.sort((a, b) => a.date.getTime() - b.date.getTime());
        const pp = perPlayer.get(pid);
        if (!pp) continue;
        pp.gamesPlayed = list.length;
        pp.appearancesSorted = list.map(a => a.date);
        pp.last5Points = list.reduce((s, a) => s + (lastFiveGameIds.has(a.gameId) ? a.points : 0), 0);
        pp.captainGames = captainCounts.get(pid) ?? list.filter(a => a.wasCaptain).length;
        pp.captainWins = list.filter(a => a.wasCaptain && a.won).length;
        if (list.length > 0) {
            const mean = list.reduce((s, a) => s + a.teamGoalDiff, 0) / list.length;
            const variance = list.reduce((s, a) => s + Math.pow(a.teamGoalDiff - mean, 2), 0) / list.length;
            pp.consistencyStdDev = Math.sqrt(variance);
        }

        let best = 0; let cur = 0;
        for (let i = 0; i < list.length; i++) {
            cur += 1; best = Math.max(best, cur);
        }
        pp.longestConsecAppearances = best;
    }

    const entries = Array.from(perPlayer.values());

    const byWinRate = entries
        .filter(e => e.gamesPlayed >= 5)
        .map(e => ({ name: e.name, id: e.id, winRate: e.gamesPlayed > 0 ? e.wins / e.gamesPlayed : 0 }))
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
        byWinRate, byAvgGD, byGamesPlayed, byFormLast5, byConsistency,
        byCaptainWinRate, byCaptainGames, byClutchWins, byBlowoutWins, byBlowoutLosses, byWorstGD,
    } as const;
}
