/* @refresh reload */
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import "./App.css";


import Home from "./routes/home/Home";
import Kanji from "./routes/kanji/Kanji";
import Kanjis from "./routes/kanjis/Kanjis";

render(
    () => (
        <Router>
            <Route path="/" component={Home} /> {/* Start practice or learn new number of kanji */}
            <Route path="/kanji/:url" component={Kanji} /> {/* kanji information */}
            <Route path="/kanjis" component={Kanjis}/> {/* list of all kanjis in order */}
            <Route path="/practice" /> {/* practice learned kanji */}
        </Router>
    ),
    document.getElementById("root") as HTMLElement
);
    