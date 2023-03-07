/**
 * Picks only the specified {@link keys} from the provided {@link obj object}, returns an object that
 * satisfies `Pick<T, K>`.
 *
 * @param obj The object from where keys will be picked.
 * @param keys The keys to be picked.
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    // @ts-ignore
    result[key] = obj[key];
  }

  return result as Pick<T, K>;
}

/**
 * Omits the specified {@link keys} from the provided {@link obj object}, returns an object that
 * satisfies `Omit<T, K>`. A bit slower than {@link pick} as it has to filter keys.
 *
 * @param obj The object from where keys will be filtered.
 * @param keys The keys to be omitted.
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const finalKeys = Object.keys(obj).filter(k => !keys.includes(k as K));
  const result: Record<string, unknown> = {};

  for (const key of finalKeys) {
    // @ts-ignore
    result[key] = obj[key];
  }

  return result as Omit<T, K>;
}
