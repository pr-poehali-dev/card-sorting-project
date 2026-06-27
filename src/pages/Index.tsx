import { useState, useRef } from 'react';
import Icon from '@/components/ui/icon';
import SortingBoard from '@/components/SortingBoard';
import FinalCanvas from '@/components/FinalCanvas';
import { STAGES, deckForStage, CardItem } from '@/lib/cards-data';

type Phase = 'home' | 'sorting' | 'final';

export default function Index() {
  const [phase, setPhase] = useState<Phase>('home');
  const [stage, setStage] = useState(0);
  const [selectedValues, setSelectedValues] = useState<CardItem[]>([]); // 5 ценностей из этапа 1
  const [selectedMissions, setSelectedMissions] = useState<CardItem[]>([]); // до 3 миссий из этапа 3
  const appRef = useRef<HTMLDivElement>(null);

  const startApp = () => {
    setStage(0);
    setSelectedValues([]);
    setSelectedMissions([]);
    setPhase('sorting');
    setTimeout(() => appRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleStageComplete = (kept: CardItem[], ranked?: CardItem[]) => {
    const s = STAGES[stage];
    if (s.kind === 'values') {
      setSelectedValues(ranked ?? kept);
      setStage(stage + 1);
    } else if (s.kind === 'questions') {
      // вопросы просто переходят к следующему этапу, карты не сохраняем
      setStage(stage + 1);
    } else {
      // миссии — финал
      setSelectedMissions(kept);
      setPhase('final');
    }
    setTimeout(() => appRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const restart = () => {
    setPhase('home');
    setStage(0);
    setSelectedValues([]);
    setSelectedMissions([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Header onStart={startApp} active={phase} />

      {phase === 'home' && <Hero onStart={startApp} />}

      {phase !== 'home' && (
        <section ref={appRef} className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          {phase === 'sorting' && (
            <SortingBoard
              key={stage}
              deck={deckForStage(STAGES[stage].kind)}
              kind={STAGES[stage].kind}
              flippable={STAGES[stage].flippable}
              keepLimit={STAGES[stage].keepLimit}
              stageTitle={STAGES[stage].title}
              stageSubtitle={STAGES[stage].subtitle}
              stageIndex={STAGES[stage].index}
              totalStages={STAGES.length}
              onComplete={handleStageComplete}
              selectedValues={STAGES[stage].kind === 'questions' ? selectedValues : undefined}
            />
          )}
          {phase === 'final' && (
            <FinalCanvas
              values={selectedValues}
              missions={selectedMissions}
              onRestart={restart}
            />
          )}
        </section>
      )}

      {phase === 'home' && (
        <>
          <Instructions />
          <ExportInfo onStart={startApp} />
          <Contacts />
        </>
      )}

      <Footer />
    </div>
  );
}

function Header({ onStart, active }: { onStart: () => void; active: Phase }) {
  const links = [
    { label: 'Инструкции', href: '#instructions' },
    { label: 'Экспорт', href: '#export' },
    { label: 'Контакты', href: '#contacts' },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="LayoutGrid" size={16} />
          </span>
          <span className="font-display text-lg font-medium tracking-tight">Карта Смыслов</span>
        </a>
        {active === 'home' && (
          <nav className="hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
        <button
          onClick={onStart}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Запустить
        </button>
      </div>
    </header>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="max-w-3xl animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Интерактивная сортировка карт в три этапа
          </span>
          <h1 className="mt-6 font-display text-5xl font-medium leading-[1.05] tracking-tight text-foreground md:text-7xl">
            Разложите хаос
            <br />
            по <span className="text-accent">смыслам</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            100 карт, три этапа отбора и общий холст для финальной композиции.
            Передвигайте, сортируйте, ранжируйте — и соберите то, что важно именно вам.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground transition-all hover:gap-3"
            >
              Начать сортировку
              <Icon name="ArrowRight" size={18} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="#instructions"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Как это работает
            </a>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { n: '100', l: 'карт на старте' },
            { n: '3', l: 'этапа отбора' },
            { n: '∞', l: 'вариантов раскладки' },
            { n: '3', l: 'формата экспорта' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-5 card-shadow animate-scale-in"
              style={{ animationDelay: `${i * 80}ms`, opacity: 0 }}
            >
              <div className="font-display text-4xl font-medium text-foreground">{s.n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Instructions() {
  const steps = [
    {
      icon: 'MousePointerClick',
      title: 'Раскладывайте',
      text: 'Перетаскивайте карты по столу, группируйте близкие по смыслу и убирайте лишние одним кликом.',
    },
    {
      icon: 'ListOrdered',
      title: 'Ранжируйте',
      text: 'Присваивайте картам приоритет — высокий, средний или низкий — и сортируйте их по рангу.',
    },
    {
      icon: 'Layers',
      title: 'Три этапа',
      text: 'На каждом этапе круг сужается. Оставшиеся карты переходят дальше, пока не останется главное.',
    },
    {
      icon: 'Download',
      title: 'Сохраняйте',
      text: 'Финальную композицию можно свободно перекомпоновать и скачать в PNG, JPG или PDF.',
    },
  ];
  return (
    <section id="instructions" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="mb-12 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">Инструкции</span>
        <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl">
          Как пользоваться системой
        </h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={i} className="group rounded-2xl border border-border bg-card p-6 card-shadow transition-transform hover:-translate-y-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
              <Icon name={s.icon} size={20} />
            </span>
            <h3 className="mt-5 font-display text-xl font-medium text-foreground">
              <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExportInfo({ onStart }: { onStart: () => void }) {
  return (
    <section id="export" className="mx-auto max-w-6xl px-5 py-16">
      <div className="overflow-hidden rounded-3xl border border-border bg-primary px-8 py-12 text-primary-foreground md:px-14 md:py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
              Экспорт композиции
            </span>
            <h2 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
              Сохраните результат в любом формате
            </h2>
            <p className="mt-4 max-w-md text-primary-foreground/70">
              Итоговый холст с вашими картами выгружается в три формата — для печати, презентаций и личного архива.
            </p>
            <button
              onClick={onStart}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-all hover:gap-3"
            >
              Собрать свою композицию
              <Icon name="ArrowRight" size={16} />
            </button>
          </div>
          <div className="grid gap-3">
            {[
              { icon: 'Image', f: 'PNG', d: 'Прозрачность и максимальное качество' },
              { icon: 'FileImage', f: 'JPG', d: 'Лёгкий файл для быстрого обмена' },
              { icon: 'FileText', f: 'PDF', d: 'Готово к печати и презентациям' },
            ].map((x) => (
              <div key={x.f} className="flex items-center gap-4 rounded-2xl bg-primary-foreground/5 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon name={x.icon} size={20} />
                </span>
                <div>
                  <div className="font-display text-lg font-medium">{x.f}</div>
                  <div className="text-sm text-primary-foreground/60">{x.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Contacts() {
  return (
    <section id="contacts" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Контакты</span>
          <h2 className="mt-3 font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl">
            Остались вопросы?
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Напишите нам — расскажем, как адаптировать систему под ваши карты и задачи.
          </p>
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-foreground font-medium">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon name="User" size={18} />
              </span>
              Еловикова Екатерина
            </div>
            <a href="tel:+79025033775" className="flex items-center gap-3 text-foreground hover:text-accent transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon name="Phone" size={18} />
              </span>
              +7 902 503 37 75
            </a>
            <a href="mailto:i@eelovikova.ru" className="flex items-center gap-3 text-foreground hover:text-accent transition-colors">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon name="Mail" size={18} />
              </span>
              i@eelovikova.ru
            </a>
          </div>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="rounded-3xl border border-border bg-card p-7 card-shadow"
        >
          <div className="grid gap-4">
            <Field label="Имя" placeholder="Как к вам обращаться" />
            <Field label="Email" placeholder="you@email.ru" type="email" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Сообщение</label>
              <textarea
                rows={4}
                placeholder="Ваш вопрос или пожелание"
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Отправить сообщение
              <Icon name="Send" size={15} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({ label, placeholder, type = 'text' }: { label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
      />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="LayoutGrid" size={14} />
          </span>
          <span className="font-display font-medium">Карта Смыслов</span>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 — система сортировки карт</p>
      </div>
    </footer>
  );
}