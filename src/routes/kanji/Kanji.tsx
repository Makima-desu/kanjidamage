import { createSignal, onMount } from "solid-js";
import Navbar from "../../navbar/Navbar"
import { useParams } from "@solidjs/router";
import { invoke } from "@tauri-apps/api/core";

function Kanji()
{
    const params = useParams();
    const id = params.id; // Gets 'one' from /kanji/one

    const [kanji, set_kanji] = createSignal<any>()

    invoke("get_kanji").then((kanji: any) => 
    {
        console.log(kanji)
        // set_kanji(kanji)
    })

    return (
        <div class="w-full flex flex-col">
            <div>
                <Navbar />
            </div>
            <div class="relative flex w-full h-full">
                {/* {kanji()} */}
                kanjip[age]
            </div>
        </div>
    )
}

export default Kanji