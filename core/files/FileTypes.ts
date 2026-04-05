/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * File Types - Типи даних для системи читання файлів
 */

// BufferEncoding is a Node.js type — re-declare it for browser compatibility
type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex';

/**
 * Статус файлу
 */
export enum FileStatus {
  PENDING = 'PENDING',
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED'
}

/**
 * Коди помилок при читанні файлів
 */
export enum FileErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CANCELLED = 'CANCELLED'
}

/**
 * Помилка читання файлу
 */
export interface FileError {
  code: FileErrorCode;
  message: string;
  fileId?: string;
  originalError?: Error;
}

/**
 * Основна інформація про файл
 */
export interface FileInfo {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  mimeType: string;
  content?: string | ArrayBuffer;
  metadata?: Record<string, unknown>;
  status: FileStatus;
  error?: FileError;
}

/**
 * Фільтр для файлів
 */
export interface FileFilter {
  extensions?: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  namePattern?: RegExp;
}

/**
 * Прогрес завантаження файлу
 */
export interface FileLoadProgress {
  fileId: string;
  loaded: number;
  total: number;
  percentage: number;
  status: FileStatus;
}

/**
 * Запис історії файлів
 */
export interface FileHistoryEntry {
  id: string;
  path: string;
  name: string;
  openedAt: Date;
  lastAccessed: Date;
  accessCount: number;
  isFavorite: boolean;
}

/**
 * Типи подій
 */
export type FileEventType = 
  | 'file:selected'
  | 'file:loaded'
  | 'file:error'
  | 'file:progress'
  | 'files:all-complete'
  | 'cache:cleared'
  | 'history:updated';

/**
 * Подія файлу
 */
export interface FileEvent {
  type: FileEventType;
  payload: unknown;
  timestamp: number;
}

/**
 * Конфігурація читання файлів
 */
export const FILE_CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILES_PER_SELECTION: 50,
  MAX_HISTORY_ENTRIES: 50,
  CACHE_MAX_SIZE: 50 * 1024 * 1024, // 50MB
  CACHE_TTL: 24 * 60 * 60 * 1000,   // 24 години
  CHUNK_SIZE: 64 * 1024,            // 64KB
  MAX_CONCURRENT_READS: 3,
  PROGRESS_UPDATE_INTERVAL: 100,
  SUPPORTED_TEXT_EXTENSIONS: ['.txt', '.json', '.md', '.xml', '.csv', '.log', '.js', '.ts', '.html', '.css'],
  SUPPORTED_BINARY_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.wasm', '.glb', '.gltf'],
  SUPPORTED_ARCHIVE_EXTENSIONS: ['.zip', '.tar', '.gz', '.rar', '.7z']
} as const;

/**
 * Опції для діалогу вибору файлів
 */
export interface FileDialogOptions {
  multiple?: boolean;
  accept?: string;
  extensions?: string[];
  maxFiles?: number;
  maxSize?: number;
  filter?: FileFilter;
}

/**
 * Результат читання файлу
 */
export interface FileReadResult {
  file: FileInfo;
  success: boolean;
  error?: FileError;
}

/**
 * Опції потокового читання
 */
export interface StreamReadOptions {
  chunkSize?: number;
  onProgress?: (progress: FileLoadProgress) => void;
  signal?: AbortSignal;
  encoding?: BufferEncoding;
}

/**
 * Cache entry для збереження файлів
 */
export interface CacheEntry {
  file: FileInfo;
  timestamp: number;
  size: number;
  accessCount: number;
}

/**
 * LRU Cache для файлів
 */
export class FileCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = FILE_CONFIG.CACHE_MAX_SIZE, ttl: number = FILE_CONFIG.CACHE_TTL) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): FileInfo | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Перевірка TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.file;
  }

  set(key: string, file: FileInfo): void {
    const size = file.size || 0;
    
    // Очищення кешу якщо перевищено ліміт
    while (this.getTotalSize() + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(key, {
      file,
      timestamp: Date.now(),
      size,
      accessCount: 1
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getTotalSize(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += entry.size;
    }
    return total;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

/**
 * Генератор унікальних ID для файлів
 */
export function generateFileId(_path: string): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Отримання розширення з імені файлу
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.substring(lastDot).toLowerCase() : '';
}

/**
 * Отримання MIME типу з розширення
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.log': 'text/plain',
    '.js': 'application/javascript',
    '.ts': 'application/typescript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.wasm': 'application/wasm',
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Форматування розміру файлу
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Форматування дати
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}