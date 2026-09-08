export type Player = {
    id: any
    name: string
    points: number | null
    games: number | null
    wins: number | null
    losses: number | null
    draws: number | null
    goals_diff: number | null
    league_id?: number
    season?: number
}

export type Game = {
    id?: number
    date: Date
    brancos_score: number
    pretos_score: number
    goal_difference: number
    brancos_players: any
    pretos_players: any
    brancos_captain: string
    pretos_captain: string
    numero: number
    league_id?: number
    season?: number
}

export type User = {
    id: any
    email: string
    password: string
}

export type League = {
    id: number
    name: string
    slug: string
    city: string
    current_season: number
    created_at: Date
}

export type AggregatedPlayer = {
    name: string
    points: number
    games: number
    wins: number
    losses: number
    draws: number
    goals_diff: number
    leagues: string[]
}
