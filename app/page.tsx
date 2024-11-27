import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">Grupeta do futebol</h1>
      <Link href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded-md">Entrar na Liga</Link>
    </div>
  );
}
