import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, Plus, Trash2, Crosshair, Check, ListChecks } from "lucide-react";
import { PRIORITY_META, type Priority, type Task } from "../lib/core";

interface Props {
  tasks: Task[];
  activeId: string | null;
  onReorder: (t: Task[]) => void;
  onAdd: (title: string, p: Priority) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onTarget: (id: string) => void;
}

type Filter = "all" | "doing" | "done";

function SortableRow({
  task,
  active,
  onToggle,
  onRemove,
  onTarget,
}: {
  task: Task;
  active: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onTarget: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const p = PRIORITY_META[task.priority];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2.5 transition-colors ${
        isDragging ? "z-20 shadow-xl" : ""
      }`}
      {...attributes}
    >
      <div
        className="absolute inset-0 rounded-lg border transition-colors"
        style={{
          background: "var(--panel)",
          borderColor: active ? p.dot : isDragging ? "var(--line-strong)" : "var(--line)",
          boxShadow: active ? `inset 3px 0 0 ${p.dot}` : undefined,
        }}
      />
      <button
        {...listeners}
        aria-label="拖动排序"
        className="relative z-10 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
        style={{ color: "var(--ink-faint)" }}
      >
        <GripVertical size={15} className="opacity-40 transition-opacity group-hover:opacity-100" />
      </button>
      <button
        onClick={onToggle}
        aria-label="完成切换"
        className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200"
        style={{
          borderColor: task.done ? p.dot : "var(--line-strong)",
          background: task.done ? p.dot : "transparent",
          color: "#fff",
        }}
      >
        <AnimatePresence>
          {task.done && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
              <Check size={12} strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <div className="relative z-10 min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium transition-all duration-300"
          style={{
            color: task.done ? "var(--ink-faint)" : "var(--ink)",
            textDecoration: task.done ? "line-through" : "none",
          }}
        >
          {task.title}
        </p>
      </div>
      <span
        className="relative z-10 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ background: p.cls, color: p.dot }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.dot }} />
        {p.label}
      </span>
      <button
        onClick={onTarget}
        title="设为当前专注任务"
        className="btn-ghost relative z-10 rounded-md border border-transparent p-1.5"
        style={{ color: active ? p.dot : "var(--ink-faint)", background: active ? p.cls : undefined }}
      >
        <Crosshair size={15} fill={active ? "currentColor" : "none"} />
      </button>
      <button
        onClick={onRemove}
        aria-label="删除任务"
        className="relative z-10 rounded-md p-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:!bg-[var(--cinnabar-soft)]"
        style={{ color: "var(--ink-faint)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cinnabar)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-faint)")}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export default function TaskPanel({ tasks, activeId, onReorder, onAdd, onToggle, onRemove, onTarget }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState("");
  const [prio, setPrio] = useState<Priority>("mid");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const visible = tasks.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title, prio);
    setDraft("");
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex((t) => t.id === active.id);
    const newIdx = tasks.findIndex((t) => t.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(tasks, oldIdx, newIdx));
  };

  return (
    <section id="sec-tasks" className="panel flex h-full flex-col rounded-xl p-5">
      <header className="flex items-center justify-between">
        <div>
          <span className="label-xs font-display">TASK BOARD</span>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-bold">
            <ListChecks size={18} style={{ color: "var(--cinnabar)" }} /> 今日任务
          </h2>
        </div>
        <div className="text-right">
          <span className="font-display tabular text-2xl font-bold" style={{ color: "var(--jade)" }}>
            {doneCount}
            <span className="text-sm" style={{ color: "var(--ink-faint)" }}>/{tasks.length}</span>
          </span>
          <p className="label-xs">已完成</p>
        </div>
      </header>

      {/* 进度条 */}
      <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--ring-track)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, var(--jade), var(--amber))" }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      {/* 输入 */}
      <div className="mt-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="添加任务，回车确认…"
          className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-transparent px-3.5 py-2.5 text-sm transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--cinnabar)]"
          style={{ color: "var(--ink)", background: "var(--panel-2)" }}
        />
        <select
          value={prio}
          onChange={(e) => setPrio(e.target.value as Priority)}
          className="rounded-lg border border-[var(--line)] px-2 text-xs font-medium"
          style={{ background: "var(--panel-2)", color: "var(--ink-soft)" }}
        >
          <option value="high">紧急</option>
          <option value="mid">常规</option>
          <option value="low">从容</option>
        </select>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={submit}
          aria-label="添加任务"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition-colors hover:brightness-110"
          style={{ background: "var(--cinnabar)" }}
        >
          <Plus size={18} strokeWidth={2.6} />
        </motion.button>
      </div>

      {/* 筛选 */}
      <div className="mt-4 flex gap-1.5">
        {(
          [
            ["all", "全部"],
            ["doing", "进行中"],
            ["done", "已完成"],
          ] as [Filter, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="rounded-md px-3 py-1 text-xs font-medium transition-all duration-200"
            style={{
              background: filter === k ? "var(--ink)" : "transparent",
              color: filter === k ? "var(--bg)" : "var(--ink-soft)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="mt-3 flex flex-col gap-2 overflow-y-auto pr-0.5" style={{ maxHeight: 380 }}>
            <AnimatePresence initial={false}>
              {visible.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SortableRow
                    task={t}
                    active={t.id === activeId}
                    onToggle={() => onToggle(t.id)}
                    onRemove={() => onRemove(t.id)}
                    onTarget={() => onTarget(t.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </ul>
        </SortableContext>
      </DndContext>

      {visible.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 py-8 text-center" style={{ color: "var(--ink-faint)" }}>
          <ListChecks size={28} strokeWidth={1.4} />
          <p className="text-sm">{filter === "done" ? "还没有完成的任务，加油！" : "清单空空如也，写下第一件事吧"}</p>
        </div>
      )}
    </section>
  );
}
