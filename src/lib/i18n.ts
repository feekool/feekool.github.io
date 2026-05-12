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
    offlineError: 'Offline mode - viewing cached data',
    offlineTopicError: 'Topic not available offline - please check your connection',
    offlineForumError: 'Forum not available offline - please check your connection',
    offlinePostError: 'Cannot create posts while offline. Please check your internet connection.',
    accentColor: 'Accent Color',
    accentColorDescription: 'Choose your accent color that will be applied throughout the interface.',
    customColor: 'Custom Color',
    apply: 'Apply',
    currentColor: 'Current',
    colorAppliedTo: 'This color is applied to buttons, links, and interactive elements',
    savingColor: 'Saving color...',
    colorSaveError: 'Failed to save color preference. Color reverted to previous setting.',
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
    quote: 'Quote',
    said: 'said',
    searchByAuthor: 'Search by author',
    searchByText: 'Search by text',
    welcomeTitle: 'Welcome to the Forum Template',
    welcomeMessage: 'This is a modern forum application built with React, TypeScript, and Tailwind CSS. You can use this as a template to create your own forum.',
    featuresTitle: 'Features',
    featuresList: 'User authentication, Markdown support, Dark mode, Mobile responsive, Multi-language support',
    maintenanceMessage: 'The site is currently under maintenance. Please try again later.',
    signupsDisabled: 'Registration is temporarily disabled. Please sign in to an existing account.',
    adminSettingsLoading: 'Loading admin settings...',
    maintenanceBanner: 'Site is in maintenance mode. Some features may be limited.'
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
    quote: 'Цитата',
    said: 'сказал',
    searchByAuthor: 'Поиск по автору',
    searchByText: 'Поиск по тексту',
    welcomeTitle: 'Добро пожаловать в шаблон форума',
    welcomeMessage: 'Это современное форумное приложение, созданное с помощью React, TypeScript и Tailwind CSS. Вы можете использовать это как шаблон для создания своего собственного форума.',
    featuresTitle: 'Возможности',
    featuresList: 'Аутентификация пользователей, Поддержка Markdown, Темная тема, Адаптивность для мобильных, Поддержка нескольких языков',
    maintenanceMessage: 'Сайт находится в режиме обслуживания. Повторите попытку позже.',
    signupsDisabled: 'Регистрация временно отключена. Пожалуйста, войдите в существующий аккаунт.',
    adminSettingsLoading: 'Загрузка настроек администратора...',
    maintenanceBanner: 'Сайт находится в режиме обслуживания. Некоторые функции могут быть ограничены.',
    offlineError: 'Режим оффлайн - просмотр кешированных данных',
    offlineTopicError: 'Тема недоступна в оффлайне - проверьте подключение к интернету',
    offlineForumError: 'Форум недоступен в оффлайне - проверьте подключение к интернету',
    offlinePostError: 'Невозможно создавать сообщения в оффлайне. Проверьте подключение к интернету.',
    accentColor: 'Акцентный цвет',
    accentColorDescription: 'Выберите акцентный цвет, который будет применяться во всем интерфейсе.',
    customColor: 'Пользовательский цвет',
    apply: 'Применить',
    currentColor: 'Текущий',
    colorAppliedTo: 'Этот цвет применяется к кнопкам, ссылкам и интерактивным элементам',
    savingColor: 'Сохранение цвета...',
    colorSaveError: 'Не удалось сохранить цвет. Цвет возвращен к предыдущей настройке.'
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