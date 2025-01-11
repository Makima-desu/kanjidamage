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
}



function Kanjis() {
	const navigate = useNavigate();
    const [entries, set_entries] = createSignal([])

    invoke("get_kanji_list").then((kanji: any) => {
        set_entries(kanji)
    })

	function on_kanji_click(url: string) 
	{
		// First fetch the kanji details
		invoke("get_kanji", {url: url}).then((response) => {
			// Then navigate to the kanji detail page with the data
			navigate(`/kanji/${encodeURIComponent(url)}`, { 
				state: { kanji: response }
			});
		});
	}

    return (
        <div class="flex flex-col w-full h-full bg-gray-50">
            <Navbar/>
            <div class="relative w-full h-full flex-1">
                <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 absolute overflow-y-auto h-full px-6 pt-6 w-full pb-24">
                    {entries().map((entry: Entry) => (
                        <div class="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                            <div class="p-4 flex items-center justify-between">
                                <div class="flex items-center gap-6">
                                    <span class="text-gray-400 font-medium w-8">{entry.index}.</span>	
                                    <button 
                                        onClick={() => on_kanji_click(entry.link)}
                                        class="text-2xl font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                                    >
                                        {entry.kanji}
                                    </button>
                                    <span class="text-gray-600">{entry.meaning}</span>
                                </div>
                                {entry.is_radical && 
                                    <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded">
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