import type { StudySource } from "./source-types";

const STORAGE_KEY = "studycards.demo.sources.v1";

export type DemoSourceInput = {
  title: string;
  sourceType: StudySource["sourceType"];
  sourceText: string | null;
  byteSize: number | null;
};

type DemoStoreResult = { ok: true; source: StudySource } | { ok: false; error: string };

function readSources(): StudySource[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StudySource =>
      typeof item === "object" && item !== null &&
      typeof item.id === "string" && typeof item.title === "string" &&
      typeof item.sourceType === "string" && typeof item.status === "string",
    );
  } catch {
    return [];
  }
}

function writeSources(sources: StudySource[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    return true;
  } catch {
    return false;
  }
}

export function getDemoSources(): StudySource[] {
  return readSources()
    .filter((source) => source.status !== "archived")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDemoSource(id: string): StudySource | null {
  return readSources().find((source) => source.id === id && source.status !== "archived") ?? null;
}

export function saveDemoSource(input: DemoSourceInput): DemoStoreResult {
  const now = new Date().toISOString();
  const source: StudySource = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    sourceType: input.sourceType,
    status: "ready",
    sourceText: input.sourceText,
    byteSize: input.byteSize,
    createdAt: now,
    updatedAt: now,
    storagePath: null,
  };
  if (!writeSources([source, ...readSources()])) {
    return { ok: false, error: "Browser storage is full or unavailable. Try a smaller source, or connect an account to save it." };
  }
  return { ok: true, source };
}

export function renameDemoSource(id: string, title: string): DemoStoreResult {
  const sources = readSources();
  const source = sources.find((item) => item.id === id && item.status !== "archived");
  if (!source) return { ok: false, error: "This source could not be found." };

  const updated: StudySource = { ...source, title: title.trim(), updatedAt: new Date().toISOString() };
  if (!writeSources(sources.map((item) => item.id === id ? updated : item))) {
    return { ok: false, error: "Could not save the new name in this browser." };
  }
  return { ok: true, source: updated };
}

export function archiveDemoSource(id: string): DemoStoreResult {
  const sources = readSources();
  const source = sources.find((item) => item.id === id && item.status !== "archived");
  if (!source) return { ok: false, error: "This source could not be found." };

  const updated: StudySource = { ...source, status: "archived", updatedAt: new Date().toISOString() };
  if (!writeSources(sources.map((item) => item.id === id ? updated : item))) {
    return { ok: false, error: "Could not archive this source in this browser." };
  }
  return { ok: true, source: updated };
}
