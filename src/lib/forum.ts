import { getFile, putFile, listFiles } from './github';
import { parseFrontmatter, stringifyFrontmatter, generateId } from './utils';

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

export async function listForums(): Promise<Forum[]> {
  const files = await listFiles('forums');
  const forums: Forum[] = [];

  for (const file of files) {
    if (file.name.endsWith('.md')) {
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

export async function createForum(
data: Omit<Forum, 'slug'> & {slug: string;})
{
  const content = stringifyFrontmatter(data, '');
  await putFile(`forums/${data.slug}.md`, content, `Create forum ${data.title}`);
}

export async function listTopics(forumSlug: string): Promise<Topic[]> {
  const files = await listFiles('topics');
  const topics: Topic[] = [];

  for (const file of files) {
    if (file.name.endsWith('.md')) {
      const fileData = await getFile(file.path);
      if (fileData) {
        const { data, content } = parseFrontmatter<Topic>(fileData.content);
        if (data.forumSlug === forumSlug) {
          topics.push({
            ...data,
            id: file.name.replace('.md', ''),
            body: content
          });
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

export async function createTopic(data: Omit<Topic, 'id' | 'createdAt'>) {
  const id = generateId();
  const frontmatterData = {
    title: data.title,
    forumSlug: data.forumSlug,
    author: data.author,
    createdAt: new Date().toISOString()
  };
  const content = stringifyFrontmatter(frontmatterData, data.body);
  await putFile(`topics/${id}.md`, content, `Create topic ${data.title}`);
  return id;
}

export async function listPosts(topicId: string): Promise<Post[]> {
  const files = await listFiles('posts');
  const posts: Post[] = [];

  for (const file of files) {
    if (file.name.endsWith('.md')) {
      const fileData = await getFile(file.path);
      if (fileData) {
        const { data, content } = parseFrontmatter<Post>(fileData.content);
        if (data.topicId === topicId) {
          posts.push({
            ...data,
            id: file.name.replace('.md', ''),
            body: content
          });
        }
      }
    }
  }

  return posts.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function createPost(data: Omit<Post, 'id' | 'createdAt'>) {
  const id = generateId();
  const frontmatterData = {
    topicId: data.topicId,
    author: data.author,
    createdAt: new Date().toISOString()
  };
  const content = stringifyFrontmatter(frontmatterData, data.body);
  await putFile(
    `posts/${id}.md`,
    content,
    `Create post in topic ${data.topicId}`
  );
  return id;
}