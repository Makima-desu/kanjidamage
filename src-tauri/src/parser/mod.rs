mod models;
use std::fs::File;
use std::io::{self, BufRead};

use models::{Jukugo, KanjiDetail, KanjiListing, KunyomiEntry};
use scraper::{ElementRef, Html, Selector};

#[tauri::command]
pub async fn get_kanji_list() -> Result<Vec<KanjiListing>, String> {
    let file = include_str!("kanjis.txt");
    let document = scraper::Html::parse_document(file);
    let row_selector = scraper::Selector::parse("tr").unwrap();
    let td_selector = scraper::Selector::parse("td").unwrap();
    
    let mut entries = Vec::new();
    
    for row in document.select(&row_selector) {
        let tds: Vec<_> = row.select(&td_selector).collect();
        if tds.len() >= 4 {
            let index = tds[0].text()
                .next()
                .and_then(|t| t.trim().parse::<i32>().ok())
                .unwrap_or(0);
                
            let is_radical = tds[1].select(&scraper::Selector::parse("img").unwrap()).next().is_some();
            
            if let Some(link_element) = tds[2].select(&scraper::Selector::parse("a").unwrap()).next() {
                let kanji = link_element.text().collect::<String>();
                let link = format!("https://www.kanjidamage.com{}", 
                    link_element.value().attr("href").unwrap_or(""));
                let meaning = tds[3].text().next().unwrap_or("").trim().to_string();
                
                if !kanji.is_empty() && !meaning.is_empty() {
                    entries.push(KanjiListing {
                        index,
                        kanji,
                        meaning,
                        is_radical,
                        link
                    });
                }
            }
        }
    }
    
    Ok(entries)
}

#[tauri::command]
pub async fn get_kanji(url: String) -> Result<KanjiDetail, String> {
    let client = reqwest::Client::new();
    let response = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;
        
    let document = Html::parse_document(&response);
    
    // Get kanji and meaning from h1
    let h1_selector = Selector::parse("h1").unwrap();
    let kanji = document.select(&h1_selector)
        .next()
        .and_then(|el| el.select(&Selector::parse("span.kanji_character").unwrap()).next())
        .map(|el| el.text().collect::<String>())
        .unwrap_or_default();
        
    let meaning = document.select(&h1_selector)
        .next()
        .and_then(|el| el.select(&Selector::parse("span.translation").unwrap()).next())
        .map(|el| el.text().collect::<String>())
        .unwrap_or_default();

    // Get usefulness stars
    let stars = document.select(&Selector::parse("span.usefulness-stars").unwrap())
        .next()
        .map(|el| el.text().collect::<String>().matches('★').count() as u8)
        .unwrap_or(0);
    
    // Get onyomi with description
    let mut onyomi = Vec::new();
    let onyomi_selector = Selector::parse("tr td .onyomi").unwrap();
    let onyomi_desc_selector = Selector::parse("tr td p").unwrap();
    
    if let Some(onyomi_el) = document.select(&onyomi_selector).next() {
        let reading = onyomi_el.text().collect::<String>();
        let description = document.select(&onyomi_desc_selector)
            .next()
            .map(|el| el.text().collect::<String>())
            .unwrap_or_default();
        onyomi.push((reading, description));
    }

    let mut kunyomi = Vec::new();
    let mut in_kunyomi_section = false;
    
    for element in document.select(&Selector::parse("h2, tr").unwrap()) {
        // Check if we hit a h2 tag
        if element.value().name() == "h2" {
            let section_text = element.text().collect::<String>();
            if section_text == "Kunyomi" {
                in_kunyomi_section = true;
                continue;
            }
            if section_text == "Jukugo" {
                break;
            }
        }
        
        // Only process table rows when in Kunyomi section
        if in_kunyomi_section && element.value().name() == "tr" {
            if let Some(kun) = element.select(&Selector::parse("span.kanji_character").unwrap()).next() {
                let reading = kun.text().collect::<String>();
                let meaning = element.select(&Selector::parse("td").unwrap())
                    .nth(1)
                    .map(|td| td.text().collect::<String>())
                    .unwrap_or_default();
                let stars = element.select(&Selector::parse("span.usefulness-stars").unwrap())
                    .next()
                    .map(|el| el.text().collect::<String>().matches('★').count() as u8)
                    .unwrap_or(0);
                    
                if !reading.is_empty() {
                    kunyomi.push(KunyomiEntry {
                        reading,
                        meaning,
                        usefulness: stars
                    });
                }
            }
        }
    }
    
    // Get examples (jukugo)
    let mut jukugo = Vec::new();
    for row in document.select(&Selector::parse("table.definition tr").unwrap()) {
        if let Some(ruby) = row.select(&Selector::parse("ruby").unwrap()).next() {
            let japanese = ruby.select(&Selector::parse("span.kanji_character").unwrap())
                .next()
                .map(|el| el.text().collect::<String>())
                .unwrap_or_default();
                
            let reading = ruby.select(&Selector::parse("rt").unwrap())
                .next()
                .map(|el| el.text().collect::<String>())
                .unwrap_or_default();
                
            let english = row.select(&Selector::parse("td").unwrap())
                .nth(1)
                .map(|td| td.text().collect::<String>())
                .unwrap_or_default();
                
            let stars = row.select(&Selector::parse("span.usefulness-stars").unwrap())
                .next()
                .map(|el| el.text().collect::<String>().matches('★').count() as u8)
                .unwrap_or(0);
                
            let components = row.select(&Selector::parse("a.component").unwrap())
                .map(|el| el.text().collect::<String>())
                .collect();
    
            if !japanese.is_empty() {
                jukugo.push(Jukugo {
                    japanese,
                    reading,
                    english,
                    usefulness: stars,
                    components
                });
            }
        }
    }

    // Get mnemonic
    let mnemonic = document
    .select(&Selector::parse("h2").unwrap())
    .find(|h2| h2.text().collect::<String>().contains("Mnemonic"))
    .and_then(|_| {
        let mnemonic_selector = Selector::parse("h2 + table.definition td p").unwrap();
        document.select(&mnemonic_selector)
            .next()
            .map(|p| p.text().collect::<String>().trim().to_string())
    });

    Ok(KanjiDetail {
        kanji,
        meaning,
        onyomi,
        kunyomi,
        jukugo,
        mnemonic,
        usefulness: stars
    })
}
