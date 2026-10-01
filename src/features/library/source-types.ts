export type SourceType = "pdf" | "docx" | "text";

export type SourceStatus = "uploaded" | "processing" | "ready" | "failed" | "archived";

export type StudySource = {
  id: string;
  title: string;
  sourceType: SourceType;
  status: SourceStatus;
  sourceText: string | null;
  byteSize: number | null;
  createdAt: string;
  updatedAt: string;
  storagePath: string | null;
};
