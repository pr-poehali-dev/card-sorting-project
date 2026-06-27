import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { CardItem, StageKind } from '@/lib/cards-data';

interface PlacedCard extends CardItem {
  x: number;
  y: number;
  z: number;
  rank: number | null; // 0-4 для ценностей (1-5), 0-2 для остальных
  flipped: boolean;
}

interface SortingBoardProps {
  deck: CardItem[];
  onComplete: (kept: CardItem[], ranked?: CardItem[]) => void;
  stageTitle: string;
  stageSubtitle: string;
  stageIndex: number;
  totalStages: number;
  kind: StageKind;
  flippable: boolean;
  keepLimit: number | null;
  selectedValues?: CardItem[]; // показывается на этапе вопросов
}

// Этап ценностей: 5 уровней (1–5), остальные: 3 уровня
const VALUE_RANK_COLORS = ['#16A34A', '#22C55E', '#F59E0B', '#F97316', '#EF4444'];
const VALUE_RANK_LABELS = ['1', '2', '3', '4', '5'];
const OTHER_RANK_COLORS = ['#16A34A', '#F59E0B', '#EF4444'];

export default function SortingBoard({
  deck,
  onComplete,
  stageTitle,
  stageSubtitle,
  stageIndex,
  totalStages,
  kind,
  flippable,
  keepLimit,
  selectedValues,
}: SortingBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<PlacedCard[]>([]);
  const [removed, setRemoved] = useState<CardItem[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  const [topZ, setTopZ] = useState(1);
  const offset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  const isValues = kind === 'values';
  const isBig = kind !== 'values';
  const cardW = isValues ? 96 : 210;
  const cardH = isValues ? 116 : 152;
  const maxRank = isValues ? 4 : 2;
  const rankColors = isValues ? VALUE_RANK_COLORS : OTHER_RANK_COLORS;
  const rankLabels = isValues ? VALUE_RANK_LABELS : ['В', 'С', 'Н'];

  // Вычисляем размер поля на основе количества карт
  const boardHeight = useMemo(() => {
    const cols = isValues ? 12 : 4;
    const rowH = isValues ? 132 : 170;
    const rows = Math.ceil(deck.length / cols);
    return Math.max(600, rows * rowH + 60);
  }, [deck.length, isValues]);

  useEffect(() => {
    const cols = isValues ? 12 : 4;
    const colW = isValues ? 108 : 228;
    const rowH = isValues ? 132 : 170;
    setCards(
      deck.map((c, i) => ({
        ...c,
        x: 16 + (i % cols) * colW,
        y: 16 + Math.floor(i / cols) * rowH,
        z: 1,
        rank: null,
        flipped: !flippable,
      }))
    );
    setRemoved([]);
    setTopZ(1);
  }, [deck, isValues, flippable]);

  const pointerToBoard = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current!.getBoundingClientRect();
    const scrollTop = boardRef.current!.scrollTop;
    return { x: clientX - rect.left, y: clientY - rect.top + scrollTop };
  }, []);

  const startDrag = (e: React.PointerEvent, card: PlacedCard) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = pointerToBoard(e.clientX, e.clientY);
    offset.current = { x: p.x - card.x, y: p.y - card.y };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const nz = topZ + 1;
    setTopZ(nz);
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, z: nz } : c)));
    setDragId(card.id);
    setMoved(false);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx > 4 || dy > 4) setMoved(true);
    const p = pointerToBoard(e.clientX, e.clientY);
    setCards((prev) =>
      prev.map((c) =>
        c.id === dragId ? { ...c, x: p.x - offset.current.x, y: p.y - offset.current.y } : c
      )
    );
  };

  const endDrag = (card: PlacedCard) => {
    if (!moved && flippable) {
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, flipped: !c.flipped } : c)));
    }
    setDragId(null);
  };

  const removeCard = (id: string) => {
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (card) setRemoved((r) => [...r, card]);
      return prev.filter((c) => c.id !== id);
    });
  };

  const cycleRank = (id: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = c.rank === null ? 0 : c.rank >= maxRank ? null : c.rank + 1;
        return { ...c, rank: next };
      })
    );
  };

  const restoreLast = () => {
    setRemoved((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setCards((c) => [...c, { ...last, x: 20, y: 20, z: topZ + 1, rank: null, flipped: !flippable }]);
      setTopZ((z) => z + 1);
      return prev.slice(0, -1);
    });
  };

  const sortByRank = () => {
    setCards((prev) => {
      const ranked = [...prev].sort((a, b) => {
        const ra = a.rank === null ? 99 : a.rank;
        const rb = b.rank === null ? 99 : b.rank;
        return ra - rb;
      });
      const cols = isValues ? 10 : 4;
      return ranked.map((c, i) => ({
        ...c,
        x: 16 + (i % cols) * (cardW + 14),
        y: 16 + Math.floor(i / cols) * (cardH + 14),
      }));
    });
  };

  const kept = cards.length;
  const overLimit = keepLimit !== null && kept > keepLimit;
  const canProceed = kept > 0 && !overLimit;

  // Для ценностей: готовы когда ровно keepLimit и все с рангом
  const rankedCards = cards.filter((c) => c.rank !== null).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const allRanked = isValues && keepLimit !== null && rankedCards.length === keepLimit && kept === keepLimit;
  const readyToGo = isValues ? allRanked : canProceed;

  const handleComplete = () => {
    if (isValues) {
      onComplete(rankedCards, rankedCards);
    } else {
      onComplete(cards);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Шапка */}
      <div className="flex flex-col gap-4 mb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold tracking-widest uppercase text-accent">
              Этап {stageIndex} / {totalStages}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: totalStages }).map((_, i) => (
                <span key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i < stageIndex ? 'bg-accent' : 'bg-border'}`} />
              ))}
            </div>
          </div>
          <h2 className="text-3xl font-display font-medium text-foreground">{stageTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{stageSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {keepLimit !== null && (
            <div className={`rounded-xl border px-4 py-2 text-center card-shadow ${overLimit ? 'border-destructive bg-destructive/5' : 'border-border bg-card'}`}>
              <div className={`text-xl font-display font-medium tabular-nums ${overLimit ? 'text-destructive' : 'text-foreground'}`}>
                {kept} / {keepLimit}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">на столе</div>
            </div>
          )}
          {keepLimit === null && <Stat label="На столе" value={kept} />}
          <Stat label="Убрано" value={removed.length} />
        </div>
      </div>

      {/* Панель выбранных ценностей для этапа 2 */}
      {kind === 'questions' && selectedValues && selectedValues.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 card-shadow">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Ваши ценности — держите их в голове, читая вопросы
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedValues.map((v, i) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/90"
                style={{ backgroundColor: v.color }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/15 text-[10px] font-bold">
                  {i + 1}
                </span>
                {v.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Тулбар */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {!flippable && (
          <ToolButton icon="ArrowDownNarrowWide" onClick={sortByRank}>Разложить по рангу</ToolButton>
        )}
        <ToolButton icon="Undo2" onClick={restoreLast} disabled={!removed.length}>
          Вернуть карту
        </ToolButton>
        {isValues && (
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {VALUE_RANK_COLORS.map((c, i) => (
              <Legend key={i} color={c} label={`Место ${i + 1}`} />
            ))}
          </div>
        )}
        {!isValues && !flippable && (
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <Legend color={OTHER_RANK_COLORS[0]} label="Высокий" />
            <Legend color={OTHER_RANK_COLORS[1]} label="Средний" />
            <Legend color={OTHER_RANK_COLORS[2]} label="Низкий" />
          </div>
        )}
      </div>

      {/* Поле с прокруткой */}
      <div
        ref={boardRef}
        onPointerMove={onMove}
        style={{ height: Math.min(boardHeight, 680) }}
        className="dot-grid relative w-full overflow-y-auto rounded-2xl border border-border bg-card card-shadow no-select touch-none"
      >
        <div style={{ height: boardHeight, position: 'relative' }}>
          {cards.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Icon name="Inbox" size={40} className="mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Стол пуст — все карты убраны</p>
            </div>
          )}
          {cards.map((card) => (
            <div
              key={card.id}
              onPointerDown={(e) => startDrag(e, card)}
              onPointerUp={() => endDrag(card)}
              style={{
                left: card.x,
                top: card.y,
                width: cardW,
                height: cardH,
                zIndex: card.z,
                backgroundColor: card.flipped ? card.color : '#2A2E37',
                borderColor: card.rank !== null ? rankColors[card.rank] : 'transparent',
              }}
              className={`group absolute flex cursor-grab flex-col justify-between rounded-xl border-2 p-3 active:cursor-grabbing ${
                dragId === card.id ? 'card-shadow-lg scale-105' : 'card-shadow'
              }`}
            >
              {!card.flipped ? (
                <div className="flex h-full w-full flex-col items-center justify-center text-center">
                  <Icon name="Sparkles" size={22} className="text-white/40" />
                  <span className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/40">
                    Нажмите
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-1">
                    {card.rank !== null && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: rankColors[card.rank] }}
                      >
                        {rankLabels[card.rank]}
                      </span>
                    )}
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => removeCard(card.id)}
                      className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-foreground/60 opacity-0 transition-opacity hover:bg-destructive hover:text-white group-hover:opacity-100"
                      aria-label="Удалить"
                    >
                      <Icon name="X" size={11} />
                    </button>
                  </div>
                  <span className={`font-semibold leading-tight text-foreground/90 overflow-hidden ${isValues ? 'text-[13px]' : 'text-[11px] leading-snug'}`}>
                    {card.title}
                  </span>
                  {!flippable && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => cycleRank(card.id)}
                      className="self-start rounded-md bg-black/5 px-1.5 py-0.5 text-[9px] font-medium text-foreground/60 transition-colors hover:bg-black/10"
                    >
                      {card.rank !== null ? `#${rankLabels[card.rank]}` : 'Ранг'}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Подсказка и кнопка */}
      <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">
          {flippable
            ? 'Нажмите на карту, чтобы перевернуть и прочитать вопрос.'
            : isValues
            ? kept > keepLimit!
              ? `Уберите лишнее — оставьте ровно ${keepLimit} карт и пронумеруйте их (кнопка «Ранг»).`
              : kept === keepLimit && !allRanked
              ? 'Отлично! Теперь расставьте приоритеты — нажмите «Ранг» на каждой из 5 карт.'
              : overLimit
              ? `Оставьте ${keepLimit} карт и пронумеруйте каждую (кнопка «Ранг»).`
              : 'Перетаскивайте карты. Наведите для удаления. Нажмите «Ранг» для приоритета.'
            : overLimit
            ? `Оставьте не больше ${keepLimit} карт, чтобы продолжить.`
            : 'Перетаскивайте карты. Наведите для удаления. Нажмите «Ранг» для приоритета.'}
        </p>
        <button
          onClick={handleComplete}
          disabled={isValues ? !readyToGo : !canProceed}
          className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:gap-3 disabled:opacity-40"
        >
          {kind === 'questions'
            ? 'Перейти к миссиям'
            : stageIndex < totalStages
            ? 'Перейти к следующему этапу'
            : 'Собрать композицию'}
          <Icon name="ArrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2 text-center card-shadow">
      <div className="text-xl font-display font-medium tabular-nums text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ToolButton({ icon, children, onClick, disabled }: { icon: string; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
    >
      <Icon name={icon} size={14} />
      {children}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}