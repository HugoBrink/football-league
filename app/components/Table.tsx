import { Player } from "@/app/lib/definitions"
import Image from "next/image"

export default function Table({ players }: { players: Player[] }) {

    return (
        <div className="mt-6 flow-root">
            <div className="inline-block min-w-full align-middle">
                <div className="rounded-lg bg-gray-50 p-2 md:pt-0">

                    <table className="min-w-full text-gray-900 ">
                        <thead className="rounded-lg text-left text-sm font-normal">
                            <tr>
                                <th scope="col" className="font-medium ">

                                </th>
                                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                                    Nome
                                </th>
                                <th scope="col" className="px-3 py-5 font-medium">
                                    Pontos
                                </th>
                                <th scope="col" className="px-3 py-5 font-medium">
                                    Jogos Jogados
                                </th>
                                <th scope="col" className="px-3 py-5 font-medium">
                                    Vitórias
                                </th>
                                <th scope="col" className="px-3 py-5 font-medium">
                                    Derrotas
                                </th>
                                <th scope="col" className="px-3 py-5 font-medium">
                                    Diferença de Golos
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {players?.map((player, index) => (
                                <tr
                                    key={player.name}
                                    className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                                >
                                    <td className="whitespace-nowrap py-3 pl-6 pr-3">
                                        {index + 1}
                                    </td>
                                    <td className="whitespace-nowrap py-3 pl-6 pr-3">
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


