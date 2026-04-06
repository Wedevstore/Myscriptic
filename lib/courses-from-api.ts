import type { AuthorCourse, AuthorCourseLesson } from "@/lib/author-courses-store"
import type { CourseAccessType } from "@/lib/course-access"

/** Public list card from GET /courses (includes lesson_count, no lessons array). */
export type ApiCourseCard = {
  id: string
  author_id: string
  author_name: string
  title: string
  slug: string
  description: string
  thumbnail_url: string | null
  published: boolean
  access_type?: CourseAccessType
  price?: number | null
  currency?: string | null
  lesson_count: number
  created_at?: string | null
  updated_at?: string | null
}

/** Full course from GET /courses/{slug} or author CRUD. */
export type ApiCourseDetail = Omit<ApiCourseCard, "lesson_count"> & {
  lesson_count?: number
  lessons: {
    id: string
    title: string
    video_url: string
    sort_order: number
  }[]
}

function mapAccessFields(row: ApiCourseCard | ApiCourseDetail): Pick<AuthorCourse, "accessType" | "price" | "currency"> {
  const raw = row.access_type ?? "SUBSCRIPTION"
  const accessType: CourseAccessType =
    raw === "FREE" || raw === "PAID" || raw === "SUBSCRIPTION" ? raw : "SUBSCRIPTION"
  const price = row.price != null && Number.isFinite(Number(row.price)) ? Number(row.price) : null
  return {
    accessType,
    price,
    currency: row.currency ?? "USD",
  }
}

export function mapLessonFromApi(l: ApiCourseDetail["lessons"][number]): AuthorCourseLesson {
  return {
    id: l.id,
    title: l.title,
    videoUrl: l.video_url,
    sortOrder: l.sort_order,
  }
}

export function mapAuthorCourseDetailFromApi(row: ApiCourseDetail): AuthorCourse {
  const lessons = [...(row.lessons ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(mapLessonFromApi)

  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    thumbnailUrl: row.thumbnail_url,
    published: row.published,
    lessons,
    ...mapAccessFields(row),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

/** List rows omit lessons; expose counts via lessonCount. */
export function mapAuthorCourseCardFromApi(row: ApiCourseCard): AuthorCourse {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    thumbnailUrl: row.thumbnail_url,
    published: row.published,
    lessons: [],
    lessonCount: row.lesson_count,
    ...mapAccessFields(row),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

export type ApiAuthorCourseSummary = {
  slug: string
  title: string
  lesson_count: number
  thumbnail_url: string | null
  access_type?: CourseAccessType
  price?: number | null
  currency?: string | null
}
