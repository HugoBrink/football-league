import Table from "../../components/Table"
import { fetchPlayers } from "../../lib/data"
import { Player } from "../../lib/definitions";
import Add from "../../components/Add";
import React from "react";

const players = [
    { name: 'Player 1', points: 9, gamesPlayed: 3, wins: 3, losses: 0, goalDifference: 5 },
    { name: 'Player 2', points: 7, gamesPlayed: 3, wins: 2, losses: 1, goalDifference: 2 },
    { name: 'Player 3', points: 4, gamesPlayed: 3, wins: 1, losses: 2, goalDifference: -1 },
    { name: 'Player 4', points: 1, gamesPlayed: 3, wins: 0, losses: 3, goalDifference: -6 },
]


export default async function Dashboard() {

    const players = await fetchPlayers();

    return (
        <div>
            <div className="flex justify-between items-center w-[80%]">
                <h1>Dashboard</h1>
                <Add type="players" />
                <Add type="games" />
            </div>

            <Table players={players} />
        </div>
    )
}
