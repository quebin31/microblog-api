import { omit, pick } from '../types';

test('pick keys from object', () => {
  const originalObject = { a: '1', b: 2, c: true, d: 'hi', e: {} };
  const picked = pick(originalObject, ['a', 'c', 'e']);
  expect(picked).toStrictEqual({ a: '1', c: true, e: {} });
});

test('omit keys from object', () => {
  const originalObject = { a: '1', b: 2, c: true, d: 'hi', e: {} };
  const omitted = omit(originalObject, ['b', 'd']);
  expect(omitted).toStrictEqual({ a: '1', c: true, e: {} });
});
