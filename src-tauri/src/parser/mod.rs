pub mod models;
use std::fs::{self, File};
use std::io::{self, BufRead, Write};
use std::path::Path;
use anyhow::Result;
use scraper::selector::CssLocalName;
use scraper::{Element, Node};



use models::{CommandError, Component, Jukugo, KanjiDatabaseState, KanjiDetail, KanjiListing, KunyomiEntry, Lookalike, SynonymEntry, Tag, UsedIn};
use scraper::{CaseSensitivity, ElementRef, Html, Selector};
use tauri::State;

#[tauri::command]
pub async fn fetch_and_save_kanji_list() -> Result<Vec<KanjiListing>, String> {
    let file_path = "kanji_list.json";
    
    // Check if file exists
    if Path::new(file_path).exists() {
        // Read and parse existing file
        return match fs::read_to_string(file_path) {
            Ok(contents) => {
                serde_json::from_str(&contents)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))
            }
            Err(e) => Err(format!("Failed to read file: {}", e))
        };
    }
    
    // If file doesn't exist, fetch from web
    let client = reqwest::Client::new();
    let response = client
        .get("https://www.kanjidamage.com/kanji")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch data: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Failed to get response text: {}", e))?;
    
    let document = scraper::Html::parse_document(&response);
    let row_selector = scraper::Selector::parse("tr").unwrap();
    let td_selector = scraper::Selector::parse("td").unwrap();
    let kanji_char_selector = scraper::Selector::parse("span.kanji_character").unwrap();
    let img_selector = scraper::Selector::parse("img").unwrap();
    let link_selector = scraper::Selector::parse("a").unwrap();
    
    let mut entries = Vec::new();
    
    for row in document.select(&row_selector) {
        let tds: Vec<_> = row.select(&td_selector).collect();
        if tds.len() >= 4 {
            let index = tds[0].text()
                .next()
                .and_then(|t| t.trim().parse::<i32>().ok())
                .unwrap_or(0);
                
            let is_radical = tds[1].select(&img_selector).next().is_some();
            
            let (kanji, link, has_image) = if let Some(kanji_span) = tds[2].select(&kanji_char_selector).next() {
                let k = kanji_span.text().collect::<String>();
                let l = tds[2].select(&link_selector)
                    .next()
                    .and_then(|a| a.value().attr("href"))
                    .map(|href| format!("https://www.kanjidamage.com{}", href))
                    .unwrap_or_default();
                (k, l, false)
            } else if let Some(img) = tds[2].select(&img_selector).next() {
                let src = img.value().attr("src").unwrap_or_default();
                let l = tds[2].select(&link_selector)
                    .next()
                    .and_then(|a| a.value().attr("href"))
                    .map(|href| format!("https://www.kanjidamage.com{}", href))
                    .unwrap_or_default();
                (format!("https://www.kanjidamage.com{}", src), l, true)
            } else {
                let k = tds[2].text().collect::<String>().trim().to_string();
                let l = tds[2].select(&link_selector)
                    .next()
                    .and_then(|a| a.value().attr("href"))
                    .map(|href| format!("https://www.kanjidamage.com{}", href))
                    .unwrap_or_default();
                (k, l, false)
            };
            
            let meaning = tds[3].text().next().unwrap_or("").trim().to_string();
            
            if !meaning.is_empty() && !link.is_empty() {
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
    
    // Save to file
    let json = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
    File::create(file_path)
        .map_err(|e| format!("Failed to create file: {}", e))?
        .write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(entries)
}


#[tauri::command]
pub async fn get_kanji_list() -> Result<Vec<KanjiListing>, String> {
    // Read the JSON file
    let file_content = std::fs::read_to_string("kanji_list.json")
        .map_err(|e| e.to_string())?;
    
    // Parse the JSON content
    let kanji_list: Vec<KanjiListing> = serde_json::from_str(&file_content)
        .map_err(|e| e.to_string())?;
    
    Ok(kanji_list)
}

#[tauri::command]
pub async fn get_kanji_list_v1() -> Result<Vec<KanjiListing>, String> {
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
    let file_path = "kanji_details.json";
    let kanji_id = url.split('/').last().unwrap_or_default();
    
    // Try to read from local file first
    if Path::new(file_path).exists() {
        let file_content = fs::read_to_string(file_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
            
        let kanji_map: serde_json::Map<String, serde_json::Value> = 
            serde_json::from_str(&file_content)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
            
        // Check if kanji exists in the map
        if let Some(kanji_value) = kanji_map.get(kanji_id) {
            return serde_json::from_value(kanji_value.clone())
                .map_err(|e| format!("Failed to parse kanji data: {}", e));
        }
    }

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
    let kanji_span_selector = Selector::parse("span.kanji_character").unwrap();
    let img_selector = Selector::parse("img").unwrap();
    
    let kanji = document.select(&h1_selector)
        .next()
        .and_then(|el| el.select(&kanji_span_selector).next())
        .and_then(|span| {
            // First try to find img and get its src
            span.select(&img_selector)
                .next()
                .and_then(|img| img.value().attr("src"))
                .map(String::from)
                // If no img found, try to get text content
                .or_else(|| {
                    let text = span.text().collect::<String>();
                    if text.is_empty() { None } else { Some(text) }
                })
        })
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
                                        href: format!("https://www.kanjidamage.com{}", current_href.clone()),
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

    let used_in = document
        .select(&Selector::parse("ul.lacidar li a").unwrap())
        .map(|a| {
            let text_content = a.text().collect::<String>().trim().to_string();
            let kanji = if !text_content.is_empty() {
                text_content
            } else {
                a.select(&Selector::parse("img").unwrap())
                    .next()
                    .and_then(|img| img.value().attr("src"))
                    .map(|src| format!("https://www.kanjidamage.com{}", src))
                    .unwrap_or_default()
            };
            
            UsedIn {
                kanji,
                link: a.value().attr("href").unwrap_or_default().to_string()
            }
        })
        .collect::<Vec<UsedIn>>();
    
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

    let lookalikes = document
        .select(&Selector::parse("table.table tr").unwrap())
        .skip(1) // Skip header row
        .filter_map(|row| {
            let cells: Vec<ElementRef> = row.select(&Selector::parse("td").unwrap()).collect();
            if cells.len() >= 4 {
                let kanji_anchor = cells[0]
                    .select(&Selector::parse("a.kanji_character").unwrap())
                    .next();
                    
                let kanji_link = kanji_anchor
                    .and_then(|a| a.value().attr("href"))
                    .map(|href| format!("https://www.kanjidamage.com{}", href))
                    .unwrap_or_default();
    
                let kanji = kanji_anchor
                    .map(|a| {
                        a.select(&Selector::parse("img").unwrap())
                            .next()
                            .and_then(|img| img.value().attr("src"))
                            .map(|src| format!("https://www.kanjidamage.com{}", src))
                            .unwrap_or_else(|| a.text().collect::<String>())
                    })
                    .unwrap_or_default();
    
                let radical_anchor = cells[3]
                    .select(&Selector::parse("a").unwrap())
                    .next();
    
                let radical = radical_anchor
                    .map(|a| {
                        a.select(&Selector::parse("img").unwrap())
                            .next()
                            .and_then(|img| img.value().attr("src"))
                            .map(|src| format!("https://www.kanjidamage.com{}", src))
                            .unwrap_or_else(|| a.text().collect::<String>())
                    })
                    .unwrap_or_default();
    
                let radical_link = radical_anchor
                    .and_then(|a| a.value().attr("href"))
                    .map(|href| format!("https://www.kanjidamage.com{}", href))
                    .unwrap_or_default();
    
                Some(Lookalike {
                    kanji,
                    kanji_link,
                    meaning: cells[1].text().collect::<String>(),
                    hint: cells[2].text().collect::<String>(),
                    radical,
                    radical_link,
                })
            } else {
                None
            }
        })
        .collect::<Vec<Lookalike>>();

        let kanji_detail = KanjiDetail {
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
            lookalikes,
        };
        
        // Save to local file
        let mut kanji_map = if Path::new(file_path).exists() {
            let content = fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse JSON: {}", e))?
        } else {
            serde_json::Map::new()
        };
        
        kanji_map.insert(
            kanji_id.to_string(),
            serde_json::to_value(&kanji_detail)
                .map_err(|e| format!("Failed to serialize kanji: {}", e))?
        );
        
        let json = serde_json::to_string_pretty(&kanji_map)
            .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
            
        fs::write(file_path, json)
            .map_err(|e| format!("Failed to write file: {}", e))?;
        
        Ok(kanji_detail)
}

#[tauri::command]
pub async fn search_kanji(
    state: State<'_, KanjiDatabaseState>,
    index: Option<i32>,
    kanji: Option<String>,
    meaning: Option<String>
) -> Result<Vec<KanjiListing>, String> {
    let db = state.0.lock().map_err(|_| "Failed to lock database".to_string())?;
    let results = db.search(
        index,
        kanji.as_deref(),
        meaning.as_deref()
    );
    
    Ok(results.into_iter().cloned().collect())
}