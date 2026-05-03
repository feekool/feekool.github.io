import { config } from '../config/app';

const { owner, repo, branch, token } = config.github;
const BASE = 'https://api.github.com';

const headers: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json'
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

function utf8_to_b64(str: string) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str: string) {
  return decodeURIComponent(escape(atob(str)));
}

export async function getFile(path: string) {
  try {
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    if (data.content && !Array.isArray(data)) {
      const content = b64_to_utf8(data.content.replace(/\n/g, ''));
      return { content, sha: data.sha as string };
    }
    return null;
  } catch (error: any) {
    if (error.message?.includes('404')) return null;
    throw error;
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

  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }
  return res.json();
}

export async function listFiles(path: string) {
  try {
    const res = await fetch(
      `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data;
    return [];
  } catch (error: any) {
    if (error.message?.includes('404')) return [];
    throw error;
  }
}

export async function deleteFile(path: string, message: string, sha: string) {
  const res = await fetch(`${BASE}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ message, sha, branch })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }
}