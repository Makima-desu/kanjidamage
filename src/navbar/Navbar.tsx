import { A } from "@solidjs/router"

function Navbar() 
{
    return (
        <div class="p-1 flex bg-gray-300 justify-evenly select-none font-bold items-center">
                <A href="/" class={``}>Home</A>
                <A href="/kanjis">Kanjis</A>
                <A href="/practice">Practice</A>
            </div>
    )
}

export default Navbar