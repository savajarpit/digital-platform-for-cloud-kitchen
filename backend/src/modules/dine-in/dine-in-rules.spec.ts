import {
  compareTableLabels,
  tableBusyMessage,
  tableInUseMessage,
  tableName,
} from './dine-in-rules';

describe('dine-in rules', () => {
  it('names a bare table number "Table N" but keeps a named table', () => {
    expect(tableName('1')).toBe('Table 1');
    expect(tableName('12B')).toBe('Table 12B');
    expect(tableName('Patio')).toBe('Patio');
    expect(tableName('Table 4')).toBe('Table 4');
    expect(tableName('table 4')).toBe('table 4');
  });

  it('explains a busy table and what to do instead', () => {
    expect(tableBusyMessage('4')).toBe(
      'Table 4 already has an open order — add items to it, or pick another table.',
    );
    expect(tableInUseMessage('Table 2', 'remove')).toContain(
      'before you remove this table',
    );
  });

  it('sorts table labels in natural order', () => {
    const labels = ['Table 10', 'table 2', 'Table 1', 'Patio'];
    expect([...labels].sort(compareTableLabels)).toEqual([
      'Patio',
      'Table 1',
      'table 2',
      'Table 10',
    ]);
  });
});
