export const RAW_KEY_PATTERN = /^[0-9a-f]{64}$/;

export interface SecureKeyStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}

export type KeyLifecycleErrorCode =
  | "MISSING_KEY_FOR_EXISTING_DATABASE"
  | "INVALID_STORED_KEY"
  | "INVALID_GENERATED_KEY";

export class KeyLifecycleError extends Error {
  constructor(public readonly code: KeyLifecycleErrorCode) {
    super(code);
    this.name = "KeyLifecycleError";
  }
}

export async function resolveDatabaseKey(
  databaseExists: boolean,
  storageKey: string,
  secureStore: SecureKeyStore,
  generateRawKey: () => Promise<string>,
): Promise<{ key: string; generated: boolean }> {
  const storedKey = await secureStore.getItemAsync(storageKey);
  if (storedKey !== null) {
    if (!RAW_KEY_PATTERN.test(storedKey)) {
      throw new KeyLifecycleError("INVALID_STORED_KEY");
    }
    return { key: storedKey, generated: false };
  }

  if (databaseExists) {
    throw new KeyLifecycleError("MISSING_KEY_FOR_EXISTING_DATABASE");
  }

  const key = await generateRawKey();
  if (!RAW_KEY_PATTERN.test(key)) {
    throw new KeyLifecycleError("INVALID_GENERATED_KEY");
  }
  await secureStore.setItemAsync(storageKey, key);
  return { key, generated: true };
}
