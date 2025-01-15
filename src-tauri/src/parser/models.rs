use serde::{Deserialize, Serialize};

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KanjiListing {
    pub index: i32,
    pub kanji: String,
    pub meaning: String,
    pub is_radical: bool,
    pub link: String,
    pub has_image: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KanjiDetail {
    pub index: u32,
    pub kanji: String,
    pub meaning: String,
    pub description: Option<String>,
    pub onyomi: Vec<(String, String)>, // (reading, description)
    pub kunyomi: Vec<KunyomiEntry>,
    pub jukugo : Vec<Jukugo>,
    pub mnemonic: Option<String>,
    pub usefulness: u8,
    pub used_in: Vec<String>,
    pub synonyms: Vec<SynonymEntry>,
    pub prev_link: Option<String>,
    pub next_link: Option<String>,
    pub breakdown: String
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
    pub tags: Vec<String>,
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