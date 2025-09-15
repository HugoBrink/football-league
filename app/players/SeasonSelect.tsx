'use client'

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
    season: number
    seasons: number[]
}

export default function SeasonSelect({ season, seasons }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const next = new URLSearchParams(searchParams?.toString());
        next.set('season', e.target.value);
        router.push(`${pathname}?${next.toString()}`);
    }

    return (
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600" htmlFor="season">Season</label>
            <select
                id="season"
                className="border rounded px-2 py-1 text-sm"
                value={String(season)}
                onChange={onChange}
            >
                {seasons.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
        </div>
    );
}
