"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc/client";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDurationSeconds } from "@/lib/utils";

type Lesson = {
  id: string;
  title: string;
  vimeoVideoId: string;
  durationSeconds: number;
  orderIndex: number;
};

export function LessonsEditor({
  moduleId,
  initialLessons,
  onChange,
}: {
  moduleId: string;
  initialLessons: Lesson[];
  onChange: (lessons: Lesson[]) => void;
}) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [newTitle, setNewTitle] = useState("");

  const upsert = trpc.content.upsertLesson.useMutation();
  const del = trpc.content.deleteLesson.useMutation();
  const reorder = trpc.content.reorderLessons.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);

  useEffect(() => {
    onChange(lessons);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons]);

  async function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const res = await upsert.mutateAsync({ moduleId, title, durationSeconds: 0 });
      setLessons((prev) => [
        ...prev,
        {
          id: res.id,
          title,
          vimeoVideoId: "",
          durationSeconds: 0,
          orderIndex: prev.length,
        },
      ]);
      setNewTitle("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleUpdate(id: string, patch: Partial<Lesson>) {
    setLessons((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    const merged = { ...lessons.find((l) => l.id === id)!, ...patch };
    try {
      await upsert.mutateAsync({
        id,
        moduleId,
        title: merged.title,
        vimeoVideoId: merged.vimeoVideoId || undefined,
        durationSeconds: merged.durationSeconds,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare la lezione?")) return;
    try {
      await del.mutateAsync({ id });
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === e.active.id);
    const newIndex = lessons.findIndex((l) => l.id === e.over!.id);
    const next = arrayMove(lessons, oldIndex, newIndex);
    setLessons(next);
    try {
      await reorder.mutateAsync({
        moduleId,
        orderedIds: next.map((l) => l.id),
      });
    } catch {
      toast.error("Errore riordino");
    }
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={lessons.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {lessons.map((lesson) => (
            <SortableLesson
              key={lesson.id}
              lesson={lesson}
              onUpdate={(patch) => handleUpdate(lesson.id, patch)}
              onDelete={() => handleDelete(lesson.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 pt-2">
        <Input
          placeholder="Titolo nuova lezione"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="max-w-md"
        />
        <Button type="button" size="sm" onClick={handleAdd}>
          + Lezione
        </Button>
      </div>
    </div>
  );
}

function SortableLesson({
  lesson,
  onUpdate,
  onDelete,
}: {
  lesson: Lesson;
  onUpdate: (patch: Partial<Lesson>) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-3 border border-paper-300/10 bg-ink-900 px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-paper-400 hover:text-paper-50"
        aria-label="Trascina"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <Input
        className="h-9 flex-1 min-w-[180px]"
        value={lesson.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
      />
      <Input
        className="h-9 w-[140px]"
        placeholder="Vimeo ID"
        value={lesson.vimeoVideoId}
        onChange={(e) => onUpdate({ vimeoVideoId: e.target.value })}
        inputMode="numeric"
      />
      <Input
        className="h-9 w-[100px]"
        type="number"
        min={0}
        placeholder="Secondi"
        value={lesson.durationSeconds}
        onChange={(e) => onUpdate({ durationSeconds: Number(e.target.value) || 0 })}
      />
      <span className="text-xs text-paper-400">
        {formatDurationSeconds(lesson.durationSeconds)}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
        Elimina
      </Button>
    </div>
  );
}
