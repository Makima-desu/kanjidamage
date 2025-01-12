import { useLocation } from "@solidjs/router";
import { createSignal, onMount } from "solid-js";
import Navbar from "../../navbar/Navbar"
import { useParams } from "@solidjs/router";
import { invoke } from "@tauri-apps/api/core";

interface KanjiDetail {
    kanji: string;
    meaning: string;
    onyomi: string[];
    kunyomi: {
        reading: string;
        meaning: string;
        usefulness: number;
    }[];
    jukugo: {
        japanese: string;
        reading: string;
        english: string;
        usefulness: number;
        components: string[];
    }[];
    mnemonic: string | null;
    usefulness: number;
    used_in: string[];
    synonyms: {
        japanese: string;
        english: string;
    }[];
}

interface RouteParams {
    url: string;
}

function Kanji() {
    const params = useParams();
    const [kanji, setKanji] = createSignal<KanjiDetail>();
    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal<string>();

    onMount(async () => {
        try {
            setLoading(true);
            if (!params.url) {
                throw new Error("No URL provided");
            }
            const data = await invoke("get_kanji", { url: decodeURIComponent(params.url) });
            console.log(data)
            setKanji(data as KanjiDetail);
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    });

    return (
        <div class="flex w-full flex-col h-full bg-gray-50">
            <Navbar />
            <div class="relative w-full h-full">
                <div class="mx-auto px-4 py-8 absolute w-full h-full overflow-y-auto">
                    {loading() ? (
                        <div class="flex justify-center items-center h-64">
                            <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : error() ? (
                        <div class="text-red-500 text-center p-4 bg-white rounded-lg shadow">
                            {error()}
                        </div>
                    ) : kanji() && (
                        <div class="space-y-6">
                            {/* Header Section with Integrated Mnemonic */}
                            <div class="bg-white rounded-xl shadow-sm p-8">
                                <div class="flex flex-col gap-6">
                                    {/* Kanji and Meaning */}
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-8">
                                            <span class="text-8xl font-bold text-gray-800">{kanji()?.kanji}</span>
                                            <div>
                                                <h1 class="text-3xl text-gray-700 font-medium">{kanji()?.meaning}</h1>
                                                <div class="text-yellow-500 text-2xl mt-2">
                                                    {'★'.repeat(kanji()?.usefulness || 0)}
                                                    {'☆'.repeat(5 - (kanji()?.usefulness || 0))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mnemonic Section */}
                                    {kanji()?.mnemonic && (
                                        <div class="border-t border-gray-100 pt-6">
                                            <div class="flex items-start gap-6">
                                                <div class="flex-1">
                                                    <h2 class="text-lg font-semibold text-gray-700 mb-2">Mnemonic</h2>
                                                    <p class="text-gray-600 leading-relaxed">{kanji()?.mnemonic}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Readings Section */}
                            <div class="grid gap-6 md:grid-cols-2">
                                {/* Onyomi */}
                                <div class="bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-4 text-gray-800">音読み (Onyomi)</h2>
                                    <div class="space-y-4">
                                        {kanji()?.onyomi.map(([reading, description]) => (
                                            <div class="p-3 bg-gray-50 rounded-lg">
                                                <div class="flex flex-col gap-2">
                                                    <div class="text-lg font-medium text-gray-800">{reading}</div>
                                                    {description && (
                                                        <div class="text-gray-600 text-sm italic">
                                                            {description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Kunyomi */}
                                <div class="bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-4 text-gray-800">訓読み (Kunyomi)</h2>
                                    <div class="space-y-4">
                                        {kanji()?.kunyomi.map(kun => (
                                            <div class="p-3 bg-gray-50 rounded-lg">
                                                <div class="flex justify-between items-center">
                                                    <div>
                                                        <div class="text-lg font-medium text-gray-800">{kun.reading}</div>
                                                        <div class="text-gray-600">{kun.meaning}</div>
                                                    </div>
                                                    <div class="text-yellow-500">
                                                        {'★'.repeat(kun.usefulness)}
                                                        {'☆'.repeat(5 - kun.usefulness)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Jukugo Section */}
                            <div class="bg-white rounded-xl shadow-sm p-6">
                                <h2 class="text-xl font-semibold mb-6 text-gray-800">Jukugo</h2>
                                <div class="space-y-6">
                                    {kanji()?.jukugo.map(jukugo => (
                                        <div class="border-b border-gray-100 pb-6">
                                            <div class="flex justify-between items-start">
                                                <div class="space-y-2">
                                                    <div class="text-2xl font-medium text-gray-800">{jukugo.japanese}</div>
                                                    <div class="text-gray-500">{jukugo.reading}</div>
                                                    <div class="text-gray-700 mt-1">{jukugo.english}</div>
                                                    {jukugo.components.length > 0 && (
                                                        <div class="flex gap-2 mt-2">
                                                            {jukugo.components.map(comp => (
                                                                <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm">
                                                                    {comp}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div class="text-yellow-500">
                                                    {'★'.repeat(jukugo.usefulness)}
                                                    {'☆'.repeat(5 - jukugo.usefulness)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Used in Section */}
                            {kanji()?.used_in && kanji()?.used_in.length! > 0 && (
                                <div class="bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-4 text-gray-800">Used in</h2>
                                    <div class="flex flex-wrap gap-4">
                                        {kanji()?.used_in.map(term => (
                                            <div class="p-3 bg-gray-50 rounded-lg text-gray-700">
                                                {term} {/* make a link later */}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                            {/* Synonyms Section */}
                            {kanji()?.synonyms && kanji()?.synonyms.length! > 0 && (
                                <div class="bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-4 text-gray-800">Synonyms</h2>
                                    <div class="flex flex-col gap-4">
                                        {kanji()?.synonyms.map(term => (
                                            <div class="p-3 bg-gray-50 rounded-lg text-gray-700">
                                                <div class="text-lg font-medium text-gray-800 mb-1">{term.english}</div>
                                                <div class="text-gray-600">{term.japanese}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Kanji;
