/* ── 类型 ─────────────────────────────────────────── */
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
  focus: { label: "专注", en: "FOCUS", minutes: 25, color: "var(--cinnabar)" },
  short: { label: "短休", en: "PAUSE", minutes: 5, color: "var(--jade)" },
  long: { label: "长休", en: "RENEW", minutes: 15, color: "var(--amber)" },
};

/* ── 日期工具 ─────────────────────────────────────── */
export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** 本周周一 */
export const mondayOf = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  return addDays(x, -day);
};

export const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

/* ── 持久化 ───────────────────────────────────────── */
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
    /* 存储不可用时静默 */
  }
}

export const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

/* ── 种子数据 ─────────────────────────────────────── */
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
    mk("撰写季度复盘报告第二章", "high"),
    mk("审阅新版落地页设计稿", "high"),
    mk("整理用户访谈纪要并归档", "mid"),
    mk("给团队周会准备三页提纲", "mid"),
    mk("回复合作方的排期邮件", "low"),
    mk("更新本地开发环境依赖", "low", true, 6),
  ];
};

/** 生成过去 12 周的专注分钟数（含今日为 0），形态自然有起伏 */
export const seedHistory = (): Record<string, number> => {
  const out: Record<string, number> = {};
  const today = new Date();
  for (let i = 83; i >= 1; i--) {
    const d = addDays(today, -i);
    const dow = (d.getDay() + 6) % 7; // 0=周一
    const wave = Math.sin(i / 5.2) * 0.5 + 0.5;
    const weekend = dow >= 5 ? 0.45 : 1;
    const base = 40 + wave * 140 * weekend + ((i * 37) % 55);
    const skipped = (i * 13) % 17 === 0 ? 0 : 1; // 偶尔空白日
    out[dateKey(d)] = Math.round(base * skipped * weekend);
  }
  out[dateKey(today)] = 0;
  return out;
};

/* ── 统计 ─────────────────────────────────────────── */
export const totalMinutes = (h: Record<string, number>) =>
  Object.values(h).reduce((a, b) => a + b, 0);

/** 连续天数（今日有记录则计入，往前推） */
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
  m >= 60 ? `${Math.floor(m / 60)} 时 ${m % 60 ? (m % 60) + " 分" : ""}` : `${m} 分`;

export const fmtHM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/* ── 提示音（WebAudio 双音钟鸣） ─────────────────── */
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
    /* 无音频环境时忽略 */
  }
}

export const PRIORITY_META: Record<Priority, { label: string; cls: string; dot: string }> = {
  high: { label: "紧急", cls: "var(--cinnabar-soft)", dot: "var(--cinnabar)" },
  mid: { label: "常规", cls: "var(--amber-soft)", dot: "var(--amber)" },
  low: { label: "从容", cls: "var(--jade-soft)", dot: "var(--jade)" },
};
