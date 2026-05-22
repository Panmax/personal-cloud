export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  AUTH_PASSWORD_HASH?: string;
}

export interface FileRecord {
  id: string;
  name: string;
  parent_id: string | null;
  is_dir: number;
  size: number;
  mime_type: string | null;
  r2_key: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FileVersionRecord {
  id: string;
  file_id: string;
  version: number;
  r2_key: string;
  size: number;
  created_at: string;
}

export interface ShareRecord {
  id: string;
  file_id: string;
  password: string | null;
  expires_at: string | null;
  download_count: number;
  created_at: string;
}
