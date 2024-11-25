

export default function Page(){
    return <div>
        <h1>Criar novo jogador</h1>
        <form className="flex flex-col items-center gap-2">
            <label htmlFor="name">Nome</label>
            <input className="border-2 border-gray-300 rounded-md p-2" type="text" id="name" />
            <button type="submit">Criar Jogador</button>
        </form>
    </div>
}