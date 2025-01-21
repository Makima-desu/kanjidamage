import { A, useNavigate } from "@solidjs/router"
import { invoke } from "@tauri-apps/api/core";
import { createSignal } from "solid-js"
import { Match, Switch } from "solid-js"

interface KanjiListing {
    index: number;
    kanji: string;
    meaning: string;
    is_radical: boolean;
    link: string;
    has_image: boolean;
}

function Navbar() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = createSignal(false);
    const [searchQuery, setSearchQuery] = createSignal("");
    const [searchResults, setSearchResults] = createSignal<KanjiListing[]>([]);
    const [isSearching, setIsSearching] = createSignal(false);

    const handleSearch = async (e: Event) => {
        e.preventDefault();
        const query = searchQuery().trim();
        
        if (!query) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const isKanji = query.length === 1;
            const results = await invoke<KanjiListing[]>('search_kanji', {
                index: Number.isInteger(Number(query)) ? Number(query) : null,
                kanji: isKanji ? query : null,
                meaning: !isKanji ? query : null,
            });
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleNavigation = (link: string | null | undefined) => {
        console.log(link)
        if (!link) return;
        const absoluteUrl = link.startsWith('http') 
            ? link 
            : `https://www.kanjidamage.com${link}`;
        navigate(`/kanji/${encodeURIComponent(absoluteUrl)}`);
    };

    const isImageUrl = (str: string) => {
        return str.match(/\.(jpg|jpeg|png|gif)$/i) !== null;
    };

    return (
        <nav class="bg-gray-800 shadow-lg select-none">
            <div class="max-w-6xl mx-auto px-4">
                <div class="flex justify-between items-center h-16">
                    <div class="flex-shrink-0">
                        <A href="/" class="text-white font-bold text-xl">KD</A>
                    </div>

                    {/* Desktop Search Bar */}
                    <div class="hidden md:flex flex-1 justify-center px-8">
                        <form onSubmit={handleSearch} class="w-full max-w-lg relative">
                            <div class="relative">
                                <input
                                    type="text"
                                    value={searchQuery()}
                                    onInput={(e) => {
                                        setSearchQuery(e.currentTarget.value);
                                        handleSearch(e);
                                    }}
                                    placeholder="Search by kanji, meaning, or index..."
                                    class="w-full bg-gray-700 text-white rounded-md pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <button
                                    type="submit"
                                    class="absolute right-0 top-0 mt-2 mr-3 text-gray-400 hover:text-white"
                                    disabled={isSearching()}
                                >
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults().length > 0 && (
                                <div class="absolute w-96 mt-1 bg-gray-700 rounded-md shadow-lg max-h-96 overflow-y-auto overflow-x-hidden z-50">
                                    {searchResults().length > 0 && (
                                        <div class="fixed left-0 right-0 mt-1 bg-gray-700 shadow-lg max-h-96 overflow-y-auto z-50">
                                            <div class="max-w-6xl mx-auto"> {/* Container to match navbar width */}
                                                {searchResults().map((kanji) => (
                                                    <button
                                                        class="block px-4 py-2 text-white hover:bg-gray-600 w-full text-left"
                                                        onClick={() => {
                                                            setSearchResults([]);
                                                            setSearchQuery('');
                                                            setIsOpen(false);
                                                            handleNavigation(kanji.link)
                                                        }}
                                                    >
                                                        <Switch>
                                                            <Match when={isImageUrl(kanji.kanji)}>
                                                                <img 
                                                                    src={kanji.kanji} 
                                                                    alt="kanji" 
                                                                    class="inline-block h-6 w-6 align-middle"
                                                                    loading="lazy"
                                                                />
                                                            </Match>
                                                            <Match when={!isImageUrl(kanji.kanji)}>
                                                                <span class="font-bold">{kanji.kanji}</span>
                                                            </Match>
                                                        </Switch>
                                                        <span class="ml-2 text-gray-300">- {kanji.meaning}</span>
                                                        <span class="text-gray-400 text-sm ml-2">#{kanji.index}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
)}
                                </div>
                            )}
                        </form>
                    </div>

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
                        {/* <A 
                            href="/synonyms" 
                            class="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Synonyms
                        </A>
                        <A 
                            href="/tags" 
                            class="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md text-sm font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Tags
                        </A> */}
                    </div>

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

                <div
                    class={`md:hidden transition-all duration-300 ease-in-out ${
                        isOpen() ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                >
                    {/* Mobile Search Bar */}
                    <div class="px-2 pt-2 pb-3">
                        <form onSubmit={handleSearch} class="relative">
                            <div class="relative">
                                <input
                                    type="text"
                                    value={searchQuery()}
                                    onInput={(e) => {
                                        setSearchQuery(e.currentTarget.value);
                                        handleSearch(e);
                                    }}
                                    placeholder="Search by kanji, meaning, or index..."
                                    class="w-full bg-gray-700 text-white rounded-md pl-4 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                                <button
                                    type="submit"
                                    class="absolute right-0 top-0 mt-2 mr-3 text-gray-400 hover:text-white"
                                    disabled={isSearching()}
                                >
                                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Mobile Search Results */}
                            {searchResults().length > 0 && (
                                <div class="absolute w-full mt-1 bg-gray-700 rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
                                    {searchResults().map((kanji) => (
                                        <button
                                            class="block px-4 py-2 text-white hover:bg-gray-600 w-full text-left"
                                            onClick={() => {
                                                setSearchResults([]);
                                                setSearchQuery('');
                                                setIsOpen(false);
                                                handleNavigation(kanji.link)
                                            }}
                                        >
                                            <Switch>
                                                <Match when={isImageUrl(kanji.kanji)}>
                                                    <img 
                                                        src={kanji.kanji} 
                                                        alt="kanji" 
                                                        class="inline-block h-6 w-6 align-middle"
                                                        loading="lazy"
                                                    />
                                                </Match>
                                                <Match when={!isImageUrl(kanji.kanji)}>
                                                    <span class="font-bold">{kanji.kanji}</span>
                                                </Match>
                                            </Switch>
                                            <span class="ml-2 text-gray-300">- {kanji.meaning}</span>
                                            <span class="text-gray-400 text-sm ml-2">#{kanji.index}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>

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
                        {/* <A
                            href="/synonyms"
                            class="block text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Synonyms
                        </A>
                        <A
                            href="/tags"
                            class="block text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium"
                            activeClass="text-white bg-gray-900"
                        >
                            Tags
                        </A> */}
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
