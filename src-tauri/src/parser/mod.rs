mod models;
use std::fs::File;
use std::io::{self, BufRead};
use scraper::selector::CssLocalName;
use scraper::{Element, Node};



use models::{Component, Jukugo, KanjiDetail, KanjiListing, KunyomiEntry, SynonymEntry, Tag};
use scraper::{CaseSensitivity, ElementRef, Html, Selector};

#[tauri::command]
pub async fn get_kanji_list() -> Result<Vec<KanjiListing>, String> {
    let file = include_str!("kanjis.txt");
    let document = scraper::Html::parse_document(file);
    let row_selector = scraper::Selector::parse("tr").unwrap();
    let td_selector = scraper::Selector::parse("td").unwrap();
    let kanji_char_selector = scraper::Selector::parse("span.kanji_character").unwrap();
    let img_selector = scraper::Selector::parse("img").unwrap();
    
    let mut entries = Vec::new();
    
    for row in document.select(&row_selector) {
        let tds: Vec<_> = row.select(&td_selector).collect();
        if tds.len() >= 4 {
            let index = tds[0].text()
                .next()
                .and_then(|t| t.trim().parse::<i32>().ok())
                .unwrap_or(0);
                
            let is_radical = tds[1].select(&img_selector).next().is_some();
            
            // Get kanji character or image from the third column (tds[2])
            let (kanji, link, has_image) = if let Some(kanji_span) = tds[2].select(&kanji_char_selector).next() {
                // Case 1: Regular kanji character
                let k = kanji_span.text().collect::<String>();
                let l = tds[2].select(&scraper::Selector::parse("a").unwrap())
                    .next()
                    .map(|a| format!("https://www.kanjidamage.com{}", 
                        a.value().attr("href").unwrap_or("")))
                    .unwrap_or_else(|| format!("https://www.kanjidamage.com/kanji/{}", index));
                (k, l, false)
            } else if let Some(img) = tds[2].select(&img_selector).next() {
                // Case 2: Image kanji
                let src = img.value().attr("src").unwrap_or_default();
                let l = format!("https://www.kanjidamage.com/kanji/{}", index);
                (format!("https://www.kanjidamage.com{}", src), l, true)
            } else {
                // Case 3: Direct text content (fallback)
                let k = tds[2].text().collect::<String>().trim().to_string();
                let l = format!("https://www.kanjidamage.com/kanji/{}", index);
                (k, l, false)
            };
            
            let meaning = tds[3].text().next().unwrap_or("").trim().to_string();
            
            if !meaning.is_empty() {
                entries.push(KanjiListing {
                    index,
                    kanji,
                    meaning,
                    is_radical,
                    link,
                    has_image
                });
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

    let index = document
        .select(&Selector::parse("div.col-md-8.text-centered").unwrap())
        .next()
        .and_then(|el| {
            el.text()
                .collect::<String>()
                .trim()
                .replace("Number", "")
                .trim()
                .parse::<u32>()
                .ok()
        })
        .unwrap_or(0);
    
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

    let description = document
        .select(&Selector::parse("div.description").unwrap())
        .next()
        .map(|div| div.html());
    
    let container_selector = Selector::parse("div.col-md-4.text-righted").unwrap();
    let tag_selector = Selector::parse("a.label.label-info").unwrap();
        
    let tags: Vec<Tag> = document
        .select(&container_selector)
        .next()
        .map(|container| {
            container
                .select(&tag_selector)
                .map(|el| Tag {
                    name: el.text().collect::<String>(),
                    link: el.value().attr("href")
                        .unwrap_or_default()
                        .to_string(),
                })
                .collect()
        })
        .unwrap_or_default();
    
    // Find h1 and get its sibling components
    let mut breakdown = String::new();

    if let Some(h1_element) = document.select(&h1_selector).next() {
        let mut current = h1_element.next_sibling();
        
        while let Some(node) = current {
            if let Some(element_ref) = ElementRef::wrap(node) {
                breakdown.push_str(&element_ref.html());
            } else if let Some(text) = node.value().as_text() {
                breakdown.push_str(text);
            }
            current = node.next_sibling();
        }
    }
    // First find the Onyomi section
    let mut onyomi = Vec::new();

    // First find the Onyomi section
    if let Some(onyomi_table) = document
        .select(&Selector::parse("h2").unwrap())
        .find(|h2| h2.text().collect::<String>() == "Onyomi")
        .and_then(|h2| h2.next_sibling_element())
        .filter(|el| el.value().name() == "table") {
        
        // Get the first row of the table
        if let Some(first_row) = onyomi_table.select(&Selector::parse("tr").unwrap()).next() {
            let reading = first_row.select(&Selector::parse("td").unwrap())
                .next()
                .map(|td| td.html())
                .unwrap_or_default();
                
            let description = first_row.select(&Selector::parse("td").unwrap())
                .nth(1)
                .map(|td| td.html())  // Use html() instead of text()
                .unwrap_or_default();
                
            if !reading.is_empty() {
                onyomi.push((reading, description));
            }
        }
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
                .map(|td| {
                    td.children()
                        .take_while(|child| {
                            !matches!(child.value(), Node::Element(el) if el.has_class("label", CaseSensitivity::CaseSensitive))
                        })
                        .filter_map(|node| {
                            if let Node::Text(text) = node.value() {
                                Some(text.to_string())
                            } else {
                                None
                            }
                        })
                        .collect::<String>()
                        .trim()
                        .to_string()
                })
                .unwrap_or_default();
                
                // Extract tags
                let tags = element.select(&Selector::parse("td a.label").unwrap())
                    .map(|tag| tag.text().collect::<String>())
                    .collect::<Vec<String>>();
                    
                let stars = element.select(&Selector::parse("span.usefulness-stars").unwrap())
                    .next()
                    .map(|el| el.text().collect::<String>().matches('★').count() as u8)
                    .unwrap_or(0);
                    
                if !reading.is_empty() {
                    kunyomi.push(KunyomiEntry {
                        reading,
                        meaning,
                        tags,
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
                .map(|td| {
                    td.select(&Selector::parse("p").unwrap())
                        .next()
                        .map(|p| {
                            p.text()
                                .collect::<String>()
                                .split('★')
                                .next()
                                .unwrap_or("")
                                .trim()
                                .to_string()
                        })
                        .unwrap_or_default()
                })
                .unwrap_or_default();
                
            // Extract tags
            let tags = row.select(&Selector::parse("a.label.label-info").unwrap())
            .map(|tag| Tag {
                name: tag.text().collect::<String>(),
                link: tag.value().attr("href")
                    .unwrap_or_default()
                    .to_string(),
            })
            .collect::<Vec<Tag>>();
                
            let stars = row.select(&Selector::parse("span.usefulness-stars").unwrap())
                .next()
                .map(|el| el.text().collect::<String>().matches('★').count() as u8)
                .unwrap_or(0);
                
            let components = row.select(&Selector::parse("td").unwrap())
                .nth(1)
                .map(|td| {
                    let mut components = Vec::new();
                    let mut current_kanji = String::new();
                    let mut current_href = String::new();
                    
                    for node in td.select(&Selector::parse("p").unwrap())
                        .next()
                        .map(|p| p.children())
                        .into_iter()
                        .flatten() 
                    {
                        if let Some(element) = node.value().as_element() {
                            if element.has_class("component", CaseSensitivity::CaseSensitive) {
                                if let Some(element_ref) = ElementRef::wrap(node) {
                                    current_kanji = element_ref.text().collect::<String>();
                                    current_href = element.attr("href").unwrap_or_default().to_string();
                                }
                            }
                        } else if let Some(text) = node.value().as_text() {
                            if text.contains('(') && !current_kanji.is_empty() {
                                if let Some(meaning) = text.split('(').nth(1).and_then(|s| s.split(')').next()) {
                                    components.push(Component {
                                        kanji: current_kanji.clone(),
                                        meaning: meaning.to_string(),
                                        href: current_href.clone(),
                                        image_src: None,
                                    });
                                    current_kanji.clear();
                                    current_href.clear();
                                }
                            }
                        }
                    }
                    
                    components
                })
                .unwrap_or_default();
            
        
            if !japanese.is_empty() {
                jukugo.push(Jukugo {
                    japanese,
                    reading,
                    english,
                    tags,
                    usefulness: stars,
                    components,
                });
            }
        }
    }

    // Get mnemonic (modified to ensure it's separate from onyomi)
    let mnemonic = document
        .select(&Selector::parse("h2").unwrap())
        .find(|h2| h2.text().collect::<String>() == "Mnemonic")
        .and_then(|h2| h2.next_sibling_element())
        .and_then(|table| {
            table.select(&Selector::parse("tr td p").unwrap())
                .next()
                .map(|p: ElementRef<'_>| p.html())
        });
        // .and_then(|table| {
        //     table.select(&Selector::parse("tr td p").unwrap())
        //         .next()
        //         .map(|p: ElementRef<'_>| p.text().collect::<String>().trim().to_string())
        // });

    // Get "Used in" section
    let section = document
        .select(&Selector::parse("div.kanji-details section").unwrap())
        .find(|section| {
            section.select(&Selector::parse("h2").unwrap())
                .any(|h2| h2.text().collect::<String>().trim() == "Used in")
        });

    // Then get the list items if section found
    let used_in = document
    .select(&Selector::parse("ul.lacidar li a").unwrap())
    .map(|a| a.text().collect::<String>().trim().to_string())
    .filter(|s| !s.is_empty())
    .collect::<Vec<String>>();
    
    // Get "Synonyms" section
    let synonyms = document
    .select(&Selector::parse("table.table tr").unwrap())
    .filter_map(|row| {
        let td = row.select(&Selector::parse("td").unwrap()).next()?;
        let english = td.select(&Selector::parse("a").unwrap())
            .next()?
            .text()
            .collect::<String>()
            .trim()
            .to_string();
        
        // Get all text after the <br> tag
        let japanese = match td.children().find(|child| child.value().is_element() && child.value().as_element().unwrap().name() == "br") {
            Some(br) => br.next_sibling()
                .map_or(String::new(), |text| text.value().as_text().map_or(String::new(), |t| t.text.trim().to_string())),
            None => String::new()
        };

        if !english.is_empty() && !japanese.is_empty() {
            Some(SynonymEntry { english, japanese })
        } else {
            None
        }
    })
    .collect::<Vec<SynonymEntry>>();

    let prev_link = document
    .select(&Selector::parse("div.navigation-header div.col-md-2 a").unwrap())
    .next()
    .and_then(|a| a.value().attr("href"))
    .map(|href| href.to_string());

    let next_link = document
        .select(&Selector::parse("div.navigation-header div.col-md-2.text-righted a").unwrap())
        .next()
        .and_then(|a| a.value().attr("href"))
        .map(|href| href.to_string());

    Ok(KanjiDetail {
        index,
        kanji,
        meaning,
        tags,
        description,
        onyomi,
        kunyomi,
        jukugo,
        mnemonic,
        usefulness: stars,
        used_in,
        synonyms,
        prev_link,
        next_link,
        breakdown,
    })
}
