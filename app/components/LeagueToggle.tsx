'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
    leagues: { slug: string; name: string }[];
    current: string;
};

export default function LeagueToggle({ leagues, current }: Props) {
    const pathname = usePathname();

    return (
        <div className="flex rounded-lg overflow-hidden border border-gray-600 mb-3">
            {leagues.map(league => {
                const isActive = league.slug === current;
                const newPath = pathname.replace(`/dashboard/${current}`, `/dashboard/${league.slug}`);
                return (
                    <Link
                        key={league.slug}
                        href={newPath}
                        className={`flex-1 text-center py-1.5 text-sm font-medium transition-colors ${
                            isActive
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                        {league.name.replace('Liga do ', '').replace('Liga de ', '')}
                    </Link>
                );
            })}
        </div>
    );
}
