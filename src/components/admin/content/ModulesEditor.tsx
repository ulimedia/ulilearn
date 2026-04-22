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
import { LessonsEditor } from "./LessonsEditor";

type Lesson = {
  id: string;
  title: string;
  vimeoVideoId: string;
  durationSeconds: number;
  orderIndex: number;
};

type Module = {
  id: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
};

export function ModulesEditor({
  courseId,
  initialModules,
}: {
  courseId: string;
  initialModules: Module[];
}) {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [newTitle, setNewTitle] = useState("");
  const utils = trpc.useUtils();

  const upsertModule = trpc.content.upsertModule.useMutation();
  const deleteModule = trpc.content.deleteModule.useMutation();
  const reorderModules = trpc.content.reorderModules.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  async function handleAddModule() {
    const title = newTitle.trim();
    if (!title) return;
    try {
      const res = await upsertModule.mutateAsync({ courseId, title });
      setModules((prev) => [
        ...prev,
        { id: res.id, title, orderIndex: prev.length, lessons: [] },
      ]);
      setNewTitle("");
      toast.success("Modulo aggiunto");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleRenameModule(id: string, title: string) {
    try {
      await upsertModule.mutateAsync({ id, courseId, title });
      setModules((prev) => prev.map((m) => (m.id === id ? { ...m, title } : m)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleDeleteModule(id: string) {
    if (!confirm("Eliminare il modulo e tutte le sue lezioni?")) return;
    try {
      await deleteModule.mutateAsync({ id });
      setModules((prev) => prev.filter((m) => m.id !== id));
      toast.success("Modulo eliminato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIndex = modules.findIndex((m) => m.id === e.active.id);
    const newIndex = modules.findIndex((m) => m.id === e.over!.id);
    const next = arrayMove(modules, oldIndex, newIndex);
    setModules(next);
    try {
      await reorderModules.mutateAsync({
        courseId,
        orderedIds: next.map((m) => m.id),
      });
    } catch (e) {
      toast.error("Errore riordino");
      utils.content.get.invalidate({ id: courseId });
    }
  }

  return (
    <div className="space-y-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={modules.map((m) => m.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {modules.map((module) => (
              <SortableModule
                key={module.id}
                module={module}
                onRename={handleRenameModule}
                onDelete={handleDeleteModule}
                onLessonsChange={(lessons) => {
                  setModules((prev) =>
                    prev.map((m) =>
                      m.id === module.id ? { ...m, lessons } : m,
                    ),
                  );
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {modules.length === 0 && (
        <p className="text-sm text-paper-400">
          Ancora nessun modulo. Aggiungine uno qui sotto.
        </p>
      )}

      <div className="flex gap-2 border-t border-paper-300/10 pt-6">
        <Input
          placeholder="Nome del nuovo modulo"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddModule();
            }
          }}
          className="max-w-md"
        />
        <Button type="button" onClick={handleAddModule}>
          Aggiungi modulo
        </Button>
      </div>
    </div>
  );
}

function SortableModule({
  module,
  onRename,
  onDelete,
  onLessonsChange,
}: {
  module: Module;
  onRename: (id: string, title: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onLessonsChange: (lessons: Lesson[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(module.title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-paper-300/15 bg-ink-800"
    >
      <div className="flex items-center gap-3 border-b border-paper-300/10 px-4 py-3">
        <button
          type="button"
          className="cursor-grab text-paper-400 hover:text-paper-50"
          aria-label="Trascina per riordinare"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        {editing ? (
          <Input
            className="h-9 max-w-md"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={async () => {
              if (title.trim() && title !== module.title) {
                await onRename(module.id, title.trim());
              }
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-display text-lg text-paper-50 hover:text-accent"
          >
            {module.title}
          </button>
        )}
        <span className="text-xs text-paper-400">
          {module.lessons.length} lezion{module.lessons.length === 1 ? "e" : "i"}
        </span>
        <div className="ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(module.id)}
          >
            Elimina
          </Button>
        </div>
      </div>
      <div className="p-4">
        <LessonsEditor
          moduleId={module.id}
          initialLessons={module.lessons}
          onChange={onLessonsChange}
        />
      </div>
    </div>
  );
}
