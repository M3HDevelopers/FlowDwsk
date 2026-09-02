import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Flame, TimerReset, TrendingUp, Award } from "lucide-react";
import {
  addDays,
  bestDay,
  dateKey,
  fmtHM,
  fmtMinutes,
  mondayOf,
  streakOf,
  totalMinutes,
  WEEKDAYS,
} from "../lib/core";

interface Props {
  history: Record<string, number>;
  tasksDone: number;
}

const heatColor = (m: number) =>
  m <= 0
    ? "var(--heat-0)"
    : m < 60
      ? "var(--heat-1)"
      : m < 120
        ? "var(--heat-2)"
        : m < 180
          ? "var(--heat-3)"
          : "var(--heat-4)";

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel rounded-lg px-3 py-2 text-xs">
      <p style={{ color: "var(--ink-faint)" }}>{label}</p>
      <p className="font-display tabular mt-0.5 text-sm font-bold" style={{ color: "var(--cinnabar)" }}>
        {payload[0].value} min
      </p>
    </div>
  );
}

export default function StatsPanel({ history, tasksDone }: Props) {
  const today = new Date();
  const todayKey = dateKey(today);

  /* Bar-chart data for the last 7 days */
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, i - 6);
        const k = dateKey(d);
        return {
          key: k,
          label: i === 6 ? "Today" : WEEKDAYS[(d.getDay() + 6) % 7],
          minutes: history[k] ?? 0,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history]
  );

  /* 12-week heatmap (one column per week) */
  const heatWeeks = useMemo(() => {
    const start = addDays(mondayOf(today), -77); // Monday, 11 weeks ago
    return Array.from({ length: 12 }, (_, w) => ({
      cells: Array.from({ length: 7 }, (_, d) => {
        const day = addDays(start, w * 7 + d);
        const k = dateKey(day);
        const future = k > todayKey;
        return { k, minutes: future ? -1 : history[k] ?? 0, day };
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const total = totalMinutes(history);
  const streak = streakOf(history);
  const best = bestDay(history);
  const todayMin = history[todayKey] ?? 0;
  const activeDays = Object.values(history).filter((v) => v > 0);
  const avg = Math.round(activeDays.reduce((a, b) => a + b, 0) / Math.max(1, activeDays.length));

  const stats = [
    { icon: TimerReset, label: "Total Focus", value: fmtMinutes(total), tone: "var(--cinnabar)", big: true },
    { icon: Flame, label: "Day Streak", value: `${streak} days`, tone: "var(--amber)" },
    { icon: TrendingUp, label: "Avg. Active Day", value: `${avg} min`, tone: "var(--jade)" },
    { icon: Award, label: "Best Day", value: fmtHM(best), tone: "var(--cobalt)" },
  ];

  return (
    <section id="sec-stats" className="grid gap-5 lg:grid-cols-5">
      {/* Record strip — asymmetric: first item oversized */}
      <div className="panel card-lift relative overflow-hidden rounded-xl p-6 lg:col-span-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full blur-2xl" style={{ background: "var(--glow-a)" }} />
        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={s.big ? "min-w-[190px]" : ""}
            >
              <div className="flex items-center gap-1.5">
                <s.icon size={14} style={{ color: s.tone }} />
                <span className="label-xs">{s.label}</span>
              </div>
              <p
                className={`font-display tabular mt-1.5 font-bold leading-none ${s.big ? "text-5xl" : "text-2xl"}`}
                style={{ color: s.big ? s.tone : "var(--ink)" }}
              >
                {s.value}
              </p>
              {s.big && (
                <p className="mt-2 text-xs" style={{ color: "var(--ink-faint)" }}>
                  <b className="font-display" style={{ color: "var(--ink)" }}>{todayMin}</b> min logged today · <b className="font-display" style={{ color: "var(--jade)" }}>{tasksDone}</b> tasks done
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="panel card-lift rounded-xl p-6 lg:col-span-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="label-xs font-display">LAST 7 DAYS</span>
            <h3 className="mt-1 text-lg font-bold">Daily focus minutes</h3>
          </div>
          <span className="font-display tabular text-sm font-semibold" style={{ color: "var(--cinnabar)" }}>
            {week.reduce((a, b) => a + b.minutes, 0)} min / wk
          </span>
        </div>
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--ink-faint)", fontSize: 11, fontFamily: "Noto Sans SC" }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--ink-faint)", fontSize: 10 }} />
              <Tooltip cursor={{ fill: "var(--ring-track)" }} content={<ChartTip />} />
              <ReferenceLine y={avg} stroke="var(--ink-faint)" strokeDasharray="4 5" strokeWidth={1} />
              <Bar dataKey="minutes" radius={[5, 5, 2, 2]} animationDuration={900} animationEasing="ease-out">
                {week.map((d) => (
                  <Cell key={d.key} fill={d.key === todayKey ? "var(--cinnabar)" : "var(--jade)"} fillOpacity={d.key === todayKey ? 1 : 0.72} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap */}
      <div className="panel card-lift rounded-xl p-6 lg:col-span-2">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="label-xs font-display">12-WEEK GRID</span>
            <h3 className="mt-1 text-lg font-bold">Focus heatmap</h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ink-faint)" }}>
            Less
            {[0, 45, 90, 150, 210].map((m) => (
              <span key={m} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: heatColor(m) }} />
            ))}
            More
          </div>
        </div>
        <div className="mt-5 flex justify-between">
          <div className="flex flex-col justify-between pr-2 text-[10px]" style={{ color: "var(--ink-faint)" }}>
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={i % 2 === 1 ? "opacity-0" : ""}>{w}</span>
            ))}
          </div>
          <div className="flex gap-[5px]">
            {heatWeeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[5px]">
                {w.cells.map((c) =>
                  c.minutes < 0 ? (
                    <span key={c.k} className="h-[15px] w-[15px] rounded-[3px]" />
                  ) : (
                    <span
                      key={c.k}
                      title={`${c.k} · ${c.minutes} min`}
                      className="heat-cell h-[15px] w-[15px] rounded-[3px]"
                      style={{ background: heatColor(c.minutes) }}
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-5 border-t border-[var(--line)] pt-3 text-xs leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          Each square is one day. Deeper color, deeper focus —
          <span style={{ color: "var(--cinnabar)" }}> cinnabar</span> marks days past three hours of deep work.
        </p>
      </div>
    </section>
  );
}
