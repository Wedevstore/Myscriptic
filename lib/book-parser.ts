/**
 * Book Parser — extracts chapters from EPUB and PDF files client-side.
 *
 * Supports two input modes:
 *   1. Local File object (author upload — parsed before/during S3 upload)
 *   2. Remote URL (reader — fetches the book file from S3 via signed URL,
 *      parses on the fly, caches for future reads)
 *
 * EPUB: Unzips with JSZip, parses OPF spine to find chapter order,
 *       extracts HTML content and converts to plain text with headings.
 * PDF:  Uses pdfjs-dist to extract text page-by-page, detects chapter
 *       boundaries from outline bookmarks or heading patterns.
 */

export interface ParsedChapter {
  index: number
  title: string
  content: string
  /** When "html", `content` is sanitized HTML. Otherwise plain text. */
  contentType?: "html" | "text"
}

export interface ParsedBook {
  format: "epub" | "pdf"
  title: string | null
  author: string | null
  chapters: ParsedChapter[]
  totalCharacters: number
  parsedAt: string
  /** Whether chapter content is sanitized HTML or plain text */
  contentType: "html" | "text"
}

// ── localStorage cache (per-book, keyed by bookId) ───────────────────────────

const CHAPTER_STORAGE_KEY = "myscriptic_parsed_books"
const CACHE_VERSION = 2

interface CacheEntry {
  v: number
  data: ParsedBook
}

export function saveParsedBook(bookId: string, parsed: ParsedBook) {
  if (typeof window === "undefined") return
  try {
    const all = loadAllCached()
    all[bookId] = { v: CACHE_VERSION, data: parsed }
    try {
      localStorage.setItem(CHAPTER_STORAGE_KEY, JSON.stringify(all))
    } catch {
      evictOldest(all, bookId, parsed)
    }
  } catch {
    /* storage unavailable */
  }
}

export function loadParsedBook(bookId: string): ParsedBook | null {
  if (typeof window === "undefined") return null
  try {
    const all = loadAllCached()
    const entry = all[bookId]
    if (!entry) return null
    if (entry.v !== CACHE_VERSION) return null
    return entry.data
  } catch {
    return null
  }
}

export function removeParsedBook(bookId: string) {
  if (typeof window === "undefined") return
  try {
    const all = loadAllCached()
    delete all[bookId]
    localStorage.setItem(CHAPTER_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* noop */
  }
}

function loadAllCached(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CHAPTER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return {}
    return parsed as Record<string, CacheEntry>
  } catch {
    return {}
  }
}

function evictOldest(all: Record<string, CacheEntry>, keepId: string, keepData: ParsedBook) {
  const entries = Object.entries(all)
    .filter(([id]) => id !== keepId)
    .sort((a, b) => {
      const ta = new Date(a[1].data.parsedAt).getTime() || 0
      const tb = new Date(b[1].data.parsedAt).getTime() || 0
      return ta - tb
    })

  while (entries.length > 0) {
    const [oldId] = entries.shift()!
    delete all[oldId]
    try {
      all[keepId] = { v: CACHE_VERSION, data: keepData }
      localStorage.setItem(CHAPTER_STORAGE_KEY, JSON.stringify(all))
      return
    } catch {
      /* still too large, evict more */
    }
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

// ── HTML sanitizer (keeps safe structural tags for EPUB rendering) ────────

const SAFE_TAGS = new Set([
  "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
  "em", "i", "strong", "b", "u", "s", "sub", "sup",
  "blockquote", "q", "cite", "abbr", "code", "pre",
  "ul", "ol", "li", "dl", "dt", "dd",
  "a", "img", "figure", "figcaption",
  "div", "span", "section", "article", "aside", "header",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "hr",
])
const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "width", "height"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
}

function sanitizeHtml(html: string, imageResolver?: (src: string) => string | null): string {
  const doc = new DOMParser().parseFromString(html, "text/html")

  // Remove script, style, form, iframe, object, embed
  doc.body.querySelectorAll("script, style, form, iframe, object, embed, link, meta, noscript").forEach(el => el.remove())

  function walk(el: Element): void {
    const children = Array.from(el.children)
    for (const child of children) {
      const tag = child.tagName.toLowerCase()
      if (!SAFE_TAGS.has(tag)) {
        while (child.firstChild) el.insertBefore(child.firstChild, child)
        child.remove()
        continue
      }
      // Strip unsafe attributes
      const allowed = SAFE_ATTRS[tag]
      for (const attr of Array.from(child.attributes)) {
        if (!allowed?.has(attr.name)) child.removeAttribute(attr.name)
      }
      // Force links to open in new tab and be safe
      if (tag === "a") {
        child.setAttribute("target", "_blank")
        child.setAttribute("rel", "noopener noreferrer")
      }
      // Resolve images
      if (tag === "img" && imageResolver) {
        const src = child.getAttribute("src")
        if (src) {
          const resolved = imageResolver(src)
          if (resolved) child.setAttribute("src", resolved)
          else child.remove()
          continue
        }
      }
      walk(child)
    }
  }
  walk(doc.body)

  return doc.body.innerHTML.trim()
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

async function parseEpubBuffer(buffer: ArrayBuffer): Promise<ParsedBook> {
  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(buffer)

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

  // Build manifest for HTML spine items AND image/media items
  const htmlManifest = new Map<string, string>()
  const mediaManifest = new Map<string, { href: string; mediaType: string }>()
  opfDoc.querySelectorAll("manifest > item").forEach(item => {
    const id = item.getAttribute("id")
    const href = item.getAttribute("href")
    const mediaType = item.getAttribute("media-type") ?? ""
    if (!id || !href) return
    if (mediaType.includes("html") || mediaType.includes("xml")) {
      htmlManifest.set(id, href)
    }
    if (mediaType.startsWith("image/")) {
      mediaManifest.set(href, { href, mediaType })
    }
  })

  const spineIds: string[] = []
  opfDoc.querySelectorAll("spine > itemref").forEach(ref => {
    const idref = ref.getAttribute("idref")
    if (idref) spineIds.push(idref)
  })

  // Pre-extract embedded images as base64 data URIs (capped for size)
  const imageCache = new Map<string, string>()
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024

  async function resolveImage(src: string, chapterDir: string): Promise<string | null> {
    const resolved = new URL(src, "file:///" + chapterDir).pathname.replace(/^\//, "")
    if (imageCache.has(resolved)) return imageCache.get(resolved)!
    const zipEntry = zip.file(resolved) || zip.file(opfDir + src)
    if (!zipEntry) return null
    try {
      const bytes = await zipEntry.async("uint8array")
      if (bytes.byteLength > MAX_IMAGE_BYTES) return null
      const mediaInfo = mediaManifest.get(src) || mediaManifest.get(resolved.replace(opfDir, ""))
      const mime = mediaInfo?.mediaType || "image/png"
      let b64 = ""
      const chunk = 8192
      for (let i = 0; i < bytes.length; i += chunk) {
        b64 += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
      }
      const dataUri = `data:${mime};base64,${btoa(b64)}`
      imageCache.set(resolved, dataUri)
      return dataUri
    } catch {
      return null
    }
  }

  const chapters: ParsedChapter[] = []
  let chapterIndex = 0

  for (const id of spineIds) {
    const href = htmlManifest.get(id)
    if (!href) continue

    const fullPath = opfDir + href
    const chapterDir = fullPath.includes("/") ? fullPath.substring(0, fullPath.lastIndexOf("/") + 1) : opfDir
    const chapterHtml = await zip.file(fullPath)?.async("text")
    if (!chapterHtml) continue

    const plainText = htmlToText(chapterHtml)
    if (!plainText || plainText.length < 20) continue

    const title = extractTitleFromHtml(chapterHtml) ?? `Chapter ${chapterIndex + 1}`

    const content = sanitizeHtml(chapterHtml, (src) => {
      // Synchronous check — only returns already-cached images
      const resolved = new URL(src, "file:///" + chapterDir).pathname.replace(/^\//, "")
      return imageCache.get(resolved) ?? null
    })

    // Pre-cache images for this chapter so they are available for sanitizeHtml
    // We do a two-pass: first resolve images, then sanitize
    const imgDoc = new DOMParser().parseFromString(chapterHtml, "text/html")
    const imgSrcs = Array.from(imgDoc.querySelectorAll("img")).map(img => img.getAttribute("src")).filter(Boolean) as string[]
    for (const src of imgSrcs) {
      await resolveImage(src, chapterDir)
    }

    // Re-sanitize with resolved images
    const contentWithImages = sanitizeHtml(chapterHtml, (src) => {
      const resolved = new URL(src, "file:///" + chapterDir).pathname.replace(/^\//, "")
      return imageCache.get(resolved) ?? null
    })

    chapters.push({ index: chapterIndex, title, content: contentWithImages, contentType: "html" })
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
    contentType: "html",
  }
}

// ── PDF Parser ───────────────────────────────────────────────────────────────

const CHAPTER_HEADING_RE = /^(chapter|part|section|prologue|epilogue|introduction|preface|foreword|afterword|appendix)\s*[\d\w.:—–-]*/i

async function parsePdfBuffer(buffer: ArrayBuffer): Promise<ParsedBook> {
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
  let bookAuthor: string | null = null
  try {
    const metadata = await pdf.getMetadata()
    const info = metadata?.info as Record<string, unknown> | undefined
    if (info?.Title && typeof info.Title === "string") bookTitle = info.Title
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
    contentType: "text",
  }
}

// ── Detect format from bytes or filename ─────────────────────────────────────

function detectFormat(buffer: ArrayBuffer, nameHint?: string): "epub" | "pdf" | null {
  if (nameHint) {
    const lower = nameHint.toLowerCase()
    if (lower.endsWith(".epub")) return "epub"
    if (lower.endsWith(".pdf")) return "pdf"
  }
  const bytes = new Uint8Array(buffer, 0, Math.min(8, buffer.byteLength))
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "epub"
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"
  return null
}

// ── Worker-based PDF parsing ─────────────────────────────────────────────────

function parsePdfViaWorker(
  buffer: ArrayBuffer,
  onProgress?: (msg: string) => void
): Promise<ParsedBook> {
  return new Promise<ParsedBook>((resolve, reject) => {
    let worker: Worker
    try {
      worker = new Worker(
        new URL("./book-parser-worker.ts", import.meta.url),
        { type: "module" }
      )
    } catch {
      // Workers unsupported — fallback to main thread
      onProgress?.("Parsing PDF pages…")
      parsePdfBuffer(buffer).then(resolve, reject)
      return
    }

    worker.addEventListener("message", (e) => {
      const { type, data, message } = e.data
      if (type === "progress") onProgress?.(message)
      else if (type === "result") { worker.terminate(); resolve(data as ParsedBook) }
      else if (type === "error") { worker.terminate(); reject(new Error(message)) }
    })
    worker.addEventListener("error", (e) => {
      worker.terminate()
      reject(new Error(e.message || "PDF worker error"))
    })
    worker.postMessage({ type: "parse-pdf", buffer }, [buffer])
  })
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Parse a local File object (used during author upload). */
export async function parseBookFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ParsedBook> {
  const name = file.name.toLowerCase()

  if (name.endsWith(".epub")) {
    onProgress?.("Extracting EPUB chapters…")
    const buffer = await file.arrayBuffer()
    return parseEpubBuffer(buffer)
  }

  if (name.endsWith(".pdf")) {
    onProgress?.("Parsing PDF pages…")
    const buffer = await file.arrayBuffer()
    return parsePdfViaWorker(buffer, onProgress)
  }

  throw new Error("Unsupported file format. Please upload a PDF or EPUB file.")
}

/**
 * Fetch a book file from a remote URL (S3 signed URL) and parse it.
 * Used by the reader to load book content on-the-fly.
 *
 * Flow:
 *   1. Check localStorage cache → return immediately if cached
 *   2. Fetch the file from S3
 *   3. Detect format (EPUB vs PDF) from bytes and URL extension
 *   4. Parse into chapters
 *   5. Cache in localStorage for next time
 *   6. Return parsed book
 */
export async function fetchAndParseBook(
  bookId: string,
  signedUrl: string,
  onProgress?: (msg: string) => void
): Promise<ParsedBook> {
  const cached = loadParsedBook(bookId)
  if (cached) return cached

  onProgress?.("Downloading book from server…")
  const response = await fetch(signedUrl)
  if (!response.ok) {
    throw new Error(`Failed to download book file (HTTP ${response.status})`)
  }

  const contentLength = Number(response.headers.get("content-length") || 0)
  if (contentLength > 200 * 1024 * 1024) {
    throw new Error("Book file is too large to parse in the browser (>200 MB).")
  }

  let buffer: ArrayBuffer
  if (response.body && typeof ReadableStream !== "undefined" && contentLength > 0) {
    onProgress?.("Downloading… 0%")
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.byteLength
      const pct = Math.min(99, Math.round((received / contentLength) * 100))
      onProgress?.(`Downloading… ${pct}%`)
    }
    const merged = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.byteLength
    }
    buffer = merged.buffer
  } else {
    buffer = await response.arrayBuffer()
  }

  const urlPath = new URL(signedUrl, "https://x").pathname
  const format = detectFormat(buffer, urlPath)

  if (format === "epub") {
    onProgress?.("Extracting EPUB chapters…")
    const parsed = await parseEpubBuffer(buffer)
    saveParsedBook(bookId, parsed)
    return parsed
  }

  if (format === "pdf") {
    onProgress?.("Parsing PDF pages…")
    const parsed = await parsePdfViaWorker(buffer, onProgress)
    saveParsedBook(bookId, parsed)
    return parsed
  }

  throw new Error("Could not determine the book format. The file may be corrupted or unsupported.")
}
