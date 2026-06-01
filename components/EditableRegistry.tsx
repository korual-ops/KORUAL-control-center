"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusPill } from "@/components/StatusPill";

export type EditableField<T extends Record<string, string>> = {
  key: keyof T;
  label: string;
  kind?: "text" | "status";
};

export function EditableRegistry<T extends Record<string, string>>({
  title,
  description,
  fields,
  initialItems,
  storageKey
}: {
  title: string;
  description: string;
  fields: EditableField<T>[];
  initialItems: T[];
  storageKey: string;
}) {
  const blankItem = useMemo(() => {
    return fields.reduce((item, field) => ({ ...item, [field.key]: "" }), {}) as T;
  }, [fields]);
  const [items, setItems] = useState<T[]>(() => {
    if (typeof window === "undefined") {
      return initialItems;
    }

    const storedItems = window.localStorage.getItem(storageKey);
    if (!storedItems) {
      return initialItems;
    }

    try {
      const parsedItems = JSON.parse(storedItems) as T[];
      return Array.isArray(parsedItems) ? parsedItems : initialItems;
    } catch {
      window.localStorage.removeItem(storageKey);
      return initialItems;
    }
  });
  const [draft, setDraft] = useState<T>(blankItem);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  function updateDraft(key: keyof T, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function resetDraft() {
    setDraft(blankItem);
    setEditingIndex(null);
  }

  function saveDraft() {
    const normalized = fields.reduce((item, field) => {
      const value = String(draft[field.key] ?? "").trim();
      return { ...item, [field.key]: value || "-" };
    }, {}) as T;

    setItems((current) => {
      if (editingIndex === null) {
        return [normalized, ...current];
      }
      return current.map((item, index) => (index === editingIndex ? normalized : item));
    });
    resetDraft();
  }

  function editItem(index: number) {
    setDraft(items[index]);
    setEditingIndex(index);
  }

  function deleteItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (editingIndex === index) {
      resetDraft();
    }
  }

  return (
    <section className="glass-card p-6" data-storage-key={storageKey}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="label">{title}</div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-korual-mist">{description}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-korual-mist">
          {items.length} records
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-[1.35rem] border border-white/10 bg-black/25 p-4 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <label key={String(field.key)} className="grid gap-2">
              <span className="label">{field.label}</span>
              <input
                className="field"
                value={draft[field.key] ?? ""}
                onChange={(event) => updateDraft(field.key, event.target.value)}
                placeholder={field.label}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-2 lg:w-40 lg:justify-end">
          <button type="button" className="lux-button" onClick={saveDraft}>
            {editingIndex === null ? "Add" : "Update"}
          </button>
          <button type="button" className="quiet-button" onClick={resetDraft}>
            Clear
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[780px] w-full border-collapse text-sm">
          <thead className="bg-white/[0.06] text-left text-xs uppercase tracking-[0.16em] text-korual-mist">
            <tr>
              {fields.map((field) => (
                <th key={String(field.key)} className="px-4 py-4">
                  {field.label}
                </th>
              ))}
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${index}-${Object.values(item).join("-")}`} className="border-t border-white/10">
                {fields.map((field) => (
                  <td key={String(field.key)} className="px-4 py-4 text-korual-mist">
                    {field.kind === "status" ? <StatusPill value={item[field.key]} /> : item[field.key]}
                  </td>
                ))}
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="quiet-button px-3 py-2" onClick={() => editItem(index)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/15"
                      onClick={() => deleteItem(index)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
