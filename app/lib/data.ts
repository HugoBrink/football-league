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

export async function fetchPlayerAllSeasons(name: string, leagueId: number) {
    return prisma.players.findMany({
        where: { name, league_id: leagueId },
        orderBy: { season: 'asc' },
    });
}

export async function fetchPlayerMVPStats(playerName: string, leagueId: number) {
    const votes = await prisma.game_votes.findMany({
        where: {
            game_id: {
                in: (await prisma.games.findMany({
                    where: { league_id: leagueId },
                    select: { id: true },
                })).map(g => g.id),
            },
        },
    });

    let bestPlayer = 0, disruptor = 0, wall = 0, bestGoal = 0;
    for (const v of votes) {
        if (v.best_player === playerName) bestPlayer++;
        if (v.disruptor === playerName) disruptor++;
        if (v.wall === playerName) wall++;
        if (v.best_goal === playerName) bestGoal++;
    }

    return { bestPlayer, disruptor, wall, bestGoal, totalVotes: bestPlayer + disruptor + wall + bestGoal };
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

export async function fetchGameByNumero(numero: number) {
    const game = await prisma.games.findUnique({ where: { numero } });
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
        const brancosLost = (game.brancos_score ?? 0) < (game.pretos_score ?? 0);
        const pretosLost = (game.pretos_score ?? 0) < (game.brancos_score ?? 0);

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
        const brancosLost = (game.brancos_score ?? 0) < (game.pretos_score ?? 0);
        const pretosLost = (game.pretos_score ?? 0) < (game.brancos_score ?? 0);

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
        // Skip games without a result
        if (game.brancos_score == null || game.pretos_score == null) continue;

        const date = game.date as unknown as Date;
        const brancosPlayersRaw: string[] = (game.brancos_players as any[])?.map(String) ?? [];
        const pretosPlayersRaw: string[] = (game.pretos_players as any[])?.map(String) ?? [];
        const isDraw = game.brancos_score === game.pretos_score;
        const brancosWon = game.brancos_score > game.pretos_score;
        const pretosWon = game.pretos_score > game.brancos_score;
        const goalDiffAbs = Math.abs(game.goal_difference ?? 0);
        const gamGD = game.goal_difference ?? 0;
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
            push(pid, brancosWon, !brancosWon && !isDraw, isDraw, gamGD, captainBrancos === pid);
        }
        for (const pid of pretosSet) {
            push(pid, pretosWon, !pretosWon && !isDraw, isDraw, -gamGD, captainPretos === pid);
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

// ---------------------------------------------------------------------------
// Elo Rating System
// ---------------------------------------------------------------------------
// Processes ALL games across ALL seasons for a league chronologically.
// Cumulative — no resets between seasons.
// Each player starts at 1000. K-factor = 32.
// Team Elo = average Elo of its members. Expected score uses logistic formula.
// ---------------------------------------------------------------------------
const ELO_INITIAL = 1000;
const ELO_K = 32;

function expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

type EloHistoryPoint = { gameNum: number; elo: number; date: Date };

export type EloEntry = {
    id: string;
    name: string;
    elo: number;
    peak: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    history: EloHistoryPoint[];
};

// Shared helpers to extract player names from a game row
function resolveGameTeams(
    game: { brancos_players: any; pretos_players: any; brancos_captain: string | null; pretos_captain: string | null },
    resolveName: (pid: string) => string,
) {
    const brancosRaw: string[] = (game.brancos_players as any[])?.map(String) ?? [];
    const pretosRaw: string[] = (game.pretos_players as any[])?.map(String) ?? [];
    const captainB = game.brancos_captain != null ? String(game.brancos_captain) : null;
    const captainP = game.pretos_captain != null ? String(game.pretos_captain) : null;
    const brancosIds = new Set(brancosRaw);
    const pretosIds = new Set(pretosRaw);
    if (captainB) brancosIds.add(captainB);
    if (captainP) pretosIds.add(captainP);
    return {
        brancosNames: [...brancosIds].map(resolveName),
        pretosNames: [...pretosIds].map(resolveName),
        captainB,
        captainP,
    };
}

export async function computeEloRatings(leagueId: number, season?: number) {
    const allGames = await prisma.games.findMany({
        where: { league_id: leagueId, ...(season != null ? { season } : {}) },
        orderBy: [{ season: 'asc' }, { date: 'asc' }, { numero: 'asc' }],
    });

    const allPlayers = await prisma.players.findMany({
        where: { league_id: leagueId },
        select: { id: true, name: true, season: true },
    });

    const nameById = new Map<string, string>();
    for (const p of allPlayers) nameById.set(String(p.id), p.name);

    const idsByName = new Map<string, string[]>();
    for (const p of allPlayers) {
        const arr = idsByName.get(p.name) ?? [];
        arr.push(String(p.id));
        idsByName.set(p.name, arr);
    }

    const resolveName = (pid: string): string => nameById.get(pid) ?? pid;

    type EloState = { elo: number; peak: number; games: number; wins: number; losses: number; draws: number; history: EloHistoryPoint[] };
    const eloByName = new Map<string, EloState>();

    const getElo = (name: string) => {
        let entry = eloByName.get(name);
        if (!entry) {
            entry = { elo: ELO_INITIAL, peak: ELO_INITIAL, games: 0, wins: 0, losses: 0, draws: 0, history: [] };
            eloByName.set(name, entry);
        }
        return entry;
    };

    let gameNum = 0;
    for (const game of allGames) {
        // Skip games without a result
        if (game.brancos_score == null || game.pretos_score == null) continue;

        gameNum++;
        const date = game.date as unknown as Date;
        const { brancosNames, pretosNames } = resolveGameTeams(game, resolveName);

        if (brancosNames.length === 0 || pretosNames.length === 0) continue;

        const avgBrancos = brancosNames.reduce((s, n) => s + getElo(n).elo, 0) / brancosNames.length;
        const avgPretos = pretosNames.reduce((s, n) => s + getElo(n).elo, 0) / pretosNames.length;

        const expB = expectedScore(avgBrancos, avgPretos);
        const expP = 1 - expB;

        const isDraw = game.brancos_score === game.pretos_score;
        const brancosWon = game.brancos_score > game.pretos_score;
        const actualB = isDraw ? 0.5 : (brancosWon ? 1 : 0);
        const actualP = 1 - actualB;

        for (const name of brancosNames) {
            const entry = getElo(name);
            entry.elo += ELO_K * (actualB - expB);
            entry.games++;
            if (isDraw) entry.draws++;
            else if (brancosWon) entry.wins++;
            else entry.losses++;
            if (entry.elo > entry.peak) entry.peak = entry.elo;
            entry.history.push({ gameNum, elo: Math.round(entry.elo), date });
        }
        for (const name of pretosNames) {
            const entry = getElo(name);
            entry.elo += ELO_K * (actualP - expP);
            entry.games++;
            if (isDraw) entry.draws++;
            else if (!brancosWon) entry.wins++;
            else entry.losses++;
            if (entry.elo > entry.peak) entry.peak = entry.elo;
            entry.history.push({ gameNum, elo: Math.round(entry.elo), date });
        }
    }

    const results: EloEntry[] = [];
    for (const [name, entry] of eloByName) {
        const ids = idsByName.get(name) ?? [];
        results.push({
            id: ids.at(-1) ?? name,
            name,
            elo: Math.round(entry.elo),
            peak: Math.round(entry.peak),
            gamesPlayed: entry.games,
            wins: entry.wins,
            losses: entry.losses,
            draws: entry.draws,
            history: entry.history,
        });
    }

    results.sort((a, b) => b.elo - a.elo);
    return results;
}

// ---------------------------------------------------------------------------
// Elo snapshot for a specific game
// ---------------------------------------------------------------------------
// Processes all games in a league up to (and including) the target game
// with soft resets between seasons, then returns before/after Elo and delta.
// ---------------------------------------------------------------------------
export type PlayerEloSnapshot = {
    name: string;
    eloBefore: number;
    eloAfter: number;
    delta: number;
    isCaptain: boolean;
};

export type GameEloSnapshot = {
    brancos: PlayerEloSnapshot[];
    pretos: PlayerEloSnapshot[];
    brancosAvgBefore: number;
    pretosAvgBefore: number;
    brancosAvgAfter: number;
    pretosAvgAfter: number;
};

export async function computeEloSnapshotForGame(leagueId: number, gameId: number): Promise<GameEloSnapshot | null> {
    const allGames = await prisma.games.findMany({
        where: { league_id: leagueId },
        orderBy: [{ season: 'asc' }, { date: 'asc' }, { numero: 'asc' }],
    });

    const allPlayers = await prisma.players.findMany({
        where: { league_id: leagueId },
        select: { id: true, name: true },
    });

    const nameById = new Map<string, string>();
    for (const p of allPlayers) nameById.set(String(p.id), p.name);
    const resolveName = (pid: string) => nameById.get(pid) ?? pid;

    const eloByName = new Map<string, number>();
    const getElo = (name: string) => eloByName.get(name) ?? ELO_INITIAL;
    const setElo = (name: string, elo: number) => eloByName.set(name, elo);

    let snapshot: GameEloSnapshot | null = null;

    for (const game of allGames) {
        if (game.brancos_score == null || game.pretos_score == null) continue;

        const { brancosNames, pretosNames, captainB, captainP } = resolveGameTeams(game, resolveName);

        if (brancosNames.length === 0 || pretosNames.length === 0) continue;

        const avgBrancosBefore = brancosNames.reduce((s, n) => s + getElo(n), 0) / brancosNames.length;
        const avgPretosBefore = pretosNames.reduce((s, n) => s + getElo(n), 0) / pretosNames.length;

        const expB = expectedScore(avgBrancosBefore, avgPretosBefore);
        const expP = 1 - expB;

        const isDraw = game.brancos_score === game.pretos_score;
        const brancosWon = game.brancos_score > game.pretos_score;
        const actualB = isDraw ? 0.5 : (brancosWon ? 1 : 0);
        const actualP = 1 - actualB;

        const isTargetGame = game.id === gameId;
        const brancosSnapshots: PlayerEloSnapshot[] = [];
        const pretosSnapshots: PlayerEloSnapshot[] = [];

        const rawDeltaB = ELO_K * (actualB - expB);
        const rawDeltaP = ELO_K * (actualP - expP);

        for (const name of brancosNames) {
            const before = getElo(name);
            const after = before + rawDeltaB;
            setElo(name, after);
            if (isTargetGame) {
                const roundedBefore = Math.round(before);
                const roundedAfter = Math.round(after);
                brancosSnapshots.push({
                    name,
                    eloBefore: roundedBefore,
                    eloAfter: roundedAfter,
                    delta: roundedAfter - roundedBefore,
                    isCaptain: captainB != null && resolveName(captainB) === name,
                });
            }
        }
        for (const name of pretosNames) {
            const before = getElo(name);
            const after = before + rawDeltaP;
            setElo(name, after);
            if (isTargetGame) {
                const roundedBefore = Math.round(before);
                const roundedAfter = Math.round(after);
                pretosSnapshots.push({
                    name,
                    eloBefore: roundedBefore,
                    eloAfter: roundedAfter,
                    delta: roundedAfter - roundedBefore,
                    isCaptain: captainP != null && resolveName(captainP) === name,
                });
            }
        }

        if (isTargetGame) {
            const avgBrancosAfter = brancosNames.reduce((s, n) => s + getElo(n), 0) / brancosNames.length;
            const avgPretosAfter = pretosNames.reduce((s, n) => s + getElo(n), 0) / pretosNames.length;

            snapshot = {
                brancos: brancosSnapshots,
                pretos: pretosSnapshots,
                brancosAvgBefore: Math.round(avgBrancosBefore),
                pretosAvgBefore: Math.round(avgPretosBefore),
                brancosAvgAfter: Math.round(avgBrancosAfter),
                pretosAvgAfter: Math.round(avgPretosAfter),
            };
            break;
        }
    }

    return snapshot;
}

// ---------------------------------------------------------------------------
// Partnerships & Rivalries
// ---------------------------------------------------------------------------
// Computes for every pair of players who shared at least N games:
//   - Together stats (same team): games, wins, win rate
//   - Against stats (opposite teams): games, wins for each side
// ---------------------------------------------------------------------------
export type PairStats = {
    playerA: string;
    playerB: string;
    togetherGames: number;
    togetherWins: number;
    togetherWinRate: number;
    againstGames: number;
    winsA: number;
    winsB: number;
};

export type RivalryEntry = {
    player: string;
    opponent: string;
    games: number;
    wins: number;
    winRate: number;
};

export async function computePartnershipsAndRivalries(season: number, leagueId: number) {
    const [players, games] = await Promise.all([
        prisma.players.findMany({ where: { season, league_id: leagueId } }),
        prisma.games.findMany({ where: { season, league_id: leagueId }, orderBy: { date: 'asc' } }),
    ]);

    const nameById = new Map<string, string>();
    for (const p of players) nameById.set(String(p.id), p.name);

    const resolveName = (pid: string) => nameById.get(pid) ?? pid;

    // Track pair stats keyed by "nameA|nameB" where nameA < nameB alphabetically
    const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
    const pairs = new Map<string, { a: string; b: string; togetherGames: number; togetherWins: number; againstGames: number; winsA: number; winsB: number }>();
    // Track per-player vs opponent
    const vsKey = (player: string, opponent: string) => `${player}|${opponent}`;
    const vsStats = new Map<string, { games: number; wins: number }>();

    for (const game of games) {
        const brancosRaw: string[] = (game.brancos_players as any[])?.map(String) ?? [];
        const pretosRaw: string[] = (game.pretos_players as any[])?.map(String) ?? [];
        const captainB = game.brancos_captain != null ? String(game.brancos_captain) : null;
        const captainP = game.pretos_captain != null ? String(game.pretos_captain) : null;

        const brancosIds = new Set(brancosRaw);
        const pretosIds = new Set(pretosRaw);
        if (captainB) brancosIds.add(captainB);
        if (captainP) pretosIds.add(captainP);

        const brancosNames = [...brancosIds].map(resolveName);
        const pretosNames = [...pretosIds].map(resolveName);

        if (game.brancos_score == null || game.pretos_score == null) continue;

        const isDraw = game.brancos_score === game.pretos_score;
        const brancosWon = game.brancos_score > game.pretos_score;

        // Same-team pairs (Brancos)
        for (let i = 0; i < brancosNames.length; i++) {
            for (let j = i + 1; j < brancosNames.length; j++) {
                const key = pairKey(brancosNames[i], brancosNames[j]);
                let pair = pairs.get(key);
                if (!pair) {
                    const [a, b] = brancosNames[i] < brancosNames[j] ? [brancosNames[i], brancosNames[j]] : [brancosNames[j], brancosNames[i]];
                    pair = { a, b, togetherGames: 0, togetherWins: 0, againstGames: 0, winsA: 0, winsB: 0 };
                    pairs.set(key, pair);
                }
                pair.togetherGames++;
                if (brancosWon) pair.togetherWins++;
            }
        }
        // Same-team pairs (Pretos)
        for (let i = 0; i < pretosNames.length; i++) {
            for (let j = i + 1; j < pretosNames.length; j++) {
                const key = pairKey(pretosNames[i], pretosNames[j]);
                let pair = pairs.get(key);
                if (!pair) {
                    const [a, b] = pretosNames[i] < pretosNames[j] ? [pretosNames[i], pretosNames[j]] : [pretosNames[j], pretosNames[i]];
                    pair = { a, b, togetherGames: 0, togetherWins: 0, againstGames: 0, winsA: 0, winsB: 0 };
                    pairs.set(key, pair);
                }
                pair.togetherGames++;
                if (!brancosWon && !isDraw) pair.togetherWins++;
            }
        }

        // Opposite-team pairs (Brancos vs Pretos)
        for (const bName of brancosNames) {
            for (const pName of pretosNames) {
                const key = pairKey(bName, pName);
                let pair = pairs.get(key);
                if (!pair) {
                    const [a, b] = bName < pName ? [bName, pName] : [pName, bName];
                    pair = { a, b, togetherGames: 0, togetherWins: 0, againstGames: 0, winsA: 0, winsB: 0 };
                    pairs.set(key, pair);
                }
                pair.againstGames++;
                if (!isDraw) {
                    // 'a' is alphabetically first
                    if (brancosWon) {
                        if (bName < pName) pair.winsA++; else pair.winsB++;
                    } else {
                        if (pName < bName) pair.winsA++; else pair.winsB++;
                    }
                }

                // Per-player vs opponent tracking
                const vsKeyBP = vsKey(bName, pName);
                const vsBP = vsStats.get(vsKeyBP) ?? { games: 0, wins: 0 };
                vsBP.games++;
                if (brancosWon) vsBP.wins++;
                vsStats.set(vsKeyBP, vsBP);

                const vsKeyPB = vsKey(pName, bName);
                const vsPB = vsStats.get(vsKeyPB) ?? { games: 0, wins: 0 };
                vsPB.games++;
                if (!brancosWon && !isDraw) vsPB.wins++;
                vsStats.set(vsKeyPB, vsPB);
            }
        }
    }

    const MIN_TOGETHER = 3;
    const MIN_AGAINST = 3;

    // Best & worst partnerships (together)
    const allPairs = [...pairs.values()];
    const togetherPairs: PairStats[] = allPairs
        .filter(p => p.togetherGames >= MIN_TOGETHER)
        .map(p => ({
            playerA: p.a,
            playerB: p.b,
            togetherGames: p.togetherGames,
            togetherWins: p.togetherWins,
            togetherWinRate: p.togetherWins / p.togetherGames,
            againstGames: p.againstGames,
            winsA: p.winsA,
            winsB: p.winsB,
        }));

    const bestPartnerships = [...togetherPairs].sort((a, b) => b.togetherWinRate - a.togetherWinRate || b.togetherWins - a.togetherWins);
    const worstPartnerships = [...togetherPairs].sort((a, b) => a.togetherWinRate - b.togetherWinRate || a.togetherWins - b.togetherWins);

    // Rivalries: per player, who they beat most / lose to most
    const playerNames = [...nameById.values()];
    const favoriteRivals: RivalryEntry[] = [];
    const nemeses: RivalryEntry[] = [];

    for (const player of playerNames) {
        let bestWinRate = -1;
        let bestRival: RivalryEntry | null = null;
        let worstWinRate = 2;
        let worstNemesis: RivalryEntry | null = null;

        for (const opponent of playerNames) {
            if (player === opponent) continue;
            const key = vsKey(player, opponent);
            const vs = vsStats.get(key);
            if (!vs || vs.games < MIN_AGAINST) continue;

            const wr = vs.wins / vs.games;
            if (wr > bestWinRate || (wr === bestWinRate && vs.games > (bestRival?.games ?? 0))) {
                bestWinRate = wr;
                bestRival = { player, opponent, games: vs.games, wins: vs.wins, winRate: wr };
            }
            if (wr < worstWinRate || (wr === worstWinRate && vs.games > (worstNemesis?.games ?? 0))) {
                worstWinRate = wr;
                worstNemesis = { player, opponent, games: vs.games, wins: vs.wins, winRate: wr };
            }
        }

        if (bestRival) favoriteRivals.push(bestRival);
        if (worstNemesis) nemeses.push(worstNemesis);
    }

    favoriteRivals.sort((a, b) => b.winRate - a.winRate || b.games - a.games);
    nemeses.sort((a, b) => a.winRate - b.winRate || b.games - a.games);

    return {
        bestPartnerships: bestPartnerships.slice(0, 10),
        worstPartnerships: worstPartnerships.slice(0, 10),
        favoriteRivals: favoriteRivals.slice(0, 10),
        nemeses: nemeses.slice(0, 10),
    };
}

// ---------------------------------------------------------------------------
// MVP Voting
// ---------------------------------------------------------------------------

export async function fetchVotingSession(gameId: number) {
    return prisma.voting_sessions.findUnique({ where: { game_id: gameId } });
}

export async function hasPlayerVoted(gameId: number, voterName: string) {
    const vote = await prisma.game_votes.findUnique({
        where: { game_id_voter_name: { game_id: gameId, voter_name: voterName } },
    });
    return vote != null;
}

export type VoteResults = {
    totalVotes: number;
    bestPlayer: { name: string; votes: number }[];
    disruptor: { name: string; votes: number }[];
    wall: { name: string; votes: number }[];
    bestGoal: { name: string; votes: number }[];
};

export async function fetchVoteResults(gameId: number): Promise<VoteResults> {
    const votes = await prisma.game_votes.findMany({ where: { game_id: gameId } });

    const countField = (field: (v: typeof votes[0]) => string | null) => {
        const counts = new Map<string, number>();
        for (const v of votes) {
            const val = field(v);
            if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
        }
        return [...counts.entries()]
            .map(([name, voteCount]) => ({ name, votes: voteCount }))
            .sort((a, b) => b.votes - a.votes);
    };

    return {
        totalVotes: votes.length,
        bestPlayer: countField(v => v.best_player),
        disruptor: countField(v => v.disruptor),
        wall: countField(v => v.wall),
        bestGoal: countField(v => v.best_goal),
    };
}

export type CumulativeMVPStats = {
    bestPlayer: { name: string; count: number }[];
    disruptor: { name: string; count: number }[];
    wall: { name: string; count: number }[];
    bestGoal: { name: string; count: number }[];
};

export async function fetchCumulativeMVPStats(season: number, leagueId: number): Promise<CumulativeMVPStats> {
    // Get all game IDs for this season and league
    const games = await prisma.games.findMany({
        where: { season, league_id: leagueId },
        select: { id: true },
    });
    const gameIds = games.map(g => g.id);

    // Get closed voting sessions for these games
    const sessions = await prisma.voting_sessions.findMany({
        where: { game_id: { in: gameIds }, is_open: false },
        select: { game_id: true },
    });
    const closedGameIds = sessions.map(s => s.game_id);

    if (closedGameIds.length === 0) {
        return { bestPlayer: [], disruptor: [], wall: [], bestGoal: [] };
    }

    const allVotes = await prisma.game_votes.findMany({
        where: { game_id: { in: closedGameIds } },
    });

    // For each category, find the winner per game, then count wins across games
    const winnerPerGame = (field: (v: typeof allVotes[0]) => string | null) => {
        const byGame = new Map<number, Map<string, number>>();
        for (const v of allVotes) {
            const val = field(v);
            if (!val) continue;
            let gameMap = byGame.get(v.game_id);
            if (!gameMap) { gameMap = new Map(); byGame.set(v.game_id, gameMap); }
            gameMap.set(val, (gameMap.get(val) ?? 0) + 1);
        }
        // Count how many games each player won
        const winCounts = new Map<string, number>();
        for (const [, gameMap] of byGame) {
            let maxVotes = 0;
            let winner = '';
            for (const [name, count] of gameMap) {
                if (count > maxVotes) { maxVotes = count; winner = name; }
            }
            if (winner) winCounts.set(winner, (winCounts.get(winner) ?? 0) + 1);
        }
        return [...winCounts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    };

    return {
        bestPlayer: winnerPerGame(v => v.best_player),
        disruptor: winnerPerGame(v => v.disruptor),
        wall: winnerPerGame(v => v.wall),
        bestGoal: winnerPerGame(v => v.best_goal),
    };
}

export async function fetchGamePlayerNames(gameId: number): Promise<string[]> {
    const game = await prisma.games.findUnique({ where: { id: gameId } });
    if (!game) return [];

    const allPlayers = await prisma.players.findMany({
        where: { league_id: game.league_id },
        select: { id: true, name: true },
    });
    const nameById = new Map<string, string>();
    for (const p of allPlayers) nameById.set(String(p.id), p.name);

    const brancosRaw: string[] = (game.brancos_players as any[])?.map(String) ?? [];
    const pretosRaw: string[] = (game.pretos_players as any[])?.map(String) ?? [];
    const ids = new Set([...brancosRaw]);
    const pretosIds = new Set([...pretosRaw]);
    if (game.brancos_captain) ids.add(String(game.brancos_captain));
    if (game.pretos_captain) pretosIds.add(String(game.pretos_captain));
    for (const pid of pretosIds) ids.add(pid);

    return [...ids].map(pid => nameById.get(pid) ?? pid).sort();
}

export type GameTeamPlayer = { name: string; elo: number; isCaptain: boolean };
export type GameTeamsInfo = {
    brancos: GameTeamPlayer[];
    pretos: GameTeamPlayer[];
    brancosAvg: number;
    pretosAvg: number;
    hasResult: boolean;
};

export async function fetchGameTeamsWithElo(gameId: number): Promise<GameTeamsInfo | null> {
    const game = await prisma.games.findUnique({ where: { id: gameId } });
    if (!game) return null;

    // Compute current Elo up to (but not including) this game
    const precedingGames = await prisma.games.findMany({
        where: { league_id: game.league_id },
        orderBy: [{ season: 'asc' }, { date: 'asc' }, { numero: 'asc' }],
    });

    const allPlayers = await prisma.players.findMany({
        where: { league_id: game.league_id },
        select: { id: true, name: true },
    });
    const nameById = new Map<string, string>();
    for (const p of allPlayers) nameById.set(String(p.id), p.name);
    const resolveName = (pid: string) => nameById.get(pid) ?? pid;

    const eloByName = new Map<string, number>();
    const getElo = (name: string) => eloByName.get(name) ?? ELO_INITIAL;

    // Process all games up to (but not including) the target game
    for (const g of precedingGames) {
        if (g.id === gameId) break;
        if (g.brancos_score == null || g.pretos_score == null) continue;

        const { brancosNames, pretosNames } = resolveGameTeams(g, resolveName);
        if (brancosNames.length === 0 || pretosNames.length === 0) continue;

        const avgB = brancosNames.reduce((s, n) => s + getElo(n), 0) / brancosNames.length;
        const avgP = pretosNames.reduce((s, n) => s + getElo(n), 0) / pretosNames.length;
        const expB = expectedScore(avgB, avgP);
        const expP = 1 - expB;
        const isDraw = g.brancos_score === g.pretos_score;
        const bWon = g.brancos_score > g.pretos_score;
        const actB = isDraw ? 0.5 : (bWon ? 1 : 0);
        const actP = 1 - actB;

        for (const n of brancosNames) eloByName.set(n, getElo(n) + ELO_K * (actB - expB));
        for (const n of pretosNames) eloByName.set(n, getElo(n) + ELO_K * (actP - expP));
    }

    const { brancosNames, pretosNames, captainB, captainP } = resolveGameTeams(game, resolveName);

    const brancosTeam: GameTeamPlayer[] = brancosNames.map(n => ({
        name: n,
        elo: Math.round(getElo(n)),
        isCaptain: captainB != null && resolveName(captainB) === n,
    }));
    const pretosTeam: GameTeamPlayer[] = pretosNames.map(n => ({
        name: n,
        elo: Math.round(getElo(n)),
        isCaptain: captainP != null && resolveName(captainP) === n,
    }));

    const brancosAvg = brancosTeam.length > 0 ? Math.round(brancosTeam.reduce((s, p) => s + p.elo, 0) / brancosTeam.length) : 0;
    const pretosAvg = pretosTeam.length > 0 ? Math.round(pretosTeam.reduce((s, p) => s + p.elo, 0) / pretosTeam.length) : 0;

    return {
        brancos: brancosTeam,
        pretos: pretosTeam,
        brancosAvg,
        pretosAvg,
        hasResult: game.brancos_score != null && game.pretos_score != null,
    };
}

export async function fetchVoterNames(gameId: number): Promise<string[]> {
    const votes = await prisma.game_votes.findMany({
        where: { game_id: gameId },
        select: { voter_name: true },
    });
    return votes.map(v => v.voter_name);
}

export async function fetchPaidPlayers(gameId: number): Promise<string[]> {
    const votes = await prisma.game_votes.findMany({
        where: { game_id: gameId, has_paid: true },
        select: { voter_name: true },
    });
    return votes.map(v => v.voter_name);
}
