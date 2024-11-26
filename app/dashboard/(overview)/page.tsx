import Table from "../../components/Table"
import { fetchPlayers } from "../../lib/data"
import Add from "../../components/Add";
import React from "react";

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
