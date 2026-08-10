/// <reference types='vite/client' />

interface GoogleOneTapResponse {
  credential?: string
  error?: string
  error_description?: string
  select_by?: string
}

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: GoogleOneTapResponse) => void }) => void
  prompt: () => void
  cancel: () => void
}

interface Window {
  google?: { accounts?: { id?: GoogleAccountsId } }
}