import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useOfflineStore } from '../../stores/offlineStore';

interface FlashcardDeckProps {
  subject: string;
}

export function FlashcardDeck({ subject }: FlashcardDeckProps) {
  const { getPack } = useOfflineStore();
  const [cards, setCards] = useState<Array<{ front: string; back: string }>>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    getPack(subject).then((pack) => {
      if (pack) setCards(pack.flashcards);
    });
  }, [subject]);

  if (cards.length === 0) {
    return <div className="p-4 text-sm text-slate-500 text-center">No flashcards available. Download the pack first.</div>;
  }

  const card = cards[idx];

  return (
    <div className="space-y-4 p-4">
      <div
        onClick={() => setFlipped(!flipped)}
        className="min-h-[200px] flex items-center justify-center p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer transition-all hover:shadow-lg"
      >
        <p className="text-center text-lg text-slate-700 dark:text-slate-200">
          {flipped ? card.back : card.front}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => { setIdx(Math.max(0, idx - 1)); setFlipped(false); }}
          disabled={idx === 0}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-xs text-slate-500">{idx + 1} / {cards.length}</span>
        <button
          onClick={() => { setIdx(Math.min(cards.length - 1, idx + 1)); setFlipped(false); }}
          disabled={idx === cards.length - 1}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="text-[10px] text-slate-400 text-center">Tap card to flip</p>
    </div>
  );
}
