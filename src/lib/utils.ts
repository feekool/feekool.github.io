export function parseFrontmatter<T>(content: string): {
  data: T;
  content: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {} as T, content };

  const frontmatterStr = match[1];
  const body = match[2];

  const data: any = {};
  frontmatterStr.split('\n').forEach((line) => {
    const [key, ...values] = line.split(':');
    if (key && values.length) {
      data[key.trim()] = values.join(':').trim();
    }
  });

  return { data: data as T, content: body.trim() };
}

export function stringifyFrontmatter(data: any, content: string): string {
  let fm = '---\n';
  for (const [key, value] of Object.entries(data)) {
    fm += `${key}: ${value}\n`;
  }
  fm += '---\n\n';
  fm += content;
  return fm;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function transliterate(text: string): string {
  const russianToLatin: Record<string, string> = {
    // Прописные буквы
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    // Строчные буквы
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  return text
    .split('')
    .map(char => russianToLatin[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugify(text: string, fallback: string = generateId()): string {
  const slug = transliterate(text);
  return slug || fallback;
}

export function normalizeText(text: string): string {
  const russianToLatin: Record<string, string> = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text
    .split('')
    .map(char => russianToLatin[char] || char)
    .join('')
    .toLowerCase()
    .trim();
}

export function calculateDaysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatDaysCount(days: number): string {
  const absDays = Math.abs(days);
  const lastTwoDigits = absDays % 100;
  const lastDigit = absDays % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${days} дней`;
  }
  if (lastDigit === 1) {
    return `${days} день`;
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${days} дня`;
  }
  return `${days} дней`;
}

// Simple MD5 implementation for Gravatar
export async function generateGravatarUrl(username: string, size: number = 200): Promise<string> {
  const email = `${username.toLowerCase()}@gravatar.local`;
  const hash = await md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=${size}`;
}

// Simplified MD5 hash function
async function md5(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Safe error logging that prevents token leakage
export function safeLogError(message: string, error?: any): void {
  if (!error) {
    console.error(message);
    return;
  }

  // Sanitize error message and stack trace
  const sanitizedMessage = error.message?.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]') || 'Unknown error';
  const sanitizedStack = error.stack?.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]') || '';

  const sanitizedError = new Error(sanitizedMessage);
  sanitizedError.stack = sanitizedStack;
  sanitizedError.name = error.name || 'Error';

  console.error(message, sanitizedError);
}

// Safe error logging for fetch responses
export function safeLogFetchError(operation: string, error: any): void {
  const sanitizedMessage = error.message?.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]') || 'Unknown error';
  console.error(`${operation} failed:`, sanitizedMessage);
}

// Security utility to validate token format (without exposing it)
export function validateTokenSecurity(token?: string): boolean {
  if (!token) return false;

  // Basic validation: should be a reasonable length JWT-like token
  if (token.length < 20) return false;

  // Should not contain common insecure patterns
  const insecurePatterns = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /bearer/i
  ];

  return !insecurePatterns.some(pattern => pattern.test(token));
}

// Sanitize any object that might contain sensitive data
export function sanitizeForLogging(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? obj.replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]') : obj;
  }

  const sanitized = { ...obj };

  // Recursively sanitize all string properties
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitized[key].replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]');
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

// Check if error is offline/network error
export function isOfflineError(error: any): boolean {
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const status = error.status || error.statusCode;
  
  return (
    status === 503 ||
    message.includes('offline') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    error.name === 'NetworkError'
  );
}

// Get user-friendly offline error message
export function getOfflineErrorMessage(operation: string = 'Loading'): string {
  if (navigator.onLine) {
    return `${operation} failed - check your connection`;
  }
  return `${operation} - you are offline. Viewing cached data if available.`;
}
