import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import Navbar from "../../navbar/Navbar";

interface Entry {
    index: number,
    kanji: string,
    meaning: string,
    is_radical: boolean,
    link: string,
    has_image: boolean
}

function Kanjis() {
    const navigate = useNavigate();
    const [entries, set_entries] = createSignal([]);

    invoke("get_kanji_list").then((kanji: any) => {
        set_entries(kanji)
    })

    function on_kanji_click(entry: Entry) 
    {
        if (!entry.link) return;
        
        invoke("get_kanji", {url: entry.link}).then((response) => {
            navigate(`/kanji/${encodeURIComponent(entry.link)}`, { 
                state: { kanji: response }
            });
        });
    }

    function render_kanji_content(entry: Entry) {
        if (entry.has_image) {
            const imageUrl = entry.kanji.startsWith('http') 
                ? entry.kanji 
                : `https://www.kanjidamage.com${entry.kanji}`;
            return (
                <img 
                    src={imageUrl}
                    alt={entry.meaning}
                    class="h-6 w-6 sm:h-8 sm:w-8 object-contain"
                    onError={(e) => {
                        console.error(`Failed to load image: ${imageUrl}`);
                        e.currentTarget.style.display = 'none';
                    }}
                />
            );
        }
        return <span>{entry.kanji}</span>;
    }

    return (
        <div class="flex flex-col w-full h-full bg-gray-50">
            <Navbar/>
            <div class="relative w-full h-full flex-1">
                <div class="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 absolute overflow-y-auto h-full p-2 sm:px-6 sm:pt-6 w-full pb-24">
                    {entries().map((entry: Entry) => (
                        <div class={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${entry.is_radical ? 'border-l-4 border-blue-400 sm:border-l-0' : ''}`}>
                            <div class="p-3 sm:p-4 flex items-center justify-between">
                                <div class="flex items-center gap-2 sm:gap-6">
                                    <span class="text-gray-400 font-medium text-sm sm:text-base w-6 sm:w-8">
                                        {entry.index}.
                                    </span>    
                                    <button 
                                        onClick={() => on_kanji_click(entry)}
                                        class="text-xl sm:text-2xl font-semibold text-gray-700 hover:text-blue-600 transition-colors flex items-center justify-center min-w-[1.5rem] sm:min-w-[2rem]"
                                    >
                                        {render_kanji_content(entry)}
                                    </button>
                                    <span class="text-gray-600 text-sm sm:text-base break-words">
                                        {entry.meaning}
                                    </span>
                                </div>
                                {entry.is_radical && 
                                    <span class="hidden sm:inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded ml-2">
                                        Radical
                                    </span>
                                }
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Kanjis;
