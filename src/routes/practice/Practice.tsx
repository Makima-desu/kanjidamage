import { createSignal, createEffect, Show, For } from 'solid-js';
import { invoke } from "@tauri-apps/api/core";
import Navbar from '../../navbar/Navbar';
import * as wanakana from 'wanakana';

interface PracticeItem {
    kanji: string;
    onyomi: [string, string][];
    kunyomi: Array<{ reading: string; description: string }>;
    meaning: string;
    mnemonic: string | null;
    breakdown: string;
    lookalikes: Array<{ kanji: string; meaning: string }>;
    jukugo: Array<{
        japanese: string;
        reading: string;
        english: string;
    }>;
}

const InfoSection = (props: { 
  title: string, 
  children: any, 
  isOpen: boolean, 
  onToggle: () => void,
  available: boolean 
}) => {
  return (
    <Show when={props.available}>
      <div class="border rounded-md mt-4">
        <button
          onClick={props.onToggle}
          class="w-full px-4 py-2 text-left flex justify-between items-center bg-gray-50 hover:bg-gray-100 rounded-t-md"
        >
          <span class="font-medium">{props.title}</span>
          <span class={`transform transition-transform ${props.isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        <Show when={props.isOpen}>
          <div class="p-4 border-t">
            {props.children}
          </div>
        </Show>
      </div>
    </Show>
  );
};

function Practice() {
  const [practicePool, setPracticePool] = createSignal<PracticeItem[]>([]);
  const [currentItem, setCurrentItem] = createSignal<PracticeItem | null>(null);
  const [isCorrect, setIsCorrect] = createSignal<boolean | null>(null);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [answers, setAnswers] = createSignal({
    meaning: '',
    onyomi: '',
    kunyomi: ''
  });
  const [mnemonicOpen, setMnemonicOpen] = createSignal(false);
  const [componentsOpen, setComponentsOpen] = createSignal(false);
  const [similarKanjiOpen, setSimilarKanjiOpen] = createSignal(false);
  const [vocabularyOpen, setVocabularyOpen] = createSignal(false);

  let kunyomiInputRef: HTMLInputElement | undefined;

  createEffect(() => {
    if (kunyomiInputRef) {
      wanakana.bind(kunyomiInputRef, {
        IMEMode: true,
        customKanaMapping: { nn: 'ん' }
      });

      return () => {
        if (kunyomiInputRef) {
          wanakana.unbind(kunyomiInputRef);
        }
      };
    }
  });


  createEffect(async () => {
    try {
      const pool = await invoke<PracticeItem[]>('initialize_practice_pool');
      setPracticePool(pool);
      if (pool.length > 0) {
        setCurrentItem(pool[0]);
      }
    } catch (error) {
      console.error('Failed to initialize practice pool:', error);
    }
  });

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const current = currentItem();
    if (!current) return;

    const meaningCorrect = current.meaning ? 
      answers().meaning.toLowerCase().trim() === current.meaning.toLowerCase().trim() : true;
    const onyomiCorrect = current.onyomi && current.onyomi.length > 0 ? 
      current.onyomi.some(([reading]) => reading.toLowerCase().trim() === answers().onyomi.toLowerCase().trim()) : true;
    const kunyomiCorrect = current.kunyomi && current.kunyomi.length > 0 ? 
      current.kunyomi.some(entry => entry.reading === answers().kunyomi) : true;

    setIsCorrect(meaningCorrect && onyomiCorrect && kunyomiCorrect);
  };

  const handleNext = () => {
    const nextIndex = currentIndex() + 1;
    if (nextIndex < practicePool().length) {
      setCurrentIndex(nextIndex);
      setCurrentItem(practicePool()[nextIndex]);
      setAnswers({ meaning: '', onyomi: '', kunyomi: '' });
      setIsCorrect(null);
      setMnemonicOpen(false);
      setComponentsOpen(false);
      setSimilarKanjiOpen(false);
      setVocabularyOpen(false);
    }
  };

  const handleKunyomiInput = (e: InputEvent) => {
    const input = (e.target as HTMLInputElement).value;
    const hiragana = wanakana.toHiragana(input, {
      IMEMode: true,
      useObsoleteKana: false,
      customKanaMapping: { nn: 'ん' }
    });
    setAnswers({...answers(), kunyomi: hiragana});
  };

  return (
    <div class="min-h-screen bg-gray-100 w-full overflow-y-auto">
      <Navbar />
      <div class="container mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-lg shadow-lg p-6">
            <Show
              when={currentItem()}
              fallback={
                <div class="text-center text-gray-600">
                  No kanji available for practice
                </div>
              }
            >
              <div class="text-center mb-8">
                <div class="text-8xl mb-4 font-bold">
                  {currentItem()!.kanji.startsWith('/') ? (
                    <img 
                      src={`https://www.kanjidamage.com/${currentItem()!.kanji}`} 
                      alt="Kanji character"
                      class="h-[1em] w-auto inline-block"
                      style="object-fit: contain"
                    />
                  ) : (
                    currentItem()!.kanji
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} class="space-y-4">
                <div class="space-y-4">
                  <Show when={currentItem()?.meaning}>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Meaning
                      </label>
                      <input
                        type="text"
                        value={answers().meaning}
                        onInput={(e) => setAnswers({...answers(), meaning: e.currentTarget.value})}
                        class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter the meaning..."
                        disabled={isCorrect()!}
                      />
                    </div>
                  </Show>
                  
                  <Show when={currentItem()?.onyomi && currentItem()?.onyomi.length! > 0}>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        On'yomi
                      </label>
                      <input
                        type="text"
                        value={answers().onyomi}
                        onInput={(e) => setAnswers({...answers(), onyomi: e.currentTarget.value})}
                        class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter the on'yomi reading..."
                        disabled={isCorrect()!}
                      />
                    </div>
                  </Show>

                  <Show when={currentItem()?.kunyomi && currentItem()?.kunyomi.length! > 0}>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">
                        Kun'yomi
                      </label>
                      <input
                        type="text"
                        value={answers().kunyomi}
                        onInput={handleKunyomiInput}
                        class="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter the kun'yomi reading..."
                        disabled={isCorrect()!}
                        />
                    </div>
                  </Show>
                </div>

                <Show
                  when={!isCorrect()}
                  fallback={
                    <button
                      type="button"
                      onClick={handleNext}
                      class="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600 transition-colors"
                    >
                      Next Kanji
                    </button>
                  }
                >
                  <button
                    type="submit"
                    class="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Check Answers
                  </button>
                </Show>
              </form>

              <Show when={isCorrect() !== null}>
                <div
                  class={`mt-4 p-3 rounded-md text-center ${
                    isCorrect()
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isCorrect() ? 'All correct!' : 'Try again!'}
                </div>

                <div class="mt-6">
                  <InfoSection 
                    title="Mnemonic" 
                    isOpen={mnemonicOpen()} 
                    onToggle={() => setMnemonicOpen(!mnemonicOpen())}
                    available={!!currentItem()?.mnemonic}
                  >
                    <div class="prose prose-sm max-w-none"
                      innerHTML={currentItem()?.mnemonic || ""}
                    />
                  </InfoSection>

                  <InfoSection 
                    title="Components" 
                    isOpen={componentsOpen()} 
                    onToggle={() => setComponentsOpen(!componentsOpen())}
                    available={!!currentItem()?.breakdown && currentItem()?.breakdown.trim().length! > 0}
                  >
                    <div class="prose prose-sm max-w-none" 
                      innerHTML={currentItem()?.breakdown.trim()}
                    />
                  </InfoSection>

                  <InfoSection 
                    title="Similar Kanji" 
                    isOpen={similarKanjiOpen()} 
                    onToggle={() => setSimilarKanjiOpen(!similarKanjiOpen())}
                    available={currentItem()?.lookalikes! && currentItem()?.lookalikes!.length! > 0}
                  >
                    <div class="grid grid-cols-2 gap-4">
                      <For each={currentItem()?.lookalikes}>
                        {(lookalike) => (
                          <div class="flex items-center space-x-2">
                            <span class="text-2xl">{lookalike.kanji}</span>
                            <span class="text-sm text-gray-600">{lookalike.meaning}</span>
                          </div>
                        )}
                      </For>
                    </div>
                  </InfoSection>

                  <InfoSection 
                    title="Vocabulary" 
                    isOpen={vocabularyOpen()} 
                    onToggle={() => setVocabularyOpen(!vocabularyOpen())}
                    available={currentItem()?.jukugo! && currentItem()?.jukugo!.length! > 0}
                  >
                    <div class="space-y-3">
                      <For each={currentItem()?.jukugo}>
                        {(word) => (
                          <div class="border-b pb-2">
                            <div class="font-medium">{word.japanese}</div>
                            <div class="text-sm text-gray-600">{word.reading}</div>
                            <div class="text-sm">{word.english}</div>
                          </div>
                        )}
                      </For>
                    </div>
                  </InfoSection>
                </div>
              </Show>

              <div class="mt-6 text-center text-gray-600">
                Kanji {currentIndex() + 1} of {practicePool().length}
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Practice;
