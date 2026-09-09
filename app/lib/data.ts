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

// ---------------------------------------------------------------------------
// Elo Rating System
// ---------------------------------------------------------------------------
// Processes ALL games across ALL seasons for a league chronologically.
// Each player starts at 1000. K-factor = 32.
// Team Elo = average Elo of its members. Expected score uses logistic formula.
// ---------------------------------------------------------------------------
const ELO_INITIAL = 1000;
const ELO_K = 32;

function expectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export type EloEntry = {
    id: string;
    name: string;
    elo: number;
    peak: number;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    history: { gameNum: number; elo: number; date: Date }[];
};

export async function computeEloRatings(leagueId: number) {
    const allGames = await prisma.games.findMany({
        where: { league_id: leagueId },
        orderBy: [{ season: 'asc' }, { date: 'asc' }, { numero: 'asc' }],
    });

    const allPlayers = await prisma.players.findMany({
        where: { league_id: leagueId },
        select: { id: true, name: true, season: true },
    });

    // Build a name lookup: prefer latest season entry for each unique id
    const nameById = new Map<string, string>();
    for (const p of allPlayers) {
        nameById.set(String(p.id), p.name);
    }
    // Also map by name across seasons (player ids change per season)
    const idsByName = new Map<string, string[]>();
    for (const p of allPlayers) {
        const arr = idsByName.get(p.name) ?? [];
        arr.push(String(p.id));
        idsByName.set(p.name, arr);
    }

    // Elo stored by canonical player name (since ids change across seasons)
    const eloByName = new Map<string, { elo: number; peak: number; games: number; wins: number; losses: number; draws: number; history: { gameNum: number; elo: number; date: Date }[] }>();

    const getElo = (name: string) => {
        let entry = eloByName.get(name);
        if (!entry) {
            entry = { elo: ELO_INITIAL, peak: ELO_INITIAL, games: 0, wins: 0, losses: 0, draws: 0, history: [] };
            eloByName.set(name, entry);
        }
        return entry;
    };

    const resolveName = (pid: string): string => {
        return nameById.get(pid) ?? pid;
    };

    let gameNum = 0;
    for (const game of allGames) {
        gameNum++;
        const date = game.date as unknown as Date;
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

        if (brancosNames.length === 0 || pretosNames.length === 0) continue;

        // Average team Elo
        const avgBrancos = brancosNames.reduce((s, n) => s + getElo(n).elo, 0) / brancosNames.length;
        const avgPretos = pretosNames.reduce((s, n) => s + getElo(n).elo, 0) / pretosNames.length;

        const expectedBrancos = expectedScore(avgBrancos, avgPretos);
        const expectedPretos = 1 - expectedBrancos;

        const isDraw = game.brancos_score === game.pretos_score;
        const brancosWon = game.brancos_score > game.pretos_score;

        // Actual scores: 1 = win, 0.5 = draw, 0 = loss
        const actualBrancos = isDraw ? 0.5 : (brancosWon ? 1 : 0);
        const actualPretos = 1 - actualBrancos;

        for (const name of brancosNames) {
            const entry = getElo(name);
            entry.elo += ELO_K * (actualBrancos - expectedBrancos);
            entry.games++;
            if (isDraw) entry.draws++;
            else if (brancosWon) entry.wins++;
            else entry.losses++;
            if (entry.elo > entry.peak) entry.peak = entry.elo;
            entry.history.push({ gameNum, elo: Math.round(entry.elo), date });
        }
        for (const name of pretosNames) {
            const entry = getElo(name);
            entry.elo += ELO_K * (actualPretos - expectedPretos);
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
        // Find the latest player id for this name
        const ids = idsByName.get(name) ?? [];
        results.push({
            id: ids[ids.length - 1] ?? name,
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
