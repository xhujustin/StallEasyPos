import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getFullImageUrl(url: string | null | undefined) {
  if (!url) return '';
  if (url.startsWith('http')) return url;

  // 優先使用環境變數
  let baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl && typeof window !== 'undefined') {
    // 智慧偵測：自動映射到與前端同一個 IP 的 8000 埠 (後端預設埠)
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    baseUrl = `${protocol}//${hostname}:8000`;
  }

  if (!baseUrl) {
    baseUrl = 'http://localhost:8000';
  }

  // 移除結尾斜線並組合 URL
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;

  return `${cleanBaseUrl}${cleanPath}`;
}
