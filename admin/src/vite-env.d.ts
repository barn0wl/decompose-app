/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // Add other environment variables here as needed
  // readonly VITE_ANOTHER_VAR: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}