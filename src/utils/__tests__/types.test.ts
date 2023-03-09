import { omit, pick, requireDefined } from '../types';

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

describe('Require defined value', () => {
  test('throws if received value is undefined', () => {
    const value: string | undefined = undefined;
    expect(() => requireDefined(value))
      .toThrowError('Required a defined value, got nothing');
  });

  test('throws with custom message if value is undefined', () => {
    const value: string | undefined = undefined;
    expect(() => requireDefined(value, () => 'Expecting a value'))
      .toThrowError('Expecting a value');
  });

  test(`returns actual value if it's not undefined`, () => {
    const value: string | undefined = 'hello';
    expect(requireDefined(value)).toEqual('hello');
  });
});
