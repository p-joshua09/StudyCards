import { Unzip, UnzipInflate, unzipSync } from "fflate";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;

const MAX_PDF_PAGES = 120;
const MAX_EXTRACTED_CHARACTERS = 200_000;
const MAX_DOCX_ENTRIES = 1_000;
const MAX_DOCX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_DOCX_UNCOMPRESSED_BYTES = 40 * 1024 * 1024;

export type ExtractedSource = {
  sourceType: "pdf" | "docx" | "text";
  text: string;
};

function getSourceType(file: File): ExtractedSource["sourceType"] {
  const extension = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();

  if (extension !== "pdf" && extension !== "docx" && extension !== "txt") {
    throw new Error("Choose a PDF, Word (.docx), or plain text (.txt) file.");
  }

  const acceptedMimeTypes: Record<ExtractedSource["sourceType"], string[]> = {
    pdf: ["application/pdf", "application/x-pdf"],
    docx: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
    ],
    text: ["text/plain"],
  };
  const sourceType = extension === "txt" ? "text" : extension;
  const mimeType = file.type.split(";")[0].trim().toLowerCase();

  // Some browsers omit the type for local files. Inspect the bytes below too.
  if (
    mimeType &&
    mimeType !== "application/octet-stream" &&
    !acceptedMimeTypes[sourceType].includes(mimeType)
  ) {
    throw new Error("The file type does not match its extension. Choose a PDF, .docx, or .txt file.");
  }

  return sourceType;
}

function checkedText(text: string, sourceType: ExtractedSource["sourceType"]): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim();

  if (!normalized || !/[\p{L}\p{N}]/u.test(normalized)) {
    if (sourceType === "pdf") {
      throw new Error(
        "This PDF has no selectable text. Scanned pages need OCR before they can be imported.",
      );
    }

    throw new Error("This file has no readable text to import.");
  }

  if (normalized.length > MAX_EXTRACTED_CHARACTERS) {
    throw new Error("This file has too much text to import at once. Split it into smaller files.");
  }

  return normalized;
}

function readPlainText(bytes: Uint8Array): string {
  let encoding = "utf-8";

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = "utf-16le";
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = "utf-16be";
  }

  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) {
      throw new Error("This text file contains binary data.");
    }
    return text;
  } catch {
    throw new Error("This text file could not be read. Save it as UTF-8 and try again.");
  }
}

async function readPdf(bytes: Uint8Array): Promise<string> {
  if (new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") {
    throw new Error("This does not appear to be a valid PDF file.");
  }

  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  try {
    pdf = await getDocumentProxy(bytes, { maxImageSize: 16_777_216 });

    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`This PDF has more than ${MAX_PDF_PAGES} pages. Split it into smaller files.`);
    }

    const result = await extractText(pdf, { mergePages: true });
    return checkedText(result.text, "pdf");
  } catch (error) {
    if (error instanceof Error && /^(This PDF|This file)/.test(error.message)) {
      throw error;
    }
    throw new Error("This PDF could not be read. Check that it is not damaged or password-protected.");
  } finally {
    await pdf?.cleanup().catch(() => undefined);
  }
}

async function readDocx(bytes: Uint8Array): Promise<string> {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error("This does not appear to be a valid .docx file.");
  }

  try {
    let entryCount = 0;
    let totalUncompressedBytes = 0;
    let hasDocumentXml = false;
    let hasContentTypes = false;

    // Check ZIP metadata without decompressing entries into memory. Mammoth's
    // ZIP reader runs only after this cap has rejected oversized archives.
    unzipSync(bytes, {
      filter(entry) {
        entryCount += 1;
        totalUncompressedBytes += entry.originalSize;
        hasDocumentXml ||= entry.name === "word/document.xml";
        hasContentTypes ||= entry.name === "[Content_Types].xml";

        if (
          entryCount > MAX_DOCX_ENTRIES ||
          !Number.isSafeInteger(entry.originalSize) ||
          entry.originalSize > MAX_DOCX_ENTRY_BYTES ||
          totalUncompressedBytes > MAX_DOCX_UNCOMPRESSED_BYTES
        ) {
          throw new Error("This Word file is too large inside. Split it into smaller files.");
        }

        return false;
      },
    });

    if (!hasDocumentXml || !hasContentTypes) {
      throw new Error("This does not appear to be a valid .docx file.");
    }

    // Metadata can lie. Stream every entry once and count actual expanded bytes
    // before handing the archive to Mammoth's in-memory DOCX reader.
    let actualTotalBytes = 0;
    let actualEntryCount = 0;
    const unzip = new Unzip((entry) => {
      actualEntryCount += 1;
      if (actualEntryCount > MAX_DOCX_ENTRIES) {
        throw new Error("This Word file has too many parts to import.");
      }

      let actualEntryBytes = 0;
      entry.ondata = (error, chunk) => {
        if (error) {
          throw new Error("This Word file could not be read. Save it as .docx and try again.");
        }
        actualEntryBytes += chunk.length;
        actualTotalBytes += chunk.length;
        if (
          actualEntryBytes > MAX_DOCX_ENTRY_BYTES ||
          actualTotalBytes > MAX_DOCX_UNCOMPRESSED_BYTES
        ) {
          throw new Error("This Word file is too large inside. Split it into smaller files.");
        }
      };
      entry.start();
    });
    unzip.register(UnzipInflate);
    for (let offset = 0; offset < bytes.length; offset += 8 * 1024) {
      const end = Math.min(offset + 8 * 1024, bytes.length);
      unzip.push(bytes.subarray(offset, end), end === bytes.length);
    }

    if (actualEntryCount !== entryCount) {
      throw new Error("This Word file could not be read. Save it as .docx and try again.");
    }

    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return checkedText(result.value, "docx");
  } catch (error) {
    if (error instanceof Error && /^This (file|Word|does)/.test(error.message)) {
      throw error;
    }
    throw new Error("This Word file could not be read. Save it as .docx and try again.");
  }
}

/** Extract text on the server; never treat a filename or MIME type as proof of content. */
export async function extractSourceFile(file: File): Promise<ExtractedSource> {
  if (!(file instanceof File)) {
    throw new Error("Choose a file to upload.");
  }

  if (file.size === 0) {
    throw new Error("This file is empty. Choose a file with readable text.");
  }

  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error("Choose a file smaller than 10 MB.");
  }

  const sourceType = getSourceType(file);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    throw new Error("This file could not be opened. Try uploading it again.");
  }
  let text: string;

  switch (sourceType) {
    case "pdf":
      text = await readPdf(bytes);
      break;
    case "docx":
      text = await readDocx(bytes);
      break;
    default:
      text = checkedText(readPlainText(bytes), "text");
  }

  return { sourceType, text };
}
