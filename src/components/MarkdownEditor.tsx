import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Code, Link, List, ListOrdered, Quote, Eye, EyeOff } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import { useTranslation } from '../lib/i18n';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your message...',
  className = '',
  rows = 6
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText = value.substring(0, start) + before + textToInsert + after + value.substring(end);
    onChange(newText);

    // Устанавливаем курсор в правильное положение
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const toolbarButtons = [
    {
      icon: Bold,
      label: t('bold'),
      action: () => insertText('**', '**', 'bold text'),
      shortcut: 'Ctrl+B'
    },
    {
      icon: Italic,
      label: t('italic'),
      action: () => insertText('*', '*', 'italic text'),
      shortcut: 'Ctrl+I'
    },
    {
      icon: Code,
      label: t('code'),
      action: () => insertText('`', '`', 'code'),
      shortcut: 'Ctrl+`'
    },
    {
      icon: Link,
      label: t('link'),
      action: () => insertText('[', '](url)', 'link text'),
      shortcut: 'Ctrl+K'
    },
    {
      icon: List,
      label: t('list'),
      action: () => insertText('- ', '', 'list item'),
      shortcut: 'Ctrl+Shift+8'
    },
    {
      icon: ListOrdered,
      label: t('orderedList'),
      action: () => insertText('1. ', '', 'list item'),
      shortcut: 'Ctrl+Shift+7'
    },
    {
      icon: Quote,
      label: t('quote'),
      action: () => insertText('> ', '', 'quote'),
      shortcut: 'Ctrl+Shift+>'
    }
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Обработка горячих клавиш
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertText('**', '**', 'bold text');
          break;
        case 'i':
          e.preventDefault();
          insertText('*', '*', 'italic text');
          break;
        case '`':
          e.preventDefault();
          insertText('`', '`', 'code');
          break;
        case 'k':
          e.preventDefault();
          insertText('[', '](url)', 'link text');
          break;
      }
    }
  };

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-md ${isMobile ? 'markdown-editor-mobile' : ''} ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-md">
        {toolbarButtons.map((button, index) => (
          <button
            key={index}
            onClick={button.action}
            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title={`${button.label} (${button.shortcut})`}
            type="button"
          >
            <button.icon className="w-4 h-4" />
          </button>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`p-1.5 rounded transition-colors ${
              showPreview
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={showPreview ? t('hidePreview') : t('preview')}
            type="button"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="relative">
        {showPreview ? (
          <div className="p-4 min-h-[120px]">
            {value.trim() ? (
              <MarkdownContent content={value} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">Nothing to preview</p>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            className={`w-full p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-b-md ${isMobile ? 'max-w-full box-border' : ''}`}
          />
        )}
      </div>

      {/* Help Text */}
      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-md">
        <div className="flex flex-wrap gap-4">
          <span>**bold**</span>
          <span>*italic*</span>
          <span>`code`</span>
          <span>[link](url)</span>
          <span>- list</span>
          <span>1. numbered</span>
          <span>&gt; quote</span>
        </div>
      </div>
    </div>
  );
}