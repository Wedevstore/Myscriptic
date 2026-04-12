/**
 * Book Parser — extracts chapters from EPUB and PDF files client-side.
 *
 * EPUB: Unzips with JSZip, parses OPF spine to find chapter order,
 *       extracts HTML content and converts to plain text with headings.
 * PDF:  Uses pdfjs-dist to extract text page-by-page, detects chapter
 *       boundaries from outline bookmarks or heading patterns.
 *
 * Parsed chapters are stored in localStorage and can be sent to the API.
 */

export interface ParsedChapter {
  index: number
  title: string
  content: string
}

export interface ParsedBook {
  format: "epub" | "pdf"
  title: string | null
  author: string | null
  chapters: ParsedChapter[]
  totalCharacters: number
  parsedAt: string
}

const CHAPTER_STORAGE_KEY = "myscriptic_parsed_books"

// ── Storage ──────────────────────────────────────────────────────────────────

export function saveParsedBook(bookId: string, parsed: ParsedBook) {
  if (typeof window === "undefined") return
  try {
    const all = JSON.parse(localStorage.getItem(CHAPTER_STORAGE_KEY) ?? "{}")
    all[bookId] = parsed
    localStorage.setItem(CHAPTER_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* storage full or unavailable */
  }
}

export function loadParsedBook(bookId: string): ParsedBook | null {
  if (typeof window === "undefined") return null
  try {
    const all = JSON.parse(localStorage.getItem(CHAPTER_STORAGE_KEY) ?? "{}")
    return all[bookId] ?? null
  } catch {
    return null
  }
}

export function removeParsedBook(bookId: string) {
  if (typeof window === "undefined") return
  try {
    const all = JSON.parse(localStorage.getItem(CHAPTER_STORAGE_KEY) ?? "{}")
    delete all[bookId]
    localStorage.setItem(CHAPTER_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* noop */
  }
}

// ── HTML → plain text ────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)

  const lines: string[] = []
  let node: Node | null

  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ")
      if (text.trim()) lines.push(text)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase()
      if (["p", "div", "br", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote"].includes(tag)) {
        if (lines.length > 0 && lines[lines.length - 1] !== "\n") {
          lines.push("\n")
        }
        if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
          lines.push("\n")
        }
      }
    }
  }

  return lines
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function extractTitleFromHtml(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html")
  for (const tag of ["h1", "h2", "h3", "h4"]) {
    const el = doc.querySelector(tag)
    if (el?.textContent?.trim()) return el.textContent.trim()
  }
  const titleEl = doc.querySelector("title")
  if (titleEl?.textContent?.trim()) return titleEl.textContent.trim()
  return null
}

// ── EPUB Parser ──────────────────────────────────────────────────────────────

async function parseEpub(file: File): Promise<ParsedBook> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(file)

  const containerXml = await zip.file("META-INF/container.xml")?.async("text")
  if (!containerXml) throw new Error("Invalid EPUB: missing container.xml")

  const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml")
  const rootfilePath = containerDoc.querySelector("rootfile")?.getAttribute("full-path")
  if (!rootfilePath) throw new Error("Invalid EPUB: no rootfile path")

  const opfText = await zip.file(rootfilePath)?.async("text")
  if (!opfText) throw new Error("Invalid EPUB: OPF file not found")

  const opfDoc = new DOMParser().parseFromString(opfText, "application/xml")
  const opfDir = rootfilePath.includes("/") ? rootfilePath.substring(0, rootfilePath.lastIndexOf("/") + 1) : ""

  const bookTitle = opfDoc.querySelector("metadata > *|title, metadata title")?.textContent?.trim() ?? null
  const bookAuthor = opfDoc.querySelector("metadata > *|creator, metadata creator")?.textContent?.trim() ?? null

  const manifest = new Map<string, string>()
  opfDoc.querySelectorAll("manifest > item").forEach(item => {
    const id = item.getAttribute("id")
    const href = item.getAttribute("href")
    const mediaType = item.getAttribute("media-type") ?? ""
    if (id && href && (mediaType.includes("html") || mediaType.includes("xml"))) {
      manifest.set(id, href)
    }
  })

  const spineIds: string[] = []
  opfDoc.querySelectorAll("spine > itemref").forEach(ref => {
    const idref = ref.getAttribute("idref")
    if (idref) spineIds.push(idref)
  })

  const chapters: ParsedChapter[] = []
  let chapterIndex = 0

  for (const id of spineIds) {
    const href = manifest.get(id)
    if (!href) continue

    const fullPath = opfDir + href
    const chapterHtml = await zip.file(fullPath)?.async("text")
    if (!chapterHtml) continue

    const content = htmlToText(chapterHtml)
    if (!content || content.length < 20) continue

    const title = extractTitleFromHtml(chapterHtml) ?? `Chapter ${chapterIndex + 1}`

    chapters.push({
      index: chapterIndex,
      title,
      content,
    })
    chapterIndex++
  }

  if (chapters.length === 0) {
    throw new Error("No readable chapters found in this EPUB file.")
  }

  return {
    format: "epub",
    title: bookTitle,
    author: bookAuthor,
    chapters,
    totalCharacters: chapters.reduce((sum, ch) => sum + ch.content.length, 0),
    parsedAt: new Date().toISOString(),
  }
}

// ── PDF Parser ───────────────────────────────────────────────────────────────

const CHAPTER_HEADING_RE = /^(chapter|part|section|prologue|epilogue|introduction|preface|foreword|afterword|appendix)\s*[\d\w.:—–-]*/i

async function parsePdf(file: File): Promise<ParsedBook> {
  const pdfjsLib = await import("pdfjs-dist")

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let outline: { title: string; pageIndex: number }[] = []
  try {
    const rawOutline = await pdf.getOutline()
    if (rawOutline && rawOutline.length > 0) {
      const resolved: { title: string; pageIndex: number }[] = []
      for (const item of rawOutline) {
        if (!item.title || !item.dest) continue
        try {
          let dest: string | unknown[] | null = item.dest
          if (typeof dest === "string") {
            dest = await pdf.getDestination(dest)
          }
          if (dest != null && Array.isArray(dest) && dest[0]) {
            const pageIndex = await pdf.getPageIndex(
              dest[0] as Parameters<typeof pdf.getPageIndex>[0]
            )
            resolved.push({ title: item.title.trim(), pageIndex })
          }
        } catch {
          /* skip unresolvable dest */
        }
      }
      outline = resolved.sort((a, b) => a.pageIndex - b.pageIndex)
    }
  } catch {
    /* no outline */
  }

  const pageTexts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
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
      chapters.push({
        index: chapters.length,
        title: outline[i].title,
        content,
      })
    }
  } else {
    let currentChapter: { title: string; pages: string[] } = {
      title: "Chapter 1",
      pages: [],
    }
    let chapterCount = 1

    for (let i = 0; i < pageTexts.length; i++) {
      const text = pageTexts[i]
      const firstLine = text.split("\n")[0]?.trim() ?? ""

      if (i > 0 && CHAPTER_HEADING_RE.test(firstLine) && currentChapter.pages.length > 0) {
        const content = currentChapter.pages.join("\n\n").trim()
        if (content.length >= 20) {
          chapters.push({
            index: chapters.length,
            title: currentChapter.title,
            content,
          })
        }
        chapterCount++
        currentChapter = {
          title: firstLine.length > 80 ? firstLine.slice(0, 77) + "…" : firstLine,
          pages: [],
        }
      }
      currentChapter.pages.push(text)
    }

    const lastContent = currentChapter.pages.join("\n\n").trim()
    if (lastContent.length >= 20) {
      chapters.push({
        index: chapters.length,
        title: currentChapter.title,
        content: lastContent,
      })
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
    chapters.push({
      index: 0,
      title: "Full Document",
      content: pageTexts.join("\n\n").trim(),
    })
  }

  if (chapters.length === 0) {
    throw new Error("No readable text found in this PDF file.")
  }

  let bookTitle: string | null = null
  try {
    const metadata = await pdf.getMetadata()
    const info = metadata?.info as Record<string, unknown> | undefined
    if (info?.Title && typeof info.Title === "string") bookTitle = info.Title
  } catch {
    /* no metadata */
  }

  let bookAuthor: string | null = null
  try {
    const metadata = await pdf.getMetadata()
    const info = metadata?.info as Record<string, unknown> | undefined
    if (info?.Author && typeof info.Author === "string") bookAuthor = info.Author
  } catch {
    /* no metadata */
  }

  return {
    format: "pdf",
    title: bookTitle,
    author: bookAuthor,
    chapters,
    totalCharacters: chapters.reduce((sum, ch) => sum + ch.content.length, 0),
    parsedAt: new Date().toISOString(),
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function parseBookFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ParsedBook> {
  const name = file.name.toLowerCase()

  if (name.endsWith(".epub")) {
    onProgress?.("Extracting EPUB chapters…")
    return parseEpub(file)
  }

  if (name.endsWith(".pdf")) {
    onProgress?.("Parsing PDF pages…")
    return parsePdf(file)
  }

  throw new Error(`Unsupported file format. Please upload a PDF or EPUB file.`)
}
