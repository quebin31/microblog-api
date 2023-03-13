export type VoteAlike = { positive: boolean };

export const countPositiveVotes = (acc: number, vote: VoteAlike) => {
  return acc + (vote.positive ? 1 : 0);
};
