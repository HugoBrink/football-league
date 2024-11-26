export type Player = {
    id: any
    name: string
    points: number | null
    games: number | null
    wins: number | null
    losses: number | null
    goals_diff: number | null
}

export type Game = {
    id?: number //optional
    date: Date
    brancos_score: number
    pretos_score: number
    goal_difference: number
    brancos_players: string[]
    pretos_players: string[]
    brancos_captain: string
    pretos_captain: string
    numero: number
}

export type User = {
    id: bigint
    email: string
    password: string
}
