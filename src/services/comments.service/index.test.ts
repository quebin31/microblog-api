import { createUser } from '../../test/factories/accounts';
import { createFullComment } from '../../test/factories/comments';
import { CommentResponse, mapToCommentResponse } from './index';

describe('Map comment to response', () => {
  test('transforms comment into a response model', () => {
    const user = createUser({ publicName: true });
    const comment = createFullComment({ user });
    const expected: CommentResponse = {
      id: comment.id,
      postTitle: comment.post.title,
      postId: comment.post.id,
      authorName: comment.user.name,
      authorId: comment.user.id,
      body: comment.body,
      score: comment.positiveVotes - comment.negativeVotes,
      positiveVotes: comment.positiveVotes,
      negativeVotes: comment.negativeVotes,
      totalVotes: comment.positiveVotes + comment.negativeVotes,
      draft: comment.draft,
      createdAt: comment.createdAt,
      lastModifiedAt: comment.updatedAt,
    };

    expect(mapToCommentResponse(comment)).toStrictEqual<CommentResponse>(expected);
  });

  test(`returns name with 'null' if it's not public`, () => {
    const user = createUser({ publicName: false });
    const comment = createFullComment({ user });

    expect(mapToCommentResponse(comment).authorName).toBeNull();
  });

  test(`returns name with 'null' if it's not public and user id doesn't match`, () => {
    const user = createUser({ publicName: false });
    const comment = createFullComment({ user });

    expect(mapToCommentResponse(comment, 'other-uuid').authorName).toBeNull();
  });

  test(`returns name if user id matches (even if it's not public)`, () => {
    const user = createUser({ publicName: false });
    const comment = createFullComment({ user });

    expect(mapToCommentResponse(comment, user.id).authorName).toEqual(user.name);
  });
});
