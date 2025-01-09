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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KanjiDetail {
    pub kanji: String,
    pub meaning: String,
    pub onyomi: Vec<String>,
    pub kunyomi: Vec<KunyomiEntry>,
    pub examples: Vec<Example>,
    pub mnemonic: Option<String>,
    pub usefulness: u8
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KunyomiEntry {
    pub reading: String,
    pub meaning: String,
    pub usefulness: u8
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Example {
    pub japanese: String,
    pub reading: String,
    pub english: String,
    pub usefulness: u8,
    pub components: Vec<String>
}