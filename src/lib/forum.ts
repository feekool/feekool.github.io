import { getFile, putFile, listFiles, isFileCached } from './github';
import { parseFrontmatter, stringifyFrontmatter, generateId, transliterate, normalizeText, slugify } from './utils';

export interface Forum {
  slug: string;
  title: string;
  description: string;
  order: string;
  createdBy: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  title: string;
  titleTranslit: string;
  forumSlug: string;
  author: string;
  createdAt: string;
  body: string;
}

export interface Post {
  id: string;
  topicId: string;
  author: string;
  createdAt: string;
  body: string;
}

function matchesSearch(item: { author: string; body: string }, options?: { author?: string; text?: string }): boolean {
  if (!options) return true;
  const { author: authorQuery, text: textQuery } = options;
  if (authorQuery) {
    const normalizedAuthor = normalizeText(item.author);
    const normalizedQuery = normalizeText(authorQuery);
    if (!normalizedAuthor.includes(normalizedQuery)) return false;
  }
  if (textQuery) {
    const normalizedBody = normalizeText(item.body);
    const normalizedQuery = normalizeText(textQuery);
    const words = normalizedBody.split(/\s+/);
    if (!words.some(word => word.startsWith(normalizedQuery))) return false;
  }
  return true;
}

const cacheFilePaths = async (files: Array<{ name: string; path?: string }>) => {
  await Promise.all(
    files
      .filter(file => file.name.endsWith('.md') && file.path && !isFileCached(file.path))
      .map(file => getFile(file.path!))
  );
};

export async function listForums(): Promise<Forum[]> {
  const files = await listFiles('forums');
  const forums: Forum[] = [];

  await cacheFilePaths(files);

  for (const file of files) {
    if (file.name.endsWith('.md') && file.path) {
      const fileData = await getFile(file.path);
      if (fileData) {
        const { data } = parseFrontmatter<Forum>(fileData.content);
        forums.push({ ...data, slug: file.name.replace('.md', '') });
      }
    }
  }

  return forums.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export async function getForum(slug: string): Promise<Forum | null> {
  const file = await getFile(`forums/${slug}.md`);
  if (!file) return null;
  const { data } = parseFrontmatter<Forum>(file.content);
  return { ...data, slug };
}

export async function createForum(data: Omit<Forum, 'slug'>): Promise<Forum> {
  const slug = slugify(data.title);
  const content = stringifyFrontmatter(data, '');
  await putFile(`forums/${slug}.md`, content, `Create forum ${data.title}`);
  
  return {
    slug,
    title: data.title,
    description: data.description,
    order: data.order,
    createdBy: data.createdBy,
    createdAt: data.createdAt
  };
}

export async function listTopics(forumSlug: string, options?: { author?: string; text?: string }): Promise<Topic[]> {
  const files = await listFiles('topics');
  const topics: Topic[] = [];

  await cacheFilePaths(files);

  for (const file of files) {
    if (file.name.endsWith('.md') && file.path) {
      const fileData = await getFile(file.path);
      if (fileData) {
        const { data, content } = parseFrontmatter<Topic>(fileData.content);
        if (data.forumSlug === forumSlug) {
          const topic = {
            ...data,
            id: file.name.replace('.md', ''),
            body: content
          };
          if (matchesSearch(topic, options)) {
            topics.push(topic);
          }
        }
      }
    }
  }

  return topics.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getTopic(id: string): Promise<Topic | null> {
  const file = await getFile(`topics/${id}.md`);
  if (!file) return null;
  const { data, content } = parseFrontmatter<Topic>(file.content);
  return { ...data, id, body: content };
}

export async function createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'titleTranslit'>): Promise<Topic> {
  const id = generateId();
  const titleTranslit = transliterate(data.title) || `topic-${generateId()}`;
  const createdAt = new Date().toISOString();
  const frontmatterData = {
    title: data.title,
    titleTranslit: titleTranslit,
    forumSlug: data.forumSlug,
    author: data.author,
    createdAt: createdAt
  };
  const content = stringifyFrontmatter(frontmatterData, data.body);
  await putFile(`topics/${id}.md`, content, `Create topic ${data.title}`);
  
  return {
    id,
    title: data.title,
    titleTranslit,
    forumSlug: data.forumSlug,
    author: data.author,
    createdAt,
    body: data.body
  };
}

export async function listPosts(topicId: string, options?: { author?: string; text?: string }): Promise<Post[]> {
  const files = await listFiles('posts');
  const posts: Post[] = [];

  await cacheFilePaths(files);

  for (const file of files) {
    if (file.name.endsWith('.md') && file.path) {
      const fileData = await getFile(file.path);
      if (fileData) {
        const { data, content } = parseFrontmatter<Post>(fileData.content);
        if (data.topicId === topicId) {
          const post = {
            ...data,
            id: file.name.replace('.md', ''),
            body: content
          };
          if (matchesSearch(post, options)) {
            posts.push(post);
          }
        }
      }
    }
  }

  return posts.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function createPost(data: Omit<Post, 'id' | 'createdAt'>): Promise<Post> {
  const id = generateId();
  const createdAt = new Date().toISOString();
  const frontmatterData = {
    topicId: data.topicId,
    author: data.author,
    createdAt: createdAt
  };
  const content = stringifyFrontmatter(frontmatterData, data.body);
  await putFile(
    `posts/${id}.md`,
    content,
    `Create post in topic ${data.topicId}`
  );
  
  return {
    id,
    topicId: data.topicId,
    author: data.author,
    createdAt,
    body: data.body
  };
}