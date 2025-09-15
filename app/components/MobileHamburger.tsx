'use client'

import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import NavLinks from './NavLinks'

export default function MobileHamburger() {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="sm:hidden sticky top-0 z-30 bg-gray-800 text-white flex items-center justify-between px-4 py-3">
                <div className="text-lg font-semibold">Grupeta do Futebol</div>
                <button aria-label="Open menu" onClick={() => setOpen(true)} className="p-2 rounded bg-gray-700 hover:bg-gray-600">
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            <div className={`sm:hidden fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
                <div
                    className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setOpen(false)}
                />
                <div className={`absolute top-0 left-0 h-full w-4/5 max-w-xs transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="h-full bg-gray-800 text-white shadow-xl p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-lg font-semibold">Navegação</div>
                            <button aria-label="Close menu" onClick={() => setOpen(false)} className="p-2 rounded bg-gray-700 hover:bg-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-1" onClick={() => setOpen(false)}>
                            <NavLinks />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
