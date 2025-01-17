use serde::{Deserialize, Serialize};
use std::{collections::HashSet, sync::Mutex};

use super::get_kanji_list;


#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    pub message: String,
}

impl From<std::io::Error> for CommandError {
    fn from(error: std::io::Error) -> Self {
        CommandError {
            message: error.to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct KanjiListing {
    pub index: i32,
    pub kanji: String,
    pub meaning: String,
    pub is_radical: bool,
    pub link: String,
    pub has_image: bool,
}

impl KanjiListing {
    // Search by exact index
    pub fn search_by_index<'a>(kanjis: &'a [KanjiListing], target_index: i32) -> Option<&'a KanjiListing> {
        kanjis.iter().find(|k| k.index == target_index)
    }

    pub fn search_by_kanji<'a>(kanjis: &'a [KanjiListing], target_kanji: &str) -> Option<&'a KanjiListing> {
        kanjis.iter().find(|k| k.kanji == target_kanji)
    }

    pub fn search_by_meaning<'a>(kanjis: &'a [KanjiListing], target_meaning: &str) -> Vec<&'a KanjiListing> {
        let search_term = target_meaning.to_lowercase();
        kanjis
            .iter()
            .filter(|k| k.meaning.to_lowercase().contains(&search_term))
            .collect()
    }

    // Combined search function that returns unique results matching any criteria
    pub fn search<'a>(
        kanjis: &'a [KanjiListing],
        index: Option<i32>,
        kanji: Option<&str>,
        meaning: Option<&str>,
    ) -> Vec<&'a KanjiListing> {
        let mut results = HashSet::new();

        // Search by index if provided
        if let Some(idx) = index {
            if let Some(result) = Self::search_by_index(kanjis, idx) {
                results.insert(result);
            }
        }

        // Search by kanji if provided
        if let Some(k) = kanji {
            if let Some(result) = Self::search_by_kanji(kanjis, k) {
                results.insert(result);
            }
        }

        // Search by meaning if provided
        if let Some(m) = meaning {
            for result in Self::search_by_meaning(kanjis, m) {
                results.insert(result);
            }
        }

        results.into_iter().collect()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KanjiDetail {
    pub index: u32,
    pub kanji: String,
    pub meaning: String,
    pub tags: Vec<Tag>,
    pub description: Option<String>,
    pub onyomi: Vec<(String, String)>, // (reading, description)
    pub kunyomi: Vec<KunyomiEntry>,
    pub jukugo : Vec<Jukugo>,
    pub mnemonic: Option<String>,
    pub usefulness: u8,
    pub used_in: Vec<UsedIn>,
    pub synonyms: Vec<SynonymEntry>,
    pub prev_link: Option<String>,
    pub next_link: Option<String>,
    pub breakdown: String,
    pub lookalikes: Vec<Lookalike>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KunyomiEntry {
    pub reading: String,
    pub meaning: String,
    pub tags: Vec<String>,
    pub usefulness: u8
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Jukugo  {
    pub japanese: String,
    pub reading: String,
    pub english: String,
    pub tags: Vec<Tag>,
    pub usefulness: u8,
    pub components: Vec<Component>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SynonymEntry {
    pub japanese: String,
    pub english: String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Component {
    pub kanji: String,
    pub meaning: String,
    pub href: String,
    pub image_src: Option<String>
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Tag
{
    pub name: String,
    pub link: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsedIn
{
    pub kanji: String,
    pub link: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Lookalike {
    pub kanji: String,
    pub kanji_link: String,
    pub meaning: String,
    pub hint: String,
    pub radical: String,
    pub radical_link: String,
}

pub struct KanjiDatabase {
    pub kanjis: Vec<KanjiListing>,
}

impl KanjiDatabase {
    // These methods now just delegate to the KanjiListing implementations
    pub fn search(
        &self,
        index: Option<i32>,
        kanji: Option<&str>,
        meaning: Option<&str>
    ) -> Vec<&KanjiListing> {
        KanjiListing::search(&self.kanjis, index, kanji, meaning)
    }
}

pub struct KanjiDatabaseState(pub Mutex<KanjiDatabase>);

impl KanjiDatabaseState {
    pub fn new(db: KanjiDatabase) -> Self {
        Self(Mutex::new(db))
    }
}
