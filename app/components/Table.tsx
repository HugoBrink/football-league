import { Player } from "@/app/lib/definitions";

export default function Table({ players }: { players: Player[] }) {

    return (
        <div className="mt-6">
            <div className="inline-block min-w-full align-middle">
                <div className="sm:rounded-lg bg-gray-50 py-4 cursor-default">

                    <table className="min-w-full text-gray-900 ">
                        <thead className="rounded-lg text-left text-sm font-normal">
                            <tr>
                                <th scope="col" className="font-medium ">

                                </th>
                                <th scope="col" className="">
                                    <div className="mobile-row">
                                        Nome
                                    </div>
                                </th>
                                <th scope="col" className="mobile-row">
                                    <span className="hidden sm:inline">Pontos</span>
                                    <span className="sm:hidden">P</span>
                                </th>
                                <th scope="col" className="">
                                    <div className="mobile-row">
                                        <span className="hidden sm:inline">Jogos</span>
                                        <span className="sm:hidden">J</span>
                                    </div>
                                </th>
                                <th scope="col" className="">
                                    <div className="mobile-row">
                                        <span className="hidden sm:inline">Vitórias</span>
                                        <span className="sm:hidden">V</span>
                                    </div>
                                </th>
                                <th scope="col" className="">
                                    <div className="mobile-row">
                                        <span className="hidden sm:inline">Derrotas</span>
                                        <span className="sm:hidden">D</span>
                                    </div>
                                </th>
                                <th scope="col" className="">
                                    <div className="mobile-row">
                                        <span className="hidden sm:inline">Diferença de Golos</span>
                                        <span className="sm:hidden">DG</span>
                                    </div>
                                </th>
                                <th scope="col" className="">
                                    <div className="mobile-row">
                                        <span className="hidden sm:inline">% de Vitórias</span>
                                        <span className="sm:hidden">%V</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {players?.map((player, index) => (
                                <tr
                                    key={player.name}
                                    className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                                >
                                    <td className="whitespace-nowrap py-3 sm:pl-6 pl-2 sm:pr-3 font-bold ">
                                        {index + 1}
                                    </td>
                                    <td className="whitespace-nowrap py-3 pl-1 pr-3">
                                        <div className="flex items-center gap-3">
                                            <p>{player.name}</p>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3">
                                        {player.points}
                                    </td>
                                    <td className="whitespace-nowrap py-3 pl-6 pr-3 ">
                                        {player.games}
                                    </td>
                                    <td className="whitespace-nowrap py-3 pl-6 pr-3 ">
                                        {player.wins}
                                    </td>
                                    <td className="whitespace-nowrap py-3 pl-6 pr-3 ">
                                        {player.losses}
                                    </td>
                                    <td className="whitespace-nowrap py-3 pl-6 pr-3">
                                        {player.goals_diff}
                                    </td>
                                    <td className="whitespace-nowrap py-3">
                                        {player.wins && player.games ? (player.wins / player.games * 100).toFixed(2) + '%' : '0.00%'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
