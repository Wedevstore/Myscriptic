/** Apple Sign in JS (https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js) */
interface AppleIdAuthConfig {
  clientId: string
  scope: string
  redirectURI: string
  usePopup?: boolean
  nonce?: string
  state?: string
}

interface AppleSignInResponse {
  authorization?: {
    id_token?: string
    code?: string
    state?: string
  }
  user?: {
    email?: string
    name?: {
      firstName?: string
      lastName?: string
    }
  }
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: AppleIdAuthConfig) => void
        signIn: () => Promise<AppleSignInResponse>
      }
    }
  }
}

export {}
