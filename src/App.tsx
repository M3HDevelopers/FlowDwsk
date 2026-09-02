import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Flame,
  Gauge,
  ListChecks,
  BarChart3,
  Sparkles,
} from "lucide-react";
import Ambient from "./components/Ambient";
import TimerPanel from "./components/TimerPanel";
import TaskPanel from "./components/TaskPanel";
import StatsPanel from "./components/StatsPanel";
import {
  MODE_META,
  PRIORITY_META,
  addDays,
  chime,
  dateKey,
  load,
  save,
  seedHistory,
  seedTasks,
  uid,
  type Mode,
  type Priority,
  type Task,
} from "./lib/core";

/* ── Theme hook: reacts to the scaffold's data-theme and allows manual toggling ── */
function useTheme() {
  const read = () =>
    (document.documentElement.getAttribute("data-theme") as "light" | "dark") || "light";
  const [theme, setTheme] = useState<"light" | "dark">(read);

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };
  return { theme, toggle };
}

const greeting = (h: number) =>
  h < 6 ? ["Late night", "The world is quiet — perfect for slipping into flow."]
    : h < 9 ? ["Good morning", "Start the day with one 25-minute block."]
    : h < 12 ? ["Good morning", "Your sharpest hours — spend them on the hardest thing."]
    : h < 14 ? ["Good afternoon", "Post-lunch dip? One short block gets you back."]
    : h < 18 ? ["Good afternoon", "Keep the rhythm — one pomodoro at a time."]
    : h < 22 ? ["Good evening", "Close out today's deep work."]
    : ["Late night", "One last focus round, then rest well."];

const SECTIONS = [
  { id: "sec-timer", label: "Console", icon: Gauge },
  { id: "sec-tasks", label: "Tasks", icon: ListChecks },
  { id: "sec-stats", label: "Stats", icon: BarChart3 },
];

export default function App() {
  const { theme, toggle } = useTheme();

  /* ── Tasks ── */
  const [tasks, setTasks] = useState<Task[]>(() => load<Task[]>("tasks", seedTasks()));
  const [activeId, setActiveId] = useState<string | null>(() => load<string | null>("active", null));
  useEffect(() => save("tasks", tasks), [tasks]);
  useEffect(() => save("active", activeId), [activeId]);

  /* ── History ── */
  const [history, setHistory] = useState<Record<string, number>>(() =>
    load<Record<string, number>>("history", seedHistory())
  );
  useEffect(() => save("history", history), [history]);

  /* ── Settings ── */
  const [soundOn, setSoundOn] = useState<boolean>(() => load("sound", true));
  useEffect(() => save("sound", soundOn), [soundOn]);

  /* ── Timer ── */
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(MODE_META.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [cyclePos, setCyclePos] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const minuteAccum = useRef(0); // seconds accumulated toward the next full minute

  const todayKey = dateKey(new Date());

  /* Finish a block */
  const complete = useCallback(
    (finished: Mode) => {
      setRunning(false);
      if (soundOn) chime("done");
      if (finished === "focus") {
        const nextCycle = (cyclePos + 1) % 4;
        setCyclePos(nextCycle);
        const nextMode: Mode = cyclePos + 1 >= 4 ? "long" : "short";
        setMode(nextMode);
        setSecondsLeft(MODE_META[nextMode].minutes * 60);
        confetti({
          particleCount: 130,
          spread: 75,
          origin: { y: 0.65 },
          colors: ["#f0603f", "#e8b04b", "#4fb89a", "#7d9cc9", "#e9e4d8", "#d9482b"],
          disableForReducedMotion: true,
        });
        setToast(`Round ${cyclePos + 1} complete · +25 min logged`);
      } else {
        setMode("focus");
        setSecondsLeft(MODE_META.focus.minutes * 60);
        setToast(finished === "long" ? "Long break over — fresh start, new round" : "Break's over — back to it");
      }
      window.setTimeout(() => setToast(null), 3200);
    },
    [cyclePos, soundOn]
  );

  /* Per-second heartbeat */
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.setTimeout(() => complete(mode), 0);
          return 0;
        }
        return s - 1;
      });
      /* Focus mode: bank 1 minute for every 60 accumulated seconds */
      if (mode === "focus") {
        minuteAccum.current += 1;
        if (minuteAccum.current >= 60) {
          minuteAccum.current = 0;
          setHistory((h) => ({ ...h, [todayKey]: (h[todayKey] ?? 0) + 1 }));
        }
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [running, mode, todayKey, complete]);

  /* Title-bar countdown */
  useEffect(() => {
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const ss = String(secondsLeft % 60).padStart(2, "0");
    document.title = running
      ? `${mm}:${ss} · ${MODE_META[mode].label} — FLOWDESK`
      : "FLOWDESK · Deep-Work Console — Focus · Tasks · Stats";
  }, [secondsLeft, running, mode]);

  /* Spacebar control */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setRunning((r) => {
          if (!r && soundOn) chime("start");
          return !r;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [soundOn]);

  const toggleRun = () => {
    if (!running && soundOn) chime("start");
    setRunning((r) => !r);
  };
  const resetTimer = () => {
    setRunning(false);
    minuteAccum.current = 0;
    setSecondsLeft(MODE_META[mode].minutes * 60);
  };
  const skipTimer = () => {
    setRunning(false);
    minuteAccum.current = 0;
    complete(mode);
  };
  const changeMode = (m: Mode) => {
    setRunning(false);
    minuteAccum.current = 0;
    setMode(m);
    setSecondsLeft(MODE_META[m].minutes * 60);
  };

  /* ── Clock ── */
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* ── Nav highlight ── */
  const [activeSec, setActiveSec] = useState("sec-timer");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActiveSec(e.target.id));
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId), [tasks, activeId]);
  const [greetTitle, greetSub] = greeting(now.getHours());
  const todayMin = history[todayKey] ?? 0;

  const dateStr = useMemo(
    () => now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    [now]
  );

  const streak = useMemo(() => {
    let s = 0;
    let d = new Date();
    if ((history[dateKey(d)] ?? 0) <= 0) d = addDays(d, -1);
    while ((history[dateKey(d)] ?? 0) > 0) {
      s++;
      d = addDays(d, -1);
    }
    return s;
  }, [history]);

  return (
    <div className="relative min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <Ambient />

      <div className="relative z-10 mx-auto flex max-w-[1440px]">
        {/* ── Sidebar nav rail ── */}
        <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center border-r border-[var(--line)] py-6 lg:flex">
          {/* Seal-style logo */}
          <div
            className="font-display flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--cinnabar), #a33322)" }}
            title="FLOWDESK · Deep-Work Console"
          >
            F
          </div>
          <nav className="mt-10 flex flex-col gap-2">
            {SECTIONS.map((s) => {
              const active = activeSec === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="group relative flex h-12 w-12 flex-col items-center justify-center rounded-lg transition-all duration-200"
                  style={{
                    background: active ? "var(--cinnabar-soft)" : "transparent",
                    color: active ? "var(--cinnabar)" : "var(--ink-faint)",
                  }}
                >
                  <s.icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="mt-0.5 text-[9px] font-medium">{s.label}</span>
                  <span
                    className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-300"
                    style={{ background: "var(--cinnabar)", opacity: active ? 1 : 0, transform: `translateY(-50%) scaleY(${active ? 1 : 0.3})` }}
                  />
                  <span
                    className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-[var(--line)] px-2 py-1 text-[11px] opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100"
                    style={{ background: "var(--panel)", color: "var(--ink)" }}
                  >
                    {s.label}
                  </span>
                </a>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col items-center gap-3">
            <button
              onClick={() => setSoundOn((v) => !v)}
              className="btn-ghost rounded-lg border border-[var(--line)] p-2.5"
              style={{ color: "var(--ink-soft)" }}
              title={soundOn ? "Mute sounds" : "Unmute sounds"}
            >
              {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              onClick={toggle}
              className="btn-ghost rounded-lg border border-[var(--line)] p-2.5"
              style={{ color: "var(--ink-soft)" }}
              title="Toggle theme"
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <span className="font-mono2 text-[9px] tracking-widest" style={{ color: "var(--ink-faint)" }}>
              v1.0
            </span>
          </div>
        </aside>

        {/* ── Main area ── */}
        <main className="min-w-0 flex-1 px-4 pb-16 sm:px-8">
          {/* Top bar */}
          <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-[var(--line)] px-4 py-4 backdrop-blur-md sm:-mx-8 sm:px-8" style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)" }}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="font-display flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white lg:hidden"
                    style={{ background: "linear-gradient(135deg, var(--cinnabar), #a33322)" }}
                  >
                    F
                  </span>
                  <h1 className="font-display text-lg font-bold tracking-tight">
                    FLOWDESK
                    <span className="ml-2 text-sm font-medium" style={{ color: "var(--ink-faint)" }}>Deep-Work Console</span>
                  </h1>
                </div>
                <p className="mt-0.5 truncate text-xs" style={{ color: "var(--ink-soft)" }}>
                  {greetTitle} — {greetSub}
                </p>
              </div>

              {/* Mobile actions */}
              <div className="ml-auto flex items-center gap-2 lg:hidden">
                <button onClick={() => setSoundOn((v) => !v)} className="btn-ghost rounded-lg border border-[var(--line)] p-2" style={{ color: "var(--ink-soft)" }}>
                  {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button onClick={toggle} className="btn-ghost rounded-lg border border-[var(--line)] p-2" style={{ color: "var(--ink-soft)" }}>
                  {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                </button>
              </div>

              <div className="ml-auto hidden items-center gap-5 lg:flex">
                <div className="flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-1.5" style={{ background: "var(--panel)" }}>
                  <Flame size={15} style={{ color: streak > 0 ? "var(--amber)" : "var(--ink-faint)" }} />
                  <span className="font-display tabular text-sm font-bold">{streak}</span>
                  <span className="text-xs" style={{ color: "var(--ink-faint)" }}>day streak</span>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-1.5" style={{ background: "var(--panel)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: todayMin > 0 ? "var(--jade)" : "var(--ink-faint)" }} />
                  <span className="font-display tabular text-sm font-bold">{todayMin}</span>
                  <span className="text-xs" style={{ color: "var(--ink-faint)" }}>min / today</span>
                </div>
                <div className="text-right">
                  <p className="font-display tabular text-xl font-bold leading-none">{now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--ink-faint)" }}>{dateStr}</p>
                </div>
              </div>
            </div>

            {/* Mobile anchor nav */}
            <nav className="mt-3 flex gap-2 lg:hidden">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: activeSec === s.id ? "var(--ink)" : "var(--panel)",
                    color: activeSec === s.id ? "var(--bg)" : "var(--ink-soft)",
                    borderColor: "var(--line)",
                  }}
                >
                  <s.icon size={13} /> {s.label}
                </a>
              ))}
            </nav>
          </header>

          {/* Content grid */}
          <div className="grid gap-5 xl:grid-cols-5">
            <motion.div
              className="xl:col-span-3"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <TimerPanel
                mode={mode}
                secondsLeft={secondsLeft}
                running={running}
                cyclePos={cyclePos}
                activeTask={activeTask && !activeTask.done ? activeTask.title : undefined}
                onToggle={toggleRun}
                onReset={resetTimer}
                onSkip={skipTimer}
                onMode={changeMode}
              />
            </motion.div>
            <motion.div
              className="xl:col-span-2"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <TaskPanel
                tasks={tasks}
                activeId={activeId}
                onReorder={setTasks}
                onAdd={(title, p: Priority) =>
                  setTasks((ts) => [{ id: uid(), title, priority: p, done: false, createdAt: Date.now() }, ...ts])
                }
                onToggle={(id) =>
                  setTasks((ts) => {
                    const t = ts.find((x) => x.id === id);
                    if (t && !t.done && soundOn) chime("tick");
                    return ts.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
                  })
                }
                onRemove={(id) => {
                  setTasks((ts) => ts.filter((x) => x.id !== id));
                  if (activeId === id) setActiveId(null);
                }}
                onTarget={(id) => setActiveId((cur) => (cur === id ? null : id))}
              />
            </motion.div>
          </div>

          <motion.div
            className="mt-5"
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <StatsPanel history={history} tasksDone={tasks.filter((t) => t.done).length} />
          </motion.div>

          {/* Footer */}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5 text-xs" style={{ color: "var(--ink-faint)" }}>
            <p className="flex items-center gap-2">
              <Sparkles size={13} style={{ color: "var(--amber)" }} />
              Flow isn't a gift, it's a rhythm — 25 minutes a round, until the work you love becomes habit.
            </p>
            <p className="font-mono2 flex items-center gap-3">
              <span className="hidden items-center gap-1.5 sm:flex">
                <kbd className="rounded border border-[var(--line)] px-1.5 py-0.5">Space</kbd> timer
              </span>
              <span>
                {activeTask && !activeTask.done ? (
                  <>Current target · <b style={{ color: PRIORITY_META[activeTask.priority].dot }}>{activeTask.title}</b></>
                ) : (
                  "FLOWDESK · saved locally"
                )}
              </span>
            </p>
          </footer>
        </main>
      </div>

      {/* Completion toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed bottom-7 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-[var(--line)] px-5 py-3 text-sm font-medium shadow-2xl"
            style={{ background: "var(--panel)", color: "var(--ink)" }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ background: "var(--jade)" }}>
              <Sparkles size={13} />
            </span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
