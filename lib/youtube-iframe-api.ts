/**
 * Load the YouTube IFrame API once (client-only). Safe to call from multiple components.
 */
let youTubeIframeApiPromise: Promise<void> | null = null

export function loadYouTubeIframeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()

  const w = window as Window & {
    YT?: { Player: unknown }
    onYouTubeIframeAPIReady?: () => void
  }

  if (w.YT && typeof (w.YT as { Player?: unknown }).Player === "function") {
    return Promise.resolve()
  }

  if (!youTubeIframeApiPromise) {
    youTubeIframeApiPromise = new Promise(resolve => {
      const done = () => resolve()
      const prior = w.onYouTubeIframeAPIReady
      w.onYouTubeIframeAPIReady = () => {
        prior?.()
        done()
      }

      if (!document.querySelector('script[src*="www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script")
        tag.src = "https://www.youtube.com/iframe_api"
        tag.async = true
        document.head.appendChild(tag)
      } else if (w.YT && typeof (w.YT as { Player?: unknown }).Player === "function") {
        queueMicrotask(done)
      }
    })
  }

  return youTubeIframeApiPromise
}
