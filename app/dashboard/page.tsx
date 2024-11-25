import Table from "../components/Table"
import AddPlayer from "../components/AddPlayer"

const players = [
    { name: 'Player 1', points: 9, gamesPlayed: 3, wins: 3, losses: 0, goalDifference: 5 },
    { name: 'Player 2', points: 7, gamesPlayed: 3, wins: 2, losses: 1, goalDifference: 2 },
    { name: 'Player 3', points: 4, gamesPlayed: 3, wins: 1, losses: 2, goalDifference: -1 },
    { name: 'Player 4', points: 1, gamesPlayed: 3, wins: 0, losses: 3, goalDifference: -6 },
]


export default function Dashboard() {

    return (
        <div>
            <div className="flex justify-between items-center w-[80%]">
                <h1>Dashboard</h1>
                <AddPlayer />
            </div>

            <Table players={players} />
        </div>
    )
}
