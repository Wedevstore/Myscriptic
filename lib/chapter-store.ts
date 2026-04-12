/**
 * IndexedDB-based chapter cache for parsed books.
 * Falls back to localStorage when IndexedDB is unavailable.
 */

import type { ParsedBook } from "./book-parser"

const DB_NAME = "myscriptic_books"
const DB_VERSION = 1
const STORE_NAME = "parsed_books"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "bookId" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

interface StoredEntry {
  bookId: string
  data: ParsedBook
  storedAt: number
}

export async function idbSaveParsedBook(bookId: string, parsed: ParsedBook): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const entry: StoredEntry = { bookId, data: parsed, storedAt: Date.now() }
    store.put(entry)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Fallback to legacy localStorage
    const { saveParsedBook } = await import("./book-parser")
    saveParsedBook(bookId, parsed)
  }
}

export async function idbLoadParsedBook(bookId: string): Promise<ParsedBook | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const result = await new Promise<StoredEntry | undefined>((resolve, reject) => {
      const req = store.get(bookId)
      req.onsuccess = () => resolve(req.result as StoredEntry | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return result?.data ?? null
  } catch {
    // Fallback to legacy localStorage
    const { loadParsedBook } = await import("./book-parser")
    return loadParsedBook(bookId)
  }
}

export async function idbRemoveParsedBook(bookId: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readwrite")
    tx.objectStore(STORE_NAME).delete(bookId)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    const { removeParsedBook } = await import("./book-parser")
    removeParsedBook(bookId)
  }
}

/**
 * Evict oldest entries to keep the total count below `maxEntries`.
 */
export async function idbEvictOldest(maxEntries = 50): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const all = await new Promise<StoredEntry[]>((resolve, reject) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result as StoredEntry[])
      req.onerror = () => reject(req.error)
    })
    if (all.length <= maxEntries) { db.close(); return }
    all.sort((a, b) => a.storedAt - b.storedAt)
    const toRemove = all.slice(0, all.length - maxEntries)
    for (const entry of toRemove) {
      store.delete(entry.bookId)
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    /* noop */
  }
}
