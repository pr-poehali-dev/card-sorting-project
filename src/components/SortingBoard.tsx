import { useRef, useState, useCallback, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { CardItem, StageKind } from '@/lib/cards-data';

interface PlacedCard extends CardItem {
  x: number;
  y: number;
  z: number;
  rank: number | null;
  flipped: boolean;
}

interface SortingBoardProps {
  deck: CardItem[];
  onComplete: (kept: CardItem[]) => void;
  stageTitle: string;
  stageSubtitle: string;
  stageIndex: number;
  totalStages: number;
  kind: StageKind;
  flippable: boolean;
  keepLimit: number | null;
}

const RANK_COLORS = ['#16A34A', '#F59E0B', '#EF4444'];

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
}: SortingBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<PlacedCard[]>([]);
  const [removed, setRemoved] = useState<CardItem[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  const [topZ, setTopZ] = useState(1);
  const offset = useRef({ x: 0, y: 0 });

  const isBig = kind !== 'values';
  const cardW = isBig ? 200 : 86;
  const cardH = isBig ? 150 : 106;

  useEffect(() => {
    const colW = isBig ? 220 : 30;
    const rowH = isBig ? 168 : 26;
    const cols = isBig ? 4 : 12;
    setCards(
      deck.map((c, i) => ({
        ...c,
        x: 20 + (i % cols) * colW + Math.random() * (isBig ? 14 : 8),
        y: 20 + Math.floor(i / cols) * rowH + Math.random() * (isBig ? 12 : 6),
        z: 1,
        rank: null,
        flipped: !flippable,
      }))
    );
    setRemoved([]);
    setTopZ(1);
  }, [deck, isBig, flippable]);

  const pointerToBoard = useCallback((clientX: number, clientY: number) => {
    const rect = boardRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const startDrag = (e: React.PointerEvent, card: PlacedCard) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = pointerToBoard(e.clientX, e.clientY);
    offset.current = { x: p.x - card.x, y: p.y - card.y };
    const nz = topZ + 1;
    setTopZ(nz);
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, z: nz } : c)));
    setDragId(card.id);
    setMoved(false);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const p = pointerToBoard(e.clientX, e.clientY);
    setMoved(true);
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
        const next = c.rank === null ? 0 : c.rank >= 2 ? null : c.rank + 1;
        return { ...c, rank: next };
      })
    );
  };

  const restoreLast = () => {
    setRemoved((prev) => {
      if (!prev.length) return prev;
      const last = prev[prev.length - 1];
      setCards((c) => [...c, { ...last, x: 30, y: 30, z: topZ + 1, rank: null, flipped: !flippable }]);
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
      const cols = isBig ? 4 : 9;
      return ranked.map((c, i) => ({
        ...c,
        x: 20 + (i % cols) * (cardW + 16),
        y: 20 + Math.floor(i / cols) * (cardH + 16),
      }));
    });
  };

  const kept = cards.length;
  const overLimit = keepLimit !== null && kept > keepLimit;
  const canProceed = kept > 0 && (keepLimit === null || kept <= keepLimit);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-semibold tracking-widest uppercase text-accent">
              Этап {stageIndex} / {totalStages}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: totalStages }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    i < stageIndex ? 'bg-accent' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>
          <h2 className="text-3xl font-display font-medium text-foreground">{stageTitle}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{stageSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {keepLimit !== null && (
            <div
              className={`rounded-xl border px-4 py-2 text-center card-shadow ${
                overLimit ? 'border-destructive bg-destructive/5' : 'border-border bg-card'
              }`}
            >
              <div className={`text-xl font-display font-medium tabular-nums ${overLimit ? 'text-destructive' : 'text-foreground'}`}>
                {kept}/{keepLimit}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">оставить</div>
            </div>
          )}
          {keepLimit === null && <Stat label="На столе" value={kept} />}
          <Stat label="Убрано" value={removed.length} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <ToolButton icon="ArrowDownNarrowWide" onClick={sortByRank}>
          Разложить по рангу
        </ToolButton>
        <ToolButton icon="Undo2" onClick={restoreLast} disabled={!removed.length}>
          Вернуть карту
        </ToolButton>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <Legend color={RANK_COLORS[0]} label="Высокий" />
          <Legend color={RANK_COLORS[1]} label="Средний" />
          <Legend color={RANK_COLORS[2]} label="Низкий" />
        </div>
      </div>

      <div
        ref={boardRef}
        onPointerMove={onMove}
        className="dot-grid relative h-[64vh] min-h-[480px] w-full overflow-hidden rounded-2xl border border-border bg-card card-shadow no-select touch-none"
      >
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
              borderColor: card.rank !== null ? RANK_COLORS[card.rank] : 'transparent',
            }}
            className={`group absolute flex cursor-grab flex-col justify-between rounded-xl border-2 p-3 transition-shadow active:cursor-grabbing ${
              dragId === card.id ? 'card-shadow-lg scale-105' : 'card-shadow'
            }`}
          >
            {!card.flipped ? (
              <div className="flex h-full w-full flex-col items-center justify-center text-center">
                <Icon name="Sparkles" size={isBig ? 26 : 18} className="text-white/40" />
                <span className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/40">
                  Нажмите
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  {card.rank !== null && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: RANK_COLORS[card.rank] }}
                    >
                      {card.rank + 1}
                    </span>
                  )}
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeCard(card.id)}
                    className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-foreground/60 opacity-0 transition-opacity hover:bg-destructive hover:text-white group-hover:opacity-100"
                    aria-label="Удалить"
                  >
                    <Icon name="X" size={10} />
                  </button>
                </div>
                <span
                  className={`font-semibold leading-tight text-foreground/90 ${
                    isBig ? 'text-[11px] leading-snug overflow-hidden' : 'text-[13px]'
                  }`}
                >
                  {card.title}
                </span>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => cycleRank(card.id)}
                  className="self-start rounded-md bg-black/5 px-1.5 py-0.5 text-[9px] font-medium text-foreground/60 transition-colors hover:bg-black/10"
                >
                  Ранг
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          {flippable
            ? 'Нажмите на карту, чтобы перевернуть. Перетаскивайте, удерживая нажатие.'
            : overLimit
            ? `Оставьте не больше ${keepLimit} карт, чтобы продолжить.`
            : 'Перетаскивайте карты мышью. Наведите для удаления, нажмите «Ранг» для приоритета.'}
        </p>
        <button
          onClick={() => onComplete(cards)}
          disabled={!canProceed}
          className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:gap-3 disabled:opacity-40"
        >
          {stageIndex < totalStages ? 'Перейти к следующему этапу' : 'Собрать композицию'}
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

function ToolButton({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
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
