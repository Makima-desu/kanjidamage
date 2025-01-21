import { A, useNavigate } from "@solidjs/router"
import Navbar from "../../navbar/Navbar"
import { createSignal, createEffect, For, Show } from "solid-js"
import { invoke } from "@tauri-apps/api/core"
import { handle_navigation, KanjiDetail } from "../../utils";

function Home() {
    const navigate = useNavigate();

    const [practiceCount, setPracticeCount] = createSignal(0);
    const [practicePool, setPracticePool] = createSignal<KanjiDetail[]>([]);


    createEffect(async () => {
        try {
            const pool = await invoke<KanjiDetail[]>('initialize_practice_pool');
            setPracticePool(pool);
            console.log(pool)
            setPracticeCount(pool.length);
        } catch (error) {
            console.error('Failed to load practice pool:', error);
        }
    });

    const togglePractice = async (kanji: KanjiDetail) => {
        try {
            await invoke('update_kanji_practice', { index: kanji.index, practice: !kanji.practice });
            const pool = await invoke<KanjiDetail[]>('initialize_practice_pool');
            setPracticePool(pool);
            setPracticeCount(pool.length);
        } catch (error) {
            console.error('Failed to toggle practice status:', error);
        }
    };

    return (
        <div class="flex flex-col bg-gray-50 w-full">
            <Navbar />
            <main class="flex-1 w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
                {/* Hero Section */}
                {/* <div class="text-center mb-12">
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">
                        Master Kanji Learning
                    </h1>
                    <p class="text-lg text-gray-600">
                        Your personalized journey to Japanese mastery
                    </p>
                </div> */}

                {/* Quick Stats */}
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Practice Items</h3>
                        <p class="text-3xl font-bold text-green-600">{practiceCount()}</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Daily Streak</h3>
                        <p class="text-3xl font-bold text-blue-600">0 days</p>
                    </div>
                    <div class="bg-white p-6 rounded-xl shadow-sm">
                        <h3 class="text-lg font-semibold text-gray-800 mb-2">Mastered Kanji</h3>
                        <p class="text-3xl font-bold text-purple-600">0</p>
                    </div>
                </div>

                {/* Main Actions */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div class="bg-white p-8 rounded-xl shadow-sm">
                        <h2 class="text-2xl font-bold text-gray-900 mb-4">Practice Queue</h2>
                        <p class="text-gray-600 mb-4">
                            Review your saved kanji and improve your memory
                        </p>
                        <A href="/practice" class="inline-block bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors">
                            Start Practice
                        </A>
                    </div>

                    <div class="bg-white p-8 rounded-xl shadow-sm">
                        <h2 class="text-2xl font-bold text-gray-900 mb-4">Browse Kanji</h2>
                        <p class="text-gray-600 mb-4">
                            Explore and learn new kanji characters
                        </p>
                        <A href="/kanjis" class="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                            Browse Library
                        </A>
                    </div>
                </div>

                {/* Recent Activity */}
                <div class="bg-white p-8 rounded-xl shadow-sm">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
                    <div class="space-y-4">
                        <p class="text-gray-600 text-center">No recent activity</p>
                    </div>
                </div>

                                {/* Practice Pool Section */}
                                <div class="bg-white p-8 rounded-xl shadow-sm mt-12">
                    <h2 class="text-2xl font-bold text-gray-900 mb-6">Practice Pool</h2>
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
                        <p class="text-center text-gray-600">No kanji in practice pool</p>
                    </Show>
                </div>
            </main>
        </div>
    )
}

export default Home