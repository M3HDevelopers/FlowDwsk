import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, SkipForward, Crosshair } from "lucide-react";
import { MODE_META, type Mode } from "../lib/core";

interface Props {
  mode: Mode;
  secondsLeft: number;
  running: boolean;
  cyclePos: number; // 0..3 当前周期内完成的专注数
  activeTask?: string;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  onMode: (m: Mode) => void;
}

const R = 148;
const C = 2 * Math.PI * R;

export default function TimerPanel({
  mode,
  secondsLeft,
  running,
  cyclePos,
  activeTask,
  onToggle,
  onReset,
  onSkip,
  onMode,
}: Props) {
  const total = MODE_META[mode].minutes * 60;
  const frac = Math.min(1, Math.max(0, 1 - secondsLeft / total));
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const meta = MODE_META[mode];

  return (
    <section id="sec-timer" className="panel relative overflow-hidden rounded-xl p-6 sm:p-8">
      {/* 角落装饰刻度 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-8 pt-6 opacity-40">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="h-2 w-px" style={{ background: "var(--line-strong)" }} />
        ))}
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
        {/* 左：模式切换 + 大字 + 控制 */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(MODE_META) as Mode[]).map((m) => {
              const active = m === mode;
              return (
                <button
                  key={m}
                  onClick={() => onMode(m)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    active ? "text-white shadow-md" : "btn-ghost border-[var(--line)]"
                  }`}
                  style={active ? { background: MODE_META[m].color, borderColor: "transparent" } : undefined}
                >
                  {MODE_META[m].label}
                  <span className="font-display ml-1.5 text-[11px] opacity-70">{MODE_META[m].minutes}′</span>
                </button>
              );
            })}
            <span className="label-xs font-display ml-2 hidden sm:inline">{meta.en} BLOCK</span>
          </div>

          <div className="mt-6 flex items-end gap-4">
            <div
              className="font-display tabular font-bold leading-none tracking-tight"
              style={{ fontSize: "clamp(76px, 11vw, 148px)", color: "var(--ink)" }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={mm + ss + mode}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  {mm}:{ss}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="mb-3 flex flex-col gap-1.5 pb-1">
              {running ? (
                <span className="pulse-dot inline-block h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
              ) : (
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--ink-faint)" }} />
              )}
              <span className="label-xs">{running ? "进行中" : "已暂停"}</span>
            </div>
          </div>

          {/* 当前聚焦任务 */}
          <div className="mt-3 flex min-h-[26px] items-center gap-2 text-sm" style={{ color: "var(--ink-soft)" }}>
            <Crosshair size={15} style={{ color: meta.color }} />
            {activeTask ? (
              <span>
                正在攻坚 <b style={{ color: "var(--ink)" }}>「{activeTask}」</b>
              </span>
            ) : (
              <span className="opacity-70">尚未选定任务 — 在右侧任务板点击靶心开始</span>
            )}
          </div>

          {/* 控制区 */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onToggle}
              className="group flex items-center gap-2.5 rounded-full px-8 py-3.5 text-base font-bold text-white shadow-lg transition-shadow hover:shadow-xl"
              style={{ background: running ? "var(--ink)" : meta.color }}
            >
              {running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="translate-x-[1px]" />}
              {running ? "暂停" : secondsLeft < total ? "继续" : "开始专注"}
            </motion.button>
            <button
              onClick={onReset}
              className="btn-ghost flex items-center gap-2 rounded-full border border-[var(--line)] px-5 py-3.5 text-sm font-medium"
              style={{ color: "var(--ink-soft)" }}
            >
              <RotateCcw size={16} /> 重置
            </button>
            <button
              onClick={onSkip}
              className="btn-ghost flex items-center gap-2 rounded-full border border-[var(--line)] px-5 py-3.5 text-sm font-medium"
              style={{ color: "var(--ink-soft)" }}
            >
              <SkipForward size={16} /> 跳过
            </button>
            <kbd className="font-mono2 ml-auto hidden rounded-md border border-[var(--line)] px-2.5 py-1.5 text-[11px] sm:inline" style={{ color: "var(--ink-faint)" }}>
              Space 开始 / 暂停
            </kbd>
          </div>
        </div>

        {/* 右：进度环 + 周期点 */}
        <div className="relative mx-auto">
          <svg width="320" height="320" viewBox="0 0 320 320" className={running ? "" : "ring-breathe"}>
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={meta.color} />
                <stop offset="100%" stopColor="var(--amber)" />
              </linearGradient>
            </defs>
            {/* 外圈刻度 */}
            <g className="spin-slow" style={{ transformOrigin: "160px 160px" }}>
              {Array.from({ length: 60 }).map((_, i) => (
                <line
                  key={i}
                  x1="160"
                  y1="12"
                  x2="160"
                  y2={i % 5 === 0 ? 22 : 17}
                  stroke="var(--line-strong)"
                  strokeWidth={i % 5 === 0 ? 1.6 : 0.8}
                  transform={`rotate(${i * 6} 160 160)`}
                />
              ))}
            </g>
            <circle cx="160" cy="160" r={R} fill="none" stroke="var(--ring-track)" strokeWidth="9" />
            <circle
              cx="160"
              cy="160"
              r={R}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - frac)}
              transform="rotate(-90 160 160)"
              style={{ transition: "stroke-dashoffset 0.95s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="label-xs">本轮进度</span>
            <span className="font-display tabular mt-1 text-4xl font-bold" style={{ color: meta.color }}>
              {Math.round(frac * 100)}
              <span className="text-lg">%</span>
            </span>
            {/* 周期点：四次专注换一次长休 */}
            <div className="mt-3 flex items-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full transition-all duration-300"
                  style={{
                    background: i < cyclePos ? "var(--cinnabar)" : "var(--ring-track)",
                    transform: i < cyclePos ? "scale(1.25)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            <span className="label-xs mt-2">{4 - cyclePos > 0 ? `距长休还有 ${4 - cyclePos} 轮` : "该长休了"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
