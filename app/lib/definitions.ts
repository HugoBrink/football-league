export type Player = {
    id: number
    name: string
    points: number
    games: number
    wins: number
    losses: number
    goals_diff: number
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
}

