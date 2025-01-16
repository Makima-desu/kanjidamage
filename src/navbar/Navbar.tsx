import { A } from "@solidjs/router"
import { createSignal } from "solid-js"

function Navbar() {
    const [isOpen, setIsOpen] = createSignal(false);

    return (
        <nav class="bg-gray-800 shadow-lg select-none">
            <div class="max-w-6xl mx-auto px-4">
                {/* Desktop and Mobile Container */}
                <div class="flex justify-between items-center h-16">
                    {/* Logo/Brand */}
                    <div class="flex-shrink-0">
                        <A href="/" class="text-white font-bold text-xl">The KanjiDamage Way</A>
                    </div>

                    {/* Desktop Menu */}
                    <div class="hidden md:flex space-x-8">
                        <A 
                            href="/" 
                            class="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium"
                            activeClass="text-white bg-gray-900"
                            end
                        >
                            Home
                        </A>
                        <A 
                            href="/kanjis" 
                            class="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Kanjis
                        </A>
                        <A 
                            href="/practice" 
                            class="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Practice
                        </A>
                    </div>

                    {/* Mobile Menu Button */}
                    <div class="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen())}
                            class="text-gray-300 hover:text-white focus:outline-none"
                        >
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div
                    class={`md:hidden transition-all duration-300 ease-in-out ${
                        isOpen() ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                >
                    <div class="px-2 pt-2 pb-3 space-y-1">
                        <A
                            href="/"
                            class="block text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium"
                            activeClass="text-white bg-gray-900"
                            end
                        >
                            Home
                        </A>
                        <A
                            href="/kanjis"
                            class="block text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Kanjis
                        </A>
                        <A
                            href="/practice"
                            class="block text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Practice
                        </A>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
