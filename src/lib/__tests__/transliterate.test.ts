import { transliterate } from '../lib/utils';

describe('transliterate', () => {
  it('should transliterate basic Russian text', () => {
    expect(transliterate('Привет')).toBe('privet');
    expect(transliterate('мир')).toBe('mir');
  });

  it('should handle spaces as dashes', () => {
    expect(transliterate('привет мир')).toBe('privet-mir');
    expect(transliterate('как дела')).toBe('kak-dela');
  });

  it('should handle mixed case', () => {
    expect(transliterate('Привет МИР')).toBe('privet-mir');
    expect(transliterate('РУССКИЙ язык')).toBe('russkiy-yazyk');
  });

  it('should handle special Russian letters', () => {
    expect(transliterate('жизнь')).toBe('zhizn');
    expect(transliterate('цифра')).toBe('tsifra');
    expect(transliterate('человек')).toBe('chelovek');
    expect(transliterate('шум')).toBe('shum');
    expect(transliterate('щека')).toBe('scheka');
    expect(transliterate('ёл')).toBe('yol');
    expect(transliterate('юг')).toBe('yug');
    expect(transliterate('ястреб')).toBe('yastreb');
  });

  it('should handle Cyrillic characters', () => {
    expect(transliterate('химия')).toBe('khimiya');
    expect(transliterate('сыр')).toBe('syr');
    expect(transliterate('эхо')).toBe('ekho');
  });

  it('should remove special characters', () => {
    expect(transliterate('Как дела?')).toBe('kak-dela');
    expect(transliterate('Привет, мир!')).toBe('privet-mir');
    expect(transliterate('Вопрос: ответ')).toBe('vopros-otvet');
  });

  it('should normalize multiple spaces and dashes', () => {
    expect(transliterate('привет   мир')).toBe('privet-mir');
    expect(transliterate('  привет мир  ')).toBe('privet-mir');
  });

  it('should handle real use cases', () => {
    expect(transliterate('Как использовать фреймворк?'))
      .toBe('kak-ispolzovat-freymuork');
    expect(transliterate('JavaScript для начинающих'))
      .toBe('javascript-dlya-nachinayushchikh');
    expect(transliterate('Первая программа на Python'))
      .toBe('pervaya-programma-na-python');
  });

  it('should return empty string for empty input', () => {
    expect(transliterate('')).toBe('');
    expect(transliterate('   ')).toBe('');
  });

  it('should preserve Latin characters', () => {
    expect(transliterate('Hello мир')).toBe('hello-mir');
    expect(transliterate('Python and Rust')).toBe('python-and-rust');
  });

  it('should preserve numbers', () => {
    expect(transliterate('Версия 3.14')).toBe('versiya-314');
    expect(transliterate('2024 год')).toBe('2024-god');
  });
});
