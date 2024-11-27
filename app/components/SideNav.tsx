import React from 'react'
import { PowerIcon } from 'lucide-react'
import { signOut } from '../../auth'
import NavLinks from './NavLinks'
import { auth } from '@/auth'

export default async function SideNav() {
    const session = await auth();

    return (
        <div className="sticky top-0 bg-gray-800 text-white w-full h-screen p-4 flex flex-col justify-between">
            <div>
                <h1 className="text-white text-2xl font-bold pb-2 cursor-default">Grupeta do Futebol</h1>
                <NavLinks />
            </div>
            {session?.user && (
                <form
                    action={async () => {
                        'use server';
                        await signOut();
                    }}
                >
                    <button className="flex items-center justify-center space-x-2 w-full p-1 rounded-lg bg-gray-500 hover:bg-gray-700">
                        <PowerIcon className="w-6" />
                        <div className="hidden md:block">Sign Out</div>
                    </button>
                </form>
            )}
        </div>
    )
}
