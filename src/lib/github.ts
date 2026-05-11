import { config } from '../config/app';
import { handleApiError } from './apiErrorHandler';

const { owner, repo, branch } = config.github;
const BASE = 'https://api.github.com';

const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json'
};

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
  try {
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw await createGitHubError(res);
    }
    const data = await res.json();
    if (data.content && !Array.isArray(data)) {
      const content = b64_to_utf8(data.content.replace(/\n/g, ''));
      return { content, sha: data.sha as string };
    }
    return null;
  } catch (error: any) {
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

  try {
    const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw await createGitHubError(res);
    }
    return res.json();
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
  } catch (error: any) {
    handleApiError(error, 'deleteFile');
  }
}