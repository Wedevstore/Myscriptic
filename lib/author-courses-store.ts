/**
 * Author video courses — lesson videos are YouTube/Vimeo links only (no uploads).
 */

import { slugify } from "@/lib/slugify"
import type { CourseAccessType } from "@/lib/course-access"

function ls<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet<T>(key: string, val: T) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* quota */
  }
}

function notifyCoursesChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("author-courses-changed"))
}

function uid() {
  return `c_${Math.random().toString(36).slice(2, 12)}`
}

function lessonUid() {
  return `l_${Math.random().toString(36).slice(2, 12)}`
}

function now() {
  return new Date().toISOString()
}

const KEY = "mys_author_courses"

export interface AuthorCourseLesson {
  id: string
  title: string
  /** Pasted YouTube or Vimeo URL */
  videoUrl: string
  sortOrder: number
}

export interface AuthorCourse {
  id: string
  authorId: string
  authorName: string
  title: string
  slug: string
  description: string
  thumbnailUrl: string | null
  published: boolean
  accessType: CourseAccessType
  /** Set when accessType is PAID (marketplace parity with books). */
  price: number | null
  currency: string
  lessons: AuthorCourseLesson[]
  /** Set when loaded from GET /courses list (no embedded lessons). */
  lessonCount?: number
  createdAt: string
  updatedAt: string
}

export function courseLessonCount(c: AuthorCourse): number {
  return c.lessonCount ?? c.lessons.length
}

function normalizeCourse(raw: AuthorCourse): AuthorCourse {
  const a = raw.accessType
  const accessType: CourseAccessType =
    a === "FREE" || a === "PAID" || a === "SUBSCRIPTION" ? a : "SUBSCRIPTION"
  return {
    ...raw,
    accessType,
    price: raw.price ?? null,
    currency: raw.currency ?? "USD",
  }
}

function uniqueSlug(base: string, excludeId?: string): string {
  let s = slugify(base) || "course"
  const all = authorCourseStore.getAll()
  if (!all.some(c => c.slug === s && c.id !== excludeId)) return s
  let n = 2
  while (all.some(c => c.slug === `${s}-${n}` && c.id !== excludeId)) n += 1
  return `${s}-${n}`
}

export const authorCourseStore = {
  getAll(): AuthorCourse[] {
    return ls<AuthorCourse[]>(KEY, []).map(normalizeCourse)
  },

  getPublished(): AuthorCourse[] {
    return this.getAll()
      .filter(c => c.published)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  },

  getByAuthor(authorId: string): AuthorCourse[] {
    return this.getAll()
      .filter(c => c.authorId === authorId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  },

  getById(id: string): AuthorCourse | undefined {
    return this.getAll().find(c => c.id === id)
  },

  getBySlug(slug: string): AuthorCourse | undefined {
    return this.getAll().find(c => c.slug === slug)
  },

  create(data: {
    authorId: string
    authorName: string
    title: string
    description: string
    thumbnailUrl: string | null
    published: boolean
    accessType?: CourseAccessType
    price?: number | null
    currency?: string
    lessons: Omit<AuthorCourseLesson, "id" | "sortOrder">[]
    /** If set, used as the base for the URL slug (deduped). */
    slugBase?: string | null
  }): AuthorCourse {
    const slug = uniqueSlug(data.slugBase?.trim() || data.title)
    const lessons: AuthorCourseLesson[] = data.lessons.map((l, i) => ({
      ...l,
      id: lessonUid(),
      sortOrder: i,
    }))
    const accessType = data.accessType ?? "SUBSCRIPTION"
    const price = accessType === "PAID" && data.price != null ? data.price : null
    const rec: AuthorCourse = {
      id: uid(),
      authorId: data.authorId,
      authorName: data.authorName,
      title: data.title.trim(),
      slug,
      description: data.description.trim(),
      thumbnailUrl: data.thumbnailUrl?.trim() || null,
      published: data.published,
      accessType,
      price,
      currency: data.currency ?? "USD",
      lessons,
      createdAt: now(),
      updatedAt: now(),
    }
    lsSet(KEY, [...this.getAll(), rec])
    notifyCoursesChanged()
    return rec
  },

  update(id: string, patch: Partial<Omit<AuthorCourse, "id" | "createdAt">> & { lessons?: AuthorCourseLesson[] }) {
    const all = this.getAll()
    const cur = all.find(c => c.id === id)
    if (!cur) return
    let slug = patch.slug !== undefined ? slugify(patch.slug) || cur.slug : cur.slug
    if (patch.title !== undefined && patch.slug === undefined) {
      slug = uniqueSlug(patch.title, id)
    }
    if (slug !== cur.slug && all.some(c => c.slug === slug && c.id !== id)) {
      slug = uniqueSlug(slug, id)
    }
    const next: AuthorCourse = {
      ...cur,
      ...patch,
      slug,
      title: patch.title !== undefined ? patch.title.trim() : cur.title,
      description: patch.description !== undefined ? patch.description.trim() : cur.description,
      thumbnailUrl:
        patch.thumbnailUrl !== undefined
          ? patch.thumbnailUrl?.trim() || null
          : cur.thumbnailUrl,
      lessons: patch.lessons
        ? patch.lessons.map((l, i) => ({ ...l, sortOrder: i }))
        : cur.lessons,
      updatedAt: now(),
    }
    lsSet(
      KEY,
      all.map(c => (c.id === id ? next : c))
    )
    notifyCoursesChanged()
  },

  delete(id: string) {
    lsSet(
      KEY,
      this.getAll().filter(c => c.id !== id)
    )
    notifyCoursesChanged()
  },
}

/** Idempotent demo data */
export function seedAuthorCourses() {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV === "production") return
  if (authorCourseStore.getAll().length > 0) return
  authorCourseStore.create({
    authorId: "usr_author_1",
    authorName: "Jane Austen",
    title: "Fiction Workshop: From Idea to Outline",
    description:
      "Short lessons on hooks, character wants, and three-act structure. Videos hosted on YouTube and Vimeo — watch here on MyScriptic.",
    thumbnailUrl: "https://placehold.co/640x360/1a1a2e/FFB547?text=Author+Course",
    published: true,
    accessType: "SUBSCRIPTION",
    price: null,
    currency: "USD",
    lessons: [
      {
        title: "Opening hooks that grab readers",
        videoUrl: "https://www.youtube.com/watch?v=34Na4j8AVgA",
      },
      {
        title: "Pacing your middle act",
        videoUrl: "https://vimeo.com/148751763",
      },
    ],
  })
}
