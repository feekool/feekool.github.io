import React, { createContext, useContext, useState, useEffect } from 'react';
import { config } from '../config/app';

const translations = {
  en: {
    login: 'Login',
    register: 'Register',
    username: 'Username',
    enterUsername: 'Enter your username',
    continue: 'Continue',
    boards: 'Boards',
    topics: 'Topics',
    posts: 'Posts',
    createBoard: 'Create Board',
    createTopic: 'Create Topic',
    reply: 'Reply',
    logout: 'Logout',
    noBoards: 'No boards found. Create one!',
    noTopics: 'No topics found. Be the first to post!',
    noPosts: 'No posts found.',
    title: 'Title',
    description: 'Description',
    content: 'Content',
    cancel: 'Cancel',
    create: 'Create',
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    by: 'by',
    joined: 'Joined',
    home: 'Home',
    members: 'Members',
    postReply: 'Post Reply',
    profile: 'Profile',
    edit: 'Edit',
    save: 'Save',
    preview: 'Preview',
    hidePreview: 'Hide Preview',
    bold: 'Bold',
    italic: 'Italic',
    code: 'Code',
    link: 'Link',
    list: 'Bullet List',
    orderedList: 'Numbered List',
    quote: 'Quote'
  },
  ru: {
    login: 'Войти',
    register: 'Регистрация',
    username: 'Имя пользователя',
    enterUsername: 'Введите имя пользователя',
    continue: 'Продолжить',
    boards: 'Доски',
    topics: 'Темы',
    posts: 'Сообщения',
    createBoard: 'Создать доску',
    createTopic: 'Создать тему',
    reply: 'Ответить',
    logout: 'Выйти',
    noBoards: 'Доски не найдены. Создайте первую!',
    noTopics: 'Темы не найдены. Напишите первым!',
    noPosts: 'Сообщения не найдены.',
    title: 'Заголовок',
    description: 'Описание',
    content: 'Содержание',
    cancel: 'Отмена',
    create: 'Создать',
    loading: 'Загрузка...',
    error: 'Произошла ошибка',
    retry: 'Повторить',
    by: 'от',
    joined: 'Присоединился',
    home: 'Главная',
    members: 'Участники',
    postReply: 'Отправить',
    profile: 'Профиль',
    edit: 'Изменить',
    save: 'Сохранить',
    preview: 'Предпросмотр',
    hidePreview: 'Скрыть предпросмотр',
    bold: 'Жирный',
    italic: 'Курсив',
    code: 'Код',
    link: 'Ссылка',
    list: 'Маркированный список',
    orderedList: 'Нумерованный список',
    quote: 'Цитата'
  }
};

type Lang = keyof typeof translations;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof (typeof translations)['en']) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function LanguageProvider({ children }: {children: React.ReactNode;}) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang');
    return saved as Lang || config.defaultLang as Lang;
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = (key: keyof (typeof translations)['en']) =>
  translations[lang][key] || key;

  return React.createElement(
    I18nContext.Provider,
    { value: { lang, setLang, t } },
    children
  );
}

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context)
  throw new Error('useTranslation must be used within LanguageProvider');
  return context;
};