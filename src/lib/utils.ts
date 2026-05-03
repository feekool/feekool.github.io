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