/** Session-scoped prefs for the course video player (no cross-tab PII). */

const VOL_KEY = "myscriptic-course-video-volume"
const MUTE_KEY = "myscriptic-course-video-muted"
const SPEED_IDX_KEY = "myscriptic-course-video-speed-idx"

export function readCourseVideoVolume(): number {
  if (typeof window === "undefined") return 80
  try {
    const raw = sessionStorage.getItem(VOL_KEY)
    if (raw == null) return 80
    const n = Number(raw)
    if (!Number.isFinite(n)) return 80
    return Math.min(100, Math.max(0, Math.round(n)))
  } catch {
    return 80
  }
}

export function writeCourseVideoVolume(v: number): void {
  try {
    sessionStorage.setItem(VOL_KEY, String(Math.min(100, Math.max(0, Math.round(v)))))
  } catch {
    /* private mode, quota */
  }
}

export function readCourseVideoMuted(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(MUTE_KEY) === "1"
  } catch {
    return false
  }
}

export function writeCourseVideoMuted(m: boolean): void {
  try {
    sessionStorage.setItem(MUTE_KEY, m ? "1" : "0")
  } catch {
    /* ignore */
  }
}

/** Index into the player speed ladder (0 … speedCount - 1). */
export function readCourseVideoSpeedIndex(speedCount: number, defaultIdx: number): number {
  if (typeof window === "undefined" || speedCount < 1) return defaultIdx
  try {
    const raw = sessionStorage.getItem(SPEED_IDX_KEY)
    if (raw == null) return defaultIdx
    const n = Number(raw)
    if (!Number.isFinite(n)) return defaultIdx
    const i = Math.round(n)
    return Math.min(speedCount - 1, Math.max(0, i))
  } catch {
    return defaultIdx
  }
}

export function writeCourseVideoSpeedIndex(i: number): void {
  try {
    sessionStorage.setItem(SPEED_IDX_KEY, String(Math.max(0, Math.round(i))))
  } catch {
    /* ignore */
  }
}
