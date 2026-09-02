import { useMemo } from "react";

interface Mote {
  left: number;
  size: number;
  dur: number;
  delay: number;
  op: number;
  dx: number;
  color: string;
}

/** 分层环境背景：网格 + 漂移光晕 + 上升微粒 + 噪点 */
export default function Ambient() {
  const motes = useMemo<Mote[]>(() => {
    const colors = ["var(--cinnabar)", "var(--amber)", "var(--jade)", "var(--cobalt)"];
    return Array.from({ length: 16 }, (_, i) => ({
      left: (i * 61.8) % 100,
      size: 2 + ((i * 7) % 4),
      dur: 26 + ((i * 13) % 22),
      delay: -((i * 17) % 30),
      op: 0.16 + ((i * 11) % 20) / 90,
      dx: ((i % 2 ? 1 : -1) * (20 + ((i * 29) % 60))),
      color: colors[i % colors.length],
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* 网格 */}
      <div className="bg-grid-layer absolute inset-0" />
      {/* 漂移光晕 */}
      <div
        className="glow-a absolute -top-[20%] -left-[12%] h-[62vh] w-[52vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--glow-a) 0%, transparent 65%)" }}
      />
      <div
        className="glow-b absolute top-[28%] -right-[16%] h-[70vh] w-[48vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--glow-b) 0%, transparent 65%)" }}
      />
      <div
        className="glow-a absolute -bottom-[24%] left-[22%] h-[54vh] w-[44vw] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, var(--glow-c) 0%, transparent 65%)", animationDelay: "-9s" }}
      />
      {/* 上升微粒 */}
      {motes.map((m, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              left: `${m.left}%`,
              width: m.size,
              height: m.size,
              background: m.color,
              "--p-dur": `${m.dur}s`,
              "--p-delay": `${m.delay}s`,
              "--p-op": m.op,
              "--p-dx": `${m.dx}px`,
            } as React.CSSProperties
          }
        />
      ))}
      {/* 噪点 */}
      <div className="noise-layer absolute inset-0" />
    </div>
  );
}
