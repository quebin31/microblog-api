import { countPositiveVotes } from '../votes';

describe('Count positive votes', () => {
  test('counts nothing with empty array', () => {
    const votes: { positive: boolean }[] = Array.of();
    const positiveVotes = votes.reduce(countPositiveVotes, 0);
    expect(positiveVotes).toEqual(0);
  });

  test('counts only positive votes', () => {
    const votes = [{ positive: true }, { positive: false }, { positive: true }];
    const positiveVotes = votes.reduce(countPositiveVotes, 0);
    expect(positiveVotes).toEqual(2);
  });
});
