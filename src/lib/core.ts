/* ── Types ────────────────────────────────────────── */
export type Priority = "high" | "mid" | "low";

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  done: boolean;
  createdAt: number;
}

export type Mode = "focus" | "short" | "long";

export const MODE_META: Record<
  Mode,
  { label: string; en: string; minutes: number; color: string }
> = {
  focus: { label: "Focus", en: "FOCUS", minutes: 25, color: "var(--cinnabar)" },
  short: { label: "Break", en: "PAUSE", minutes: 5, color: "var(--jade)" },
  long: { label: "Long Break", en: "RENEW", minutes: 15, color: "var(--amber)" },
};

/* ── Date utilities ───────────────────────────────── */
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Monday of the week containing d */
export const mondayOf = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  return addDays(x, -day);
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ── Persistence ──────────────────────────────────── */
const NS = "flowdesk.v1.";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — fail silently */
  }
}

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

/* ── Seed data ────────────────────────────────────── */
export const seedTasks = (): Task[] => {
  const now = Date.now();
  const mk = (title: string, priority: Priority, done = false, i = 0): Task => ({
    id: uid(),
    title,
    priority,
    done,
    createdAt: now - i * 60000,
  });
  return [
    mk("Draft chapter two of the quarterly review", "high"),
    mk("Review the new landing page mockups", "high"),
    mk("Organize and archive user interview notes", "mid"),
    mk("Prep a three-page outline for team standup", "mid"),
    mk("Reply to the partner scheduling email", "low"),
    mk("Update local dev environment dependencies", "low", true, 6),
  ];
};

/** Focus minutes for the past 12 weeks (today starts at 0), with a natural ebb and flow */
export const seedHistory = (): Record<string, number> => {
  const out: Record<string, number> = {};
  const today = new Date();
  for (let i = 83; i >= 1; i--) {
    const d = addDays(today, -i);
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    const wave = Math.sin(i / 5.2) * 0.5 + 0.5;
    const weekend = dow >= 5 ? 0.45 : 1;
    const base = 40 + wave * 140 * weekend + ((i * 37) % 55);
    const skipped = (i * 13) % 17 === 0 ? 0 : 1; // occasional blank day
    out[dateKey(d)] = Math.round(base * skipped * weekend);
  }
  out[dateKey(today)] = 0;
  return out;
};

/* ── Stats ────────────────────────────────────────── */
export const totalMinutes = (h: Record<string, number>) =>
  Object.values(h).reduce((a, b) => a + b, 0);

/** Day streak (counts today if logged, then walks backward) */
export const streakOf = (h: Record<string, number>) => {
  let streak = 0;
  let d = new Date();
  if ((h[dateKey(d)] ?? 0) <= 0) d = addDays(d, -1);
  while ((h[dateKey(d)] ?? 0) > 0) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
};

export const bestDay = (h: Record<string, number>) =>
  Math.max(0, ...Object.values(h));

export const fmtMinutes = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + "m" : ""}`.trim() : `${m}m`;

export const fmtHM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* ── Chimes (WebAudio two-tone bell) ──────────────── */
let audioCtx: AudioContext | null = null;

export function chime(kind: "done" | "start" | "tick" = "done") {
  try {
    audioCtx = audioCtx || new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const notes =
      kind === "done" ? [523.25, 659.25, 783.99] : kind === "start" ? [392, 523.25] : [880];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = kind === "tick" ? "square" : "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(kind === "tick" ? 0.03 : 0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch {
    /* ignore when no audio environment is available */
  }
}

export const PRIORITY_META: Record<Priority, { label: string; cls: string; dot: string }> = {
  high: { label: "High", cls: "var(--cinnabar-soft)", dot: "var(--cinnabar)" },
  mid: { label: "Normal", cls: "var(--amber-soft)", dot: "var(--amber)" },
  low: { label: "Low", cls: "var(--jade-soft)", dot: "var(--jade)" },
};
