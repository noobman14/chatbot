/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 API 根路径，例如 http://localhost:8080/api/v1 */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
