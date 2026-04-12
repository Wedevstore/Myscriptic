/**
 * Web Worker for PDF parsing — offloads CPU-heavy text extraction
 * from the main thread to avoid blocking the UI.
 *
 * Receives: { type: "parse-pdf", buffer: ArrayBuffer }
 * Sends:    { type: "progress", message: string }
 *           { type: "result", data: ParsedBook }
 *           { type: "error", message: string }
 */

const CHAPTER_HEADING_RE = /^(chapter|part|section|prologue|epilogue|introduction|preface|foreword|afterword|appendix)\s*[\d\w.:—–-]*/i

interface ParsedChapter {
  index: number
  title: string
  content: string
}

interface ParsedBook {
  format: "epub" | "pdf"
  title: string | null
  author: string | null
  chapters: ParsedChapter[]
  totalCharacters: number
  parsedAt: string
  contentType: "html" | "text"
}

async function parsePdf(buffer: ArrayBuffer): Promise<ParsedBook> {
  const pdfjsLib = await import("pdfjs-dist")

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  let outline: { title: string; pageIndex: number }[] = []
  try {
    const rawOutline = await pdf.getOutline()
    if (rawOutline && rawOutline.length > 0) {
      const resolved: { title: string; pageIndex: number }[] = []
      for (const item of rawOutline) {
        if (!item.title || !item.dest) continue
        try {
          let dest: string | unknown[] | null = item.dest
          if (typeof dest === "string") dest = await pdf.getDestination(dest)
          if (dest != null && Array.isArray(dest) && dest[0]) {
            const pageIndex = await pdf.getPageIndex(
              dest[0] as Parameters<typeof pdf.getPageIndex>[0]
            )
            resolved.push({ title: item.title.trim(), pageIndex })
          }
        } catch { /* skip */ }
      }
      outline = resolved.sort((a, b) => a.pageIndex - b.pageIndex)
    }
  } catch { /* no outline */ }

  const pageTexts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    if (i % 20 === 0) {
      self.postMessage({ type: "progress", message: `Reading page ${i} of ${pdf.numPages}…` })
    }
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item: unknown) => {
        const t = item as { str?: string; hasEOL?: boolean }
        return (t.str ?? "") + (t.hasEOL ? "\n" : "")
      })
      .join("")
      .trim()
    pageTexts.push(text)
  }

  const chapters: ParsedChapter[] = []

  if (outline.length >= 2) {
    for (let i = 0; i < outline.length; i++) {
      const start = outline[i].pageIndex
      const end = i + 1 < outline.length ? outline[i + 1].pageIndex : pdf.numPages
      const content = pageTexts.slice(start, end).join("\n\n").trim()
      if (!content || content.length < 20) continue
      chapters.push({ index: chapters.length, title: outline[i].title, content })
    }
  } else {
    let currentChapter: { title: string; pages: string[] } = { title: "Chapter 1", pages: [] }

    for (let i = 0; i < pageTexts.length; i++) {
      const text = pageTexts[i]
      const firstLine = text.split("\n")[0]?.trim() ?? ""

      if (i > 0 && CHAPTER_HEADING_RE.test(firstLine) && currentChapter.pages.length > 0) {
        const content = currentChapter.pages.join("\n\n").trim()
        if (content.length >= 20) {
          chapters.push({ index: chapters.length, title: currentChapter.title, content })
        }
        currentChapter = {
          title: firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine,
          pages: [],
        }
      }
      currentChapter.pages.push(text)
    }

    const lastContent = currentChapter.pages.join("\n\n").trim()
    if (lastContent.length >= 20) {
      chapters.push({ index: chapters.length, title: currentChapter.title, content: lastContent })
    }

    if (chapters.length <= 1 && pdf.numPages > 10) {
      chapters.length = 0
      const pagesPerChapter = Math.ceil(pdf.numPages / Math.min(20, Math.ceil(pdf.numPages / 10)))
      for (let i = 0; i < pdf.numPages; i += pagesPerChapter) {
        const end = Math.min(i + pagesPerChapter, pdf.numPages)
        const content = pageTexts.slice(i, end).join("\n\n").trim()
        if (content.length < 20) continue
        chapters.push({
          index: chapters.length,
          title: `Section ${chapters.length + 1} (Pages ${i + 1}–${end})`,
          content,
        })
      }
    }
  }

  if (chapters.length === 0 && pageTexts.some(t => t.length > 0)) {
    chapters.push({ index: 0, title: "Full Document", content: pageTexts.join("\n\n").trim() })
  }

  if (chapters.length === 0) {
    throw new Error("No readable text found in this PDF file.")
  }

  let bookTitle: string | null = null
  let bookAuthor: string | null = null
  try {
    const metadata = await pdf.getMetadata()
    const info = metadata?.info as Record<string, unknown> | undefined
    if (info?.Title && typeof info.Title === "string") bookTitle = info.Title
    if (info?.Author && typeof info.Author === "string") bookAuthor = info.Author
  } catch { /* no metadata */ }

  return {
    format: "pdf",
    title: bookTitle,
    author: bookAuthor,
    chapters,
    totalCharacters: chapters.reduce((sum, ch) => sum + ch.content.length, 0),
    parsedAt: new Date().toISOString(),
    contentType: "text",
  }
}

self.addEventListener("message", async (e) => {
  const { type, buffer } = e.data
  if (type !== "parse-pdf") return
  try {
    self.postMessage({ type: "progress", message: "Starting PDF extraction…" })
    const result = await parsePdf(buffer)
    self.postMessage({ type: "result", data: result })
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "PDF parsing failed in worker.",
    })
  }
})
