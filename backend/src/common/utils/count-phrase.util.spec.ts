import { countPhrase, joinPhrases } from './count-phrase.util';

describe('countPhrase / joinPhrases', () => {
  it('pluralises and skips zero counts', () => {
    expect(countPhrase(1, 'table')).toBe('1 table');
    expect(countPhrase(3, 'table')).toBe('3 tables');
    expect(countPhrase(0, 'table')).toBeNull();
    expect(countPhrase(2, 'entry', 'entries')).toBe('2 entries');
    expect(countPhrase(1, 'entry', 'entries')).toBe('1 entry');
  });

  it('joins one, two or three phrases naturally', () => {
    expect(joinPhrases([null, null])).toBeNull();
    expect(joinPhrases(['1 table', null])).toBe('1 table');
    expect(joinPhrases(['1 table', '2 orders'])).toBe('1 table and 2 orders');
    expect(joinPhrases(['a', 'b', 'c'])).toBe('a, b and c');
  });
});
