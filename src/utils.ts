export interface KanjiDetail {
    index: number,
    kanji: string;
    link: string
    meaning: string;
    tags: any[],
    description: string,
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
        components: any[];
    }[];
    mnemonic: string | null;
    usefulness: number;
    used_in: string[];
    synonyms: {
        japanese: string;
        english: string;
    }[];
    prev_link: string | null;
    next_link: string | null;
    breakdown: string;
    lookalikes: any[];
    practice: boolean;
}


export function handle_navigation(link: string | null | undefined, navigate: any)
{
    if (!link) return;
    const absoluteUrl = link.startsWith('http') 
        ? link 
        : `https://www.kanjidamage.com${link}`;
    navigate(`/kanji/${encodeURIComponent(absoluteUrl)}`);
};
