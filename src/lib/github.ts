import { config } from '../config/app';
import { handleApiError } from './apiErrorHandler';
import { isOfflineError } from './utils';

const { owner, repo, branch } = config.github;
const BASE = 'https://api.github.com';

const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json'
};

const fileCache = new Map<string, { content: string; sha?: string }>();

export function getCachedFile(path: string) {
  return fileCache.get(path) || null;
}

export function isFileCached(path: string) {
  return fileCache.has(path);
}

export function clearFileCache(path?: string) {
  if (path) {
    fileCache.delete(path);
  } else {
    fileCache.clear();
  }
}

// Remove token from headers - it will be added by service worker
// if (token) {
//   headers.Authorization = `Bearer ${token}`;
// }

function utf8_to_b64(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str: string) {
  return decodeURIComponent(escape(atob(str)));
}

async function createGitHubError(res: Response): Promise<Error> {
  const statusText = res.statusText || 'Unknown error';
  let detail = '';
  try {
    const json = await res.json();
    if (json && typeof json === 'object' && 'message' in json) {
      detail = String((json as any).message);
    } else if (typeof json === 'string') {
      detail = json;
    }
  } catch {
    // ignore parse errors
  }

  if (res.status === 403 && detail) {
    const normalized = detail.toLowerCase();
    if (/rate limit|secondary rate limit|exceeded|too many requests/.test(normalized)) {
      // Keep GitHub rate limit message as-is for user clarity
    } else if (/resource not accessible|permission|access denied|forbidden|repository access/.test(normalized)) {
      detail = 'The provided GitHub token does not have permission to access this repository. Use a GitHub fine-grained token with repository access or a PAT with repo/content permissions.';
    }
  }

  if (res.status === 401 && !detail) {
    detail = 'Invalid or missing GitHub token. Check your VITE_API_KEY and token permissions.';
  }

  const message = detail
    ? `GitHub API error: ${res.status} ${statusText} - ${detail}`
    : `GitHub API error: ${res.status} ${statusText}`;
  const error = new Error(message);
  (error as any).status = res.status;
  return error;
}

export async function getFile(path: string) {
  // Don't use cache for user settings files to ensure fresh data
  const isSetting = path.includes('users/') && path.endsWith('-settings.md');
  
  if (!isSetting) {
    const cached = fileCache.get(path);
    if (cached) {
      return { content: cached.content, sha: cached.sha };
    }
  }

  try {
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );
    if (res.status === 404) {
      console.log(`File not found: ${path}`);
      return null;
    }
    if (!res.ok) {
      throw await createGitHubError(res);
    }
    const data = await res.json();
    if (data.content && !Array.isArray(data)) {
      const content = b64_to_utf8(data.content.replace(/\n/g, ''));
      const fileData = { content, sha: data.sha as string };
      if (!isSetting) {
        fileCache.set(path, fileData);
      }
      return fileData;
    }
    return null;
  } catch (error: any) {
    // In offline mode, don't throw error - just return null
    // The calling code should handle missing data gracefully
    if (!navigator.onLine || isOfflineError(error)) {
      console.log(`Offline mode: ${path} not available in cache`);
      return null;
    }
    if (error.message?.includes('404')) return null;
    handleApiError(error, 'getFile');
  }
}

export async function putFile(
path: string,
content: string,
message: string,
isBase64: boolean = false,
sha?: string)
{
  const body: any = {
    message,
    content: isBase64 ? content : utf8_to_b64(content),
    branch
  };
  if (sha) body.sha = sha;

  const sendRequest = async (requestBody: any) => {
    // Create fresh headers for each request to allow Service Worker to add authorization
    const requestHeaders = new Headers(headers);
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });
    return res;
  };

  try {
    let res = await sendRequest(body);

    if (!res.ok && res.status === 422 && !sha) {
      const existing = await getFile(path);
      if (existing?.sha) {
        body.sha = existing.sha;
        res = await sendRequest(body);
      }
    }

    if (!res.ok) {
      throw await createGitHubError(res);
    }

    const data = await res.json();
    fileCache.set(path, { content, sha: data.content?.sha });
    return data;
  } catch (error: any) {
    handleApiError(error, 'putFile');
  }
}

export async function listFiles(path: string) {
  try {
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );
    if (res.status === 404) return [];
    if (!res.ok) {
      throw await createGitHubError(res);
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch (error: any) {
    // In offline mode, return empty array instead of throwing error
    if (!navigator.onLine || isOfflineError(error)) {
      console.log(`Offline mode: cannot list files in ${path}`);
      return [];
    }
    if (error.message?.includes('404')) return [];
    handleApiError(error, 'listFiles');
  }
}

export async function deleteFile(path: string, message: string, sha: string) {
  try {
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ message, sha, branch })
    });
    if (!res.ok) {
      throw await createGitHubError(res);
    }
    fileCache.delete(path);
  } catch (error: any) {
    handleApiError(error, 'deleteFile');
  }
}