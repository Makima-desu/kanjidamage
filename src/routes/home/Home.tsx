import { A, useNavigate } from "@solidjs/router"
import Navbar from "../../navbar/Navbar"
import { createSignal, createEffect, For, Show } from "solid-js"
import { invoke } from "@tauri-apps/api/core"
import { handle_navigation, KanjiDetail } from "../../utils";

function Home() {
    const navigate = useNavigate();
    const [practicePool, setPracticePool] = createSignal<KanjiDetail[]>([]);
    const [isPoolOpen, setIsPoolOpen] = createSignal(true);

    createEffect(async () => {
        try {
            const pool = await invoke<KanjiDetail[]>('initialize_practice_pool');
            setPracticePool(pool);
        } catch (error) {
            console.error('Failed to load practice pool:', error);
        }
    });

    const togglePractice = async (kanji: KanjiDetail) => {
        try {
            await invoke('update_kanji_practice', { index: kanji.index, practice: !kanji.practice });
            const pool = await invoke<KanjiDetail[]>('initialize_practice_pool');
            setPracticePool(pool);
        } catch (error) {
            console.error('Failed to toggle practice status:', error);
        }
    };

    return (
        <div class="flex flex-col bg-gray-50 w-full">
            <Navbar />
            <main class="flex w-full h-full relative">
                <div class="absolute flex flex-col w-screen h-full overflow-y-auto mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Main Actions */}
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <A 
                            href="/practice" 
                            class="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-lg shadow-sm hover:shadow transition-all text-center"
                        >
                            <h2 class="text-xl font-bold mb-1">Practice Kanji</h2>
                            <p class="text-green-600 text-sm">Review your saved kanji and practice</p>
                        </A>

                        <A 
                            href="/kanjis" 
                            class="bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-lg shadow-sm hover:shadow transition-all text-center"
                        >
                            <h2 class="text-xl font-bold mb-1">Browse Kanji</h2>
                            <p class="text-blue-600 text-sm">Explore and add new kanji to practice</p>
                        </A>
                    </div>

                    {/* Practice Pool */}
                    <div class="bg-white rounded-xl shadow-sm mb-8">
                        <div 
                            class="flex justify-between items-center p-4 cursor-pointer"
                            onClick={() => setIsPoolOpen(!isPoolOpen())}
                        >
                            <div class="flex items-center gap-2">
                                <h2 class="text-xl font-bold text-gray-900">Practice Pool</h2>
                                <span class="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-sm font-medium">
                                    {practicePool().length} items
                                </span>
                            </div>
                            <button class="text-gray-400 hover:text-gray-600">
                                <svg 
                                    class={`w-6 h-6 transform transition-transform ${isPoolOpen() ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                        
                        <Show when={isPoolOpen()}>
                            <div class="p-4 border-t">
                                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    <For each={practicePool()}>
                                        {(item) => (
                                            <div class="flex flex-col items-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                                                <button 
                                                    onClick={() => handle_navigation(item.link, navigate)}
                                                    class="text-3xl font-bold text-gray-900 mb-2 hover:text-blue-600"
                                                >
                                                    {item.kanji.startsWith('/') ? (
                                                        <img 
                                                            src={`https://www.kanjidamage.com/${item.kanji}`} 
                                                            alt="Kanji character"
                                                            class="h-[1em] w-auto inline-block"
                                                            style="object-fit: contain"
                                                        />
                                                    ) : (
                                                        item.kanji
                                                    )}
                                                </button>
                                                <span class="text-sm text-gray-600 mb-2">{item.meaning}</span>
                                                <button
                                                    onClick={() => togglePractice(item)}
                                                    class="text-sm px-3 py-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </For>
                                </div>
                                <Show when={practicePool().length === 0}>
                                    <p class="text-center text-gray-600 py-8">No kanji in practice pool</p>
                                </Show>
                            </div>
                        </Show>
                    </div>

                    {/* FAQ/Features section remains unchanged */}
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6">How to Use</h2>
                        <div class="space-y-6">
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">Kanjis</h3>
                                <p class="text-gray-600">
                                    This opens the list of all kanjis in the same following order as in Kanjidamage, 
                                    click on any kanji there and it will go to the kanji page.
                                </p>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">Kanji</h3>
                                <p class="text-gray-600">
                                    Pretty much the same as the kanji page in Kanjidamage, but looks nicer.
                                    Only addition is the practice button, which adds the kanji to the practice pool.
                                </p>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">Practice Mode & Pool</h3>
                                <p class="text-gray-600">
                                    Practice pool is the kanjis you want to practice, you can add or remove kanjis from it.
                                    I've tried to make it similar to the WaniKani practice mode as I like it.
                                </p>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-gray-800 mb-2">Other</h3>
                                <p class="text-gray-600">
                                    Will probably add more stuff
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default Home
