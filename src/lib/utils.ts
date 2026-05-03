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