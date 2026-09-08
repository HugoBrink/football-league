'use client'

import { useState, useTransition } from 'react';
import { createPlayer, importPlayerFromOtherLeague } from '@/app/lib/actions';
import { UserPlus, ArrowDownToLine, Search, Check } from 'lucide-react';

type ImportablePlayer = {
    name: string;
    fromLeague: string;
};

type Props = {
    leagueSlug: string;
    importablePlayers: ImportablePlayer[];
    currentPlayerNames: string[];
};

export default function PlayerCreateForm({ leagueSlug, importablePlayers, currentPlayerNames }: Props) {
    const [tab, setTab] = useState<'new' | 'import'>('new');
    const [search, setSearch] = useState('');
    const [isPending, startTransition] = useTransition();
    const [importedNames, setImportedNames] = useState<Set<string>>(new Set());
    const [successMessage, setSuccessMessage] = useState('');

    const filteredImportable = importablePlayers.filter(p =>
        !importedNames.has(p.name) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreateNew = async (formData: FormData) => {
        startTransition(async () => {
            await createPlayer(leagueSlug, formData);
            setSuccessMessage(`Jogador criado com sucesso!`);
            setTimeout(() => setSuccessMessage(''), 3000);
        });
    };

    const handleImport = (playerName: string) => {
        startTransition(async () => {
            await importPlayerFromOtherLeague(leagueSlug, playerName);
            setImportedNames(prev => new Set(prev).add(playerName));
            setSuccessMessage(`${playerName} adicionado a esta liga!`);
            setTimeout(() => setSuccessMessage(''), 3000);
        });
    };

    return (
        <div className="space-y-4">
            {/* Tab selector */}
            <div className="flex rounded-lg overflow-hidden border-2 border-gray-200">
                <button
                    onClick={() => setTab('new')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors
                        ${tab === 'new'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <UserPlus className="w-4 h-4" />
                    Criar Novo
                </button>
                <button
                    onClick={() => setTab('import')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors
                        ${tab === 'import'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <ArrowDownToLine className="w-4 h-4" />
                    Importar de Outra Liga
                    {importablePlayers.length > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'import' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {importablePlayers.length - importedNames.size}
                        </span>
                    )}
                </button>
            </div>

            {/* Success message */}
            {successMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                    <Check className="w-4 h-4" />
                    {successMessage}
                </div>
            )}

            {/* Create new tab */}
            {tab === 'new' && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Cria um jogador completamente novo que nao existe em nenhuma liga.
                    </p>
                    <form action={handleCreateNew} className="flex flex-col gap-3">
                        <label htmlFor="name" className="text-sm font-medium text-gray-700">Nome do jogador</label>
                        <input
                            autoFocus
                            required
                            className="border-2 border-gray-300 rounded-md p-2.5 text-gray-900"
                            type="text"
                            id="name"
                            name="name"
                            placeholder="Ex: Joao Silva"
                        />
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            <UserPlus className="w-4 h-4" />
                            {isPending ? 'A criar...' : 'Criar Jogador'}
                        </button>
                    </form>
                </div>
            )}

            {/* Import tab */}
            {tab === 'import' && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Adiciona um jogador que ja existe noutra liga. As estatisticas comecam a zero nesta liga.
                    </p>

                    {importablePlayers.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">
                            Todos os jogadores de outras ligas ja estao nesta liga!
                        </p>
                    ) : (
                        <>
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Procurar jogador..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full border-2 border-gray-300 rounded-md p-2.5 pl-9 text-gray-900"
                                />
                            </div>
                            <div className="max-h-80 overflow-y-auto space-y-1">
                                {filteredImportable.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4 text-sm">
                                        Nenhum jogador encontrado
                                    </p>
                                ) : (
                                    filteredImportable.map(player => (
                                        <div
                                            key={player.name}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">{player.name}</p>
                                                <p className="text-xs text-gray-500">{player.fromLeague}</p>
                                            </div>
                                            <button
                                                onClick={() => handleImport(player.name)}
                                                disabled={isPending}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                            >
                                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                                Adicionar
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Current players in this league */}
            {currentPlayerNames.length > 0 && (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Jogadores nesta liga ({currentPlayerNames.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {currentPlayerNames.map(name => (
                            <span key={name} className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-md text-gray-700">
                                {name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
