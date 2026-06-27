import { useRef, useState, useCallback, useEffect } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import Icon from '@/components/ui/icon';
import { CardItem } from '@/lib/cards-data';

interface PlacedCard extends CardItem {
  x: number;
  y: number;
  z: number;
}

interface FinalCanvasProps {
  selected: CardItem[];
  onRestart: () => void;
}

export default function FinalCanvas({ selected, onRestart }: FinalCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<PlacedCard[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [topZ, setTopZ] = useState(1);
  const [busy, setBusy] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const cols = Math.ceil(Math.sqrt(selected.length)) || 1;
    setCards(
      selected.map((c, i) => ({
        ...c,
        x: 30 + (i % cols) * 210 + Math.random() * 16,
        y: 30 + Math.floor(i / cols) * 170 + Math.random() * 16,
        z: 1,
      }))
    );
  }, [selected]);

  const toLocal = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
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
      const opts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true };
      if (format === 'pdf') {
        const dataUrl = await toJpeg(node, { ...opts, quality: 0.95 });
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [node.offsetWidth, node.offsetHeight] });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, node.offsetWidth, node.offsetHeight);
        pdf.save('kompozitsiya.pdf');
      } else {
        const dataUrl = format === 'png' ? await toPng(node, opts) : await toJpeg(node, { ...opts, quality: 0.95 });
        const link = document.createElement('a');
        link.download = `kompozitsiya.${format}`;
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-accent">
            Готово
          </span>
          <h2 className="mt-2 text-3xl font-display font-medium text-foreground">Ваша композиция</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {selected.length} карт на общем холсте. Передвигайте их, выстраивая итоговый образ, и сохраните результат.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton icon="Image" label="PNG" onClick={() => exportAs('png')} disabled={busy} />
          <ExportButton icon="FileImage" label="JPG" onClick={() => exportAs('jpg')} disabled={busy} />
          <ExportButton icon="FileText" label="PDF" onClick={() => exportAs('pdf')} disabled={busy} primary />
        </div>
      </div>

      <div
        ref={canvasRef}
        onPointerMove={onMove}
        onPointerUp={() => setDragId(null)}
        className="relative h-[64vh] min-h-[480px] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-secondary card-shadow no-select touch-none"
      >
        {cards.map((card) => (
          <div
            key={card.id}
            onPointerDown={(e) => startDrag(e, card)}
            style={{
              left: card.x,
              top: card.y,
              zIndex: card.z,
              backgroundColor: card.color,
            }}
            className={`absolute flex h-[160px] w-[190px] cursor-grab items-center rounded-xl p-4 transition-shadow active:cursor-grabbing ${
              dragId === card.id ? 'card-shadow-lg scale-105' : 'card-shadow'
            }`}
          >
            <span className="text-[12px] font-medium leading-snug text-foreground/90">
              {card.title}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {busy ? 'Готовим файл…' : 'Перетаскивайте карты для финальной композиции'}
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

function ExportButton({
  icon,
  label,
  onClick,
  disabled,
  primary,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
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