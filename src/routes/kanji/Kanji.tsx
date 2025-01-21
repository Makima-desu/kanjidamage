import { useLocation } from "@solidjs/router";
import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, onMount } from "solid-js";
import Navbar from "../../navbar/Navbar"
import { useParams } from "@solidjs/router";
import { invoke } from "@tauri-apps/api/core";
import { handle_navigation, KanjiDetail }  from "../../utils";

interface RouteParams {
    url: string;
}

function Kanji() {
    const params = useParams();
    const navigate = useNavigate();
    const [kanji, setKanji] = createSignal<KanjiDetail>();
    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal<string>();
    const [isPractice, setIsPractice] = createSignal(false);

    const [isRefreshing, setIsRefreshing] = createSignal(false);

    // Add refresh function
    const refreshKanjiData = async () => {
        try {
            setIsRefreshing(true);
            // Invoke new backend function to fetch and update JSON
            const freshData: any = await invoke("refresh_kanji_data", { 
                url: decodeURIComponent(params.url) 
            });
            setKanji(freshData as KanjiDetail);
            setIsPractice(freshData.practice);
        } catch (err) {
            console.error("Failed to refresh kanji data:", err);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Add this function to handle practice status updates
    const togglePractice = async () => {
        const currentPractice = kanji()?.practice || false;
        try {
            // Update backend first
            await invoke("update_kanji_practice", { 
                index: kanji()?.index,
                practice: !currentPractice
            });
            
            // Only update states after successful backend update
            setIsPractice(!currentPractice);
            setKanji(prev => prev ? {...prev, practice: !currentPractice} : prev);
        } catch (err) {
            console.error("Failed to update practice status:", err);
            // No need to revert since we haven't updated local state yet
        }
    };

    function on_kanji_click(url: any) 
    {
        if (!url.link) return;
        
        invoke("get_kanji", {url: url}).then((response) => {
            navigate(`/kanji/${encodeURIComponent(url)}`, { 
                state: { kanji: response }
            });
        });
    }

    function processHtmlContent(html: string) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
    
        // Process any links or components if needed
        tempDiv.querySelectorAll('a').forEach(a => {
            const href = a.getAttribute('href');
            if (href?.startsWith('/')) {
                a.setAttribute('href', `https://www.kanjidamage.com${href}`);
            }
        });
    
        // Process any images if needed
        tempDiv.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src?.startsWith('/')) {
                img.setAttribute('src', `https://www.kanjidamage.com${src}`);
            }
        });
    
        return tempDiv.innerHTML;
    }
    

    function processBreakdown(breakdown: string) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = breakdown;
        
        // Process all image sources
        tempDiv.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src?.startsWith('/')) {
                img.setAttribute('src', `https://www.kanjidamage.com${src}`);
            }
            img.className = 'h-4 w-auto inline-block align-middle';
            img.style.objectFit = 'contain';
        });
        
        // Process all component links
        tempDiv.querySelectorAll('a.component').forEach(a => {
            const href = a.getAttribute('href');
            if (href?.startsWith('/')) {
                a.setAttribute('href', `https://www.kanjidamage.com${href}`);
            }
        });
        
        return tempDiv.innerHTML;
    }

    const stripHtml = (html: string) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    onMount(async () => {
        try {
            setLoading(true);
            if (!params.url) {
                throw new Error("No URL provided");
            }
            const data: KanjiDetail = await invoke("get_kanji", { url: decodeURIComponent(params.url) });
            setKanji(data as KanjiDetail);
            setIsPractice(data.practice)
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    });

    createEffect(async () => {
        if (!params.url) return;
        
        try {
            setLoading(true);
            const data = await invoke("get_kanji", { 
                url: decodeURIComponent(params.url) 
            });
            setKanji(data as KanjiDetail);
            if (kanji()) {
                setIsPractice(kanji()?.practice || false);
            }
            console.log(data)
        } catch (err) {
            setError(err as string);
        } finally {
            setLoading(false);
        }
    });

    return (
        <div class="flex w-full flex-col h-full bg-gray-50">
            <Navbar />
            {!loading() && !error() && kanji() && (
                <div class="bg-white border-b border-gray-200 px-4 py-3">
                    <div class="max-w-7xl mx-auto flex justify-between items-center">
                        <button 
                            class={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                                kanji()?.prev_link 
                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!kanji()?.prev_link}
                            onClick={() => handle_navigation(kanji()?.prev_link, navigate)}
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Previous
                        </button>
                        <span class="font-bold">Number {kanji()?.index}</span>
                        <button 
                            class={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                                kanji()?.next_link 
                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                            disabled={!kanji()?.next_link}
                            onClick={() => handle_navigation(kanji()?.next_link, navigate)}
                        >
                            Next
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
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
                            <div class="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-100 pb-6 gap-4 md:gap-8">
                                <div class="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 w-full">
                                    <span class="text-6xl md:text-8xl font-bold text-gray-800 font-japanese">
                                        {kanji()?.kanji.startsWith('/') ? (
                                            <img 
                                                src={`https://www.kanjidamage.com/${kanji()?.kanji}`} 
                                                alt="Kanji character"
                                                class="h-[1em] w-auto inline-block"
                                                style="object-fit: contain"
                                            />
                                        ) : (
                                            kanji()?.kanji
                                        )}
                                    </span>
                                    
                                    <div class="flex-1">
                                        <h1 class="text-2xl md:text-3xl text-green-600 font-medium tracking-wide">
                                            {kanji()?.meaning}
                                        </h1>
                                        
                                        <div class="text-yellow-500 text-xl md:text-2xl mt-2">
                                            {'★'.repeat(kanji()?.usefulness || 0)}
                                            <span class="text-gray-300">
                                                {'☆'.repeat(5 - (kanji()?.usefulness || 0))}
                                            </span>
                                        </div>
                                        
                                        <div class="flex flex-wrap gap-2 mt-2">
                                            {kanji()?.tags.map(tag => (
                                                <span
                                                    // href={`https://www.kanjidamage.com/${tag.link}`}
                                                    class="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 rounded hover:bg-blue-200 transition-all duration-200"
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                        </div>
                                        
                                        <div
                                            class="text-gray-600 text-sm mt-2"
                                            innerHTML={processBreakdown(kanji()?.breakdown!)}
                                            onClick={(e) => {
                                                const target = e.target as HTMLElement;
                                                if (target.classList.contains('component')) {
                                                    e.preventDefault();
                                                    const link = target.getAttribute('href');
                                                    handle_navigation(link, navigate);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <div class="flex flex-col items-center gap-2 w-full md:w-auto"> 
                                    <button 
                                        onClick={refreshKanjiData}
                                        disabled={isRefreshing()}
                                        class={`
                                            px-4 py-2 md:px-6 md:py-3
                                            w-full
                                            rounded-lg
                                            flex items-center justify-center gap-2
                                            transition-all duration-300
                                            shadow-sm hover:shadow-md
                                            ${isRefreshing() 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                            }
                                        `}
                                    >
                                        <svg 
                                            class={`w-5 h-5 ${isRefreshing() ? 'animate-spin' : ''}`} 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path 
                                                stroke-linecap="round" 
                                                stroke-linejoin="round" 
                                                stroke-width="2" 
                                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                                            />
                                        </svg>
                                        <span class="whitespace-nowrap font-medium">
                                            {isRefreshing() ? 'Refreshing...' : 'Refresh Data'}
                                        </span>
                                    </button>
                                    <button 
                                        onClick={togglePractice}
                                        class={`
                                            w-full
                                            px-4 py-2 md:px-6 md:py-3
                                            rounded-lg
                                            flex items-center justify-center gap-2
                                            transition-all duration-300
                                            shadow-sm hover:shadow-md
                                            ${isPractice() 
                                                ? 'bg-green-500 text-white hover:bg-green-600' 
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }
                                        `}
                                    >
                                        <svg 
                                            class="w-5 h-5" 
                                            fill={isPractice() ? "currentColor" : "none"} 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path 
                                                stroke-linecap="round" 
                                                stroke-linejoin="round" 
                                                stroke-width="2" 
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                                            />
                                        </svg>
                                        <span class="whitespace-nowrap font-medium">
                                            {isPractice() ? 'Remove from Practice' : 'Add to Practice'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {kanji()?.description && (
                                <div class="mt-6 bg-white rounded-xl shadow-sm p-6">
                                    {/* <h2 class="text-xl font-semibold mb-4 text-gray-800"></h2> */}
                                    <div 
                                        class="text-gray-600 prose prose-sm"
                                        innerHTML={processHtmlContent(kanji()?.description!)}
                                    />
                                </div>
                            )}

                            {kanji()?.mnemonic && (
                                <div class="mt-6 bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-4 text-gray-800">Mnemonic</h2>
                                    <div 
                                        class="text-gray-600 prose prose-sm"
                                        innerHTML={processHtmlContent(kanji()?.mnemonic!)}
                                        onClick={(e) => {
                                            const target = e.target as HTMLElement;
                                            if (target.classList.contains('component')) {
                                                e.preventDefault();
                                                const link = target.getAttribute('href');
                                                handle_navigation(link, navigate);
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {((kanji()?.onyomi?.some(([reading]) => stripHtml(reading).trim()) || 
                                    kanji()?.kunyomi?.length! > 0)) && (
                                    <div class={`grid gap-6 ${
                                        kanji()?.onyomi?.some(([reading]) => stripHtml(reading).trim()) && 
                                        kanji()?.kunyomi?.length! > 0 
                                            ? 'md:grid-cols-2' 
                                            : 'md:grid-cols-1'
                                    }`}>
                                        {kanji()?.onyomi?.some(([reading]) => stripHtml(reading).trim()) && (
                                            <div class="bg-white rounded-xl shadow-sm p-6">
                                                <h2 class="text-xl font-semibold mb-4 text-gray-800">音読み (Onyomi)</h2>
                                                <div class="space-y-4">
                                                    {kanji()?.onyomi
                                                        .filter(([reading]) => stripHtml(reading).trim())
                                                        .map(([reading, description]) => (
                                                            <div class="p-3 bg-gray-50 rounded-lg">
                                                                <div class="flex flex-col gap-2">
                                                                    <div class="text-lg font-medium text-gray-800" 
                                                                        innerHTML={reading} />
                                                                    {stripHtml(description).trim() && (
                                                                        <div class="text-gray-600 text-sm"
                                                                            innerHTML={description} />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {kanji()?.kunyomi?.length! > 0 && (
                                            <div class="bg-white rounded-xl shadow-sm p-6">
                                                <h2 class="text-xl font-semibold mb-4 text-gray-800">訓読み (Kunyomi)</h2>
                                                <div class="space-y-4">
                                                    {kanji()?.kunyomi.map((kun: any) => (
                                                        <div class="p-3 bg-gray-50 rounded-lg">
                                                            <div class="flex justify-between items-center">
                                                                <div>
                                                                    <div class="text-lg font-medium text-gray-800 flex items-center gap-2">
                                                                        {kun.reading}
                                                                        {kun.tags && kun.tags.map((tag: any) => (
                                                                            <span
                                                                                // href={`https://www.kanjidamage.com/${tag.link}`}
                                                                                class="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 rounded hover:bg-blue-200 transition-all duration-200"
                                                                            >
                                                                                {tag.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
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
                                        )}
                                    </div>
                                )}

                            {kanji()?.jukugo?.length! > 0 && (
                                <div class="bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-6 text-gray-800">Jukugo</h2>
                                    <div class="space-y-6">
                                        {kanji()?.jukugo.map((jukugo: any) => (
                                            <div class="border-b border-gray-100 pb-6">
                                                <div class="flex justify-between items-start">
                                                    <div class="space-y-2">
                                                        <div class="flex items-center gap-3">
                                                            <div class="text-2xl font-medium text-gray-800">
                                                                {jukugo.japanese}
                                                            </div>
                                                            <div class="flex gap-2">
                                                                {jukugo.tags && jukugo.tags.map((tag: any) => (
                                                                    <span
                                                                        // href={`https://www.kanjidamage.com/${tag.link}`}
                                                                        class="px-2 py-1 text-xs font-medium text-gray-600 bg-blue-100 rounded hover:bg-blue-200 transition-all duration-200"
                                                                    >
                                                                        {tag.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div class="text-gray-500">{jukugo.reading}</div>
                                                        <div class="text-gray-700 mt-1">{jukugo.english}</div>
                                                        <div class="text-gray-600 text-sm mt-2">
                                                            {Array.isArray(jukugo.components) && jukugo.components.map((component: any, index: any) => (
                                                                <>
                                                                    <span class="font-medium">
                                                                        <button 
                                                                            onClick={() => on_kanji_click(component.href)} 
                                                                            class="text-blue-600 hover:underline">
                                                                            {component.kanji}
                                                                        </button>
                                                                        {' '}({component.meaning})
                                                                    </span>
                                                                    {index < jukugo.components.length - 1 && 
                                                                        <span class="mx-1">+</span>
                                                                    }
                                                                </>
                                                            ))}
                                                            <span class="mx-2">=</span>
                                                            <span class="font-medium">{jukugo.japanese}</span>
                                                            <span class="ml-1">({jukugo.english})</span>
                                                        </div>
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
                            )}

                            {kanji()?.used_in?.length! > 0 && (
                                <div class="bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-4 text-gray-800">Used in</h2>
                                    <div class="flex flex-wrap gap-4">
                                        {kanji()?.used_in.map((term: any) => (
                                            <button
                                                // onClick={() => on_kanji_click(term.link)} 
                                                onClick = { () => handle_navigation(term.link, navigate)}
                                                class="p-3 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center"
                                            >
                                                {term.kanji.startsWith('https') ? (
                                                    <img 
                                                        src={term.kanji}
                                                        alt="Kanji character" 
                                                        class="h-6 w-auto"
                                                        style="object-fit: contain"
                                                    />
                                                ) : (
                                                    term.kanji
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {kanji()?.synonyms?.length! > 0 && (
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

                            {kanji()?.lookalikes?.length! > 0 && (
                                <div class="bg-white rounded-xl shadow-sm p-6">
                                    <h2 class="text-xl font-semibold mb-4 text-gray-800">Lookalikes</h2>
                                    <div class="overflow-x-auto">
                                        <table class="min-w-full">
                                            <thead>
                                                <tr class="border-b border-gray-200">
                                                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-900">Kanji</th>
                                                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-900">Meaning</th>
                                                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-900">Hint</th>
                                                    <th class="py-3 px-4 text-left text-sm font-semibold text-gray-900">Radical</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-gray-200">
                                                {kanji()?.lookalikes!.map(lookalike => (
                                                    <tr class="hover:bg-gray-50">
                                                        <td class="py-4 px-4">
                                                            <button
                                                                onClick={() => handle_navigation(lookalike.kanji_link, navigate)}
                                                                class="text-2xl font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                                            >
                                                                {lookalike.kanji.startsWith('http') ? (
                                                                    <img 
                                                                        src={lookalike.kanji}
                                                                        alt="Kanji character"
                                                                        class="h-8 w-auto inline-block"
                                                                        style="object-fit: contain"
                                                                    />
                                                                ) : (
                                                                    lookalike.kanji
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td class="py-4 px-4 text-gray-700">{lookalike.meaning}</td>
                                                        <td class="py-4 px-4 text-gray-700">{lookalike.hint}</td>
                                                        <td class="py-4 px-4">
                                                        <button
                                                            onClick={() => handle_navigation(lookalike.radical_link, navigate)}
                                                            class="text-gray-700 hover:text-blue-600 transition-colors flex items-center"
                                                        >
                                                            {lookalike.radical.startsWith('http') ? (
                                                                <img 
                                                                    src={lookalike.radical}
                                                                    alt="Radical character"
                                                                    class="h-6 w-auto"
                                                                    style="object-fit: contain"
                                                                />
                                                            ) : (
                                                                lookalike.radical
                                                            )}
                                                        </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
