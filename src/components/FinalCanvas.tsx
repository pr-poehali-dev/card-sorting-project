import { useRef, useState, useCallback, useEffect } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import Icon from '@/components/ui/icon';
import { CardItem } from '@/lib/cards-data';

interface PlacedCard extends CardItem {
  x: number;
  y: number;
  z: number;
  group: 'value' | 'mission';
}

interface FinalCanvasProps {
  values: CardItem[];
  missions: CardItem[];
  onRestart: () => void;
}

const VALUE_RANK_COLORS = ['#16A34A', '#22C55E', '#F59E0B', '#F97316', '#EF4444'];

export default function FinalCanvas({ values, missions, onRestart }: FinalCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<PlacedCard[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [topZ, setTopZ] = useState(100);
  const [busy, setBusy] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const placed: PlacedCard[] = [];

    // Ценности — левая колонка, вертикально по рангу
    values.forEach((c, i) => {
      placed.push({ ...c, x: 32, y: 32 + i * 134, z: 1, group: 'value' });
    });

    // Миссии — правее, сетка
    const mCol = 3;
    missions.forEach((c, i) => {
      placed.push({
        ...c,
        x: 200 + (i % mCol) * 226 + Math.random() * 10,
        y: 32 + Math.floor(i / mCol) * 174 + Math.random() * 10,
        z: 1,
        group: 'mission',
      });
    });

    setCards(placed);
    setTopZ(100);
  }, [values, missions]);

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scrollTop = canvasRef.current!.scrollTop;
    return { x: clientX - rect.left, y: clientY - rect.top + scrollTop };
  }, []);

  const startDrag = (e: React.PointerEvent, card: PlacedCard) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    offset.current = { x: p.x - card.x, y: p.y - card.y };
    const nz = topZ + 1;
    setTopZ(nz);
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, z: nz } : c)));
    setDragId(card.id);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const p = toLocal(e.clientX, e.clientY);
    setCards((prev) =>
      prev.map((c) =>
        c.id === dragId ? { ...c, x: p.x - offset.current.x, y: p.y - offset.current.y } : c
      )
    );
  };

  const exportAs = async (format: 'png' | 'jpg' | 'pdf') => {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      const node = canvasRef.current;
      const opts = { pixelRatio: 2, backgroundColor: '#f9f7f3', cacheBust: true };
      if (format === 'pdf') {
        const dataUrl = await toJpeg(node, { ...opts, quality: 0.95 });
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [node.scrollWidth, node.scrollHeight] });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, node.scrollWidth, node.scrollHeight);
        pdf.save('kompozitsiya.pdf');
      } else {
        const dataUrl = format === 'png'
          ? await toPng(node, opts)
          : await toJpeg(node, { ...opts, quality: 0.95 });
        const link = document.createElement('a');
        link.download = `kompozitsiya.${format}`;
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setBusy(false);
    }
  };

  // Высота холста — чтобы вместить все карты
  const canvasH = Math.max(
    680,
    values.length * 134 + 80,
    Math.ceil(missions.length / 3) * 174 + 80,
  );

  return (
    <div className="animate-fade-in">
      {/* Шапка */}
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-accent">Финал</span>
          <h2 className="mt-2 text-3xl font-display font-medium text-foreground">Ваша композиция</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {values.length} ценностей и {missions.length} {missions.length === 1 ? 'миссия' : missions.length < 5 ? 'миссии' : 'миссий'} на общем холсте. Передвигайте карты, выстраивая итоговый образ.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton icon="Image" label="PNG" onClick={() => exportAs('png')} disabled={busy} />
          <ExportButton icon="FileImage" label="JPG" onClick={() => exportAs('jpg')} disabled={busy} />
          <ExportButton icon="FileText" label="PDF" onClick={() => exportAs('pdf')} disabled={busy} primary />
        </div>
      </div>

      {/* Легенда групп */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#E8E2D6' }} />
          Ценности (5 шт., по приоритету)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#D8DCE3' }} />
          Миссии ({missions.length} шт.)
        </span>
      </div>

      {/* Холст */}
      <div
        ref={canvasRef}
        onPointerMove={onMove}
        onPointerUp={() => setDragId(null)}
        style={{ height: Math.min(canvasH, 700) }}
        className="dot-grid relative w-full overflow-y-auto rounded-2xl border border-border bg-card card-shadow no-select touch-none"
      >
        <div style={{ height: canvasH, position: 'relative' }}>
          {/* Подписи зон */}
          <div className="pointer-events-none absolute left-4 top-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Ценности
          </div>
          {missions.length > 0 && (
            <div className="pointer-events-none absolute left-52 top-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Миссии
            </div>
          )}

          {/* Разделитель */}
          {missions.length > 0 && (
            <div className="pointer-events-none absolute left-[184px] top-0 bottom-0 w-px bg-border/60" />
          )}

          {cards.map((card, idx) => {
            const isValue = card.group === 'value';
            const valueIdx = isValue ? values.findIndex((v) => v.id === card.id) : -1;
            return (
              <div
                key={card.id}
                onPointerDown={(e) => startDrag(e, card)}
                style={{
                  left: card.x,
                  top: card.y,
                  width: isValue ? 148 : 210,
                  height: isValue ? 120 : 158,
                  zIndex: card.z,
                  backgroundColor: card.color,
                }}
                className={`absolute flex cursor-grab flex-col justify-between rounded-xl p-3.5 active:cursor-grabbing ${
                  dragId === card.id ? 'card-shadow-lg scale-105' : 'card-shadow'
                }`}
              >
                {isValue && valueIdx >= 0 && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ backgroundColor: VALUE_RANK_COLORS[valueIdx] }}
                    >
                      {valueIdx + 1}
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/40">
                      Ценность
                    </span>
                  </div>
                )}
                {!isValue && (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-foreground/40">
                    Миссия
                  </span>
                )}
                <span
                  className={`font-semibold leading-tight text-foreground/90 ${
                    isValue ? 'text-[14px]' : 'text-[11px] leading-snug'
                  }`}
                >
                  {card.title}
                </span>
                {/* пустой div для justify-between */}
                <div />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {busy ? 'Готовим файл для скачивания…' : 'Перетаскивайте карты для финального расположения, затем сохраните.'}
        </p>
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Icon name="RotateCcw" size={15} />
          Начать заново
        </button>
      </div>
    </div>
  );
}

function ExportButton({ icon, label, onClick, disabled, primary }: {
  icon: string; label: string; onClick: () => void; disabled?: boolean; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.03] disabled:opacity-40 ${
        primary
          ? 'bg-accent text-accent-foreground'
          : 'border border-border bg-card text-foreground hover:bg-secondary'
      }`}
    >
      <Icon name={icon} size={15} />
      {label}
    </button>
  );
}
