import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import Navbar from "../../navbar/Navbar";
import { A } from "@solidjs/router";


interface Entry
{
    index: number,
    kanji: string,
    meaning: string,
    is_radical: boolean,
    link: string,
}

function on_kanji_click(url: string)
{
	invoke("get_kanji", {url: url}).then((response) => 
		{
			console.log(response)
		})
}

function Kanjis() 
{
	const [entries, set_entries] = createSignal([])

	invoke("get_kanji_list").then((kanji: any) => 
	{
		set_entries(kanji)
	})

    return (
      <div class="w-full flex flex-col">
        <div>
          <Navbar/>
        </div>
        <div class="relative flex w-full h-full">
          <div class="absolute w-full h-full overflow-y-auto overflow-x-hidden">
              <ol class="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {entries().map((entry: Entry) =>
                  {
                    return (
                      <li class="mx-4 my-2.5 p-4 rounded-lg bg-gray-100 flex items-center">
                        <div class="flex gap-16 w-full items-center">
                          <span class="select-none">{entry.index}.</span>
						  {/* href={`/kanji/${entry.link}`} */}
                          <span onclick={() => on_kanji_click(entry.link)} class="text-blue-500 hover:bg-gray-200 px-1 rounded transition-all duration-150">{entry.kanji}</span>
                          <span>{entry.meaning}</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 13v-1h6V6h1v6h6v1h-6v6h-1v-6z"/></svg>
                      </li>
                    )
                  })}
              </ol>
          </div>
        </div>
      </div>
    )
}

export default Kanjis;
