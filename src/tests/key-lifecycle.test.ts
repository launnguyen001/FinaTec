import {
  resolveDatabaseKey,
  type SecureKeyStore,
} from "../infrastructure/database/spike/key-lifecycle";

function makeSecureStore(initialValue: string | null) {
  let value = initialValue;
  const secureStore: SecureKeyStore = {
    getItemAsync: jest.fn(async () => value),
    setItemAsync: jest.fn(async (_key, nextValue) => {
      value = nextValue;
    }),
  };
  return { secureStore, getValue: () => value };
}

describe("resolveDatabaseKey", () => {
  it("generates and stores a raw key only for a new database", async () => {
    const { secureStore, getValue } = makeSecureStore(null);
    const generatedKey = "a".repeat(64);
    const generateRawKey = jest.fn(async () => generatedKey);

    const result = await resolveDatabaseKey(
      false,
      "new-database-key",
      secureStore,
      generateRawKey,
    );

    expect(result).toEqual({ key: generatedKey, generated: true });
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "new-database-key",
      generatedKey,
    );
    expect(getValue()).toBe(generatedKey);
  });

  it("reuses a valid stored key without generating or replacing it", async () => {
    const storedKey = "b".repeat(64);
    const { secureStore } = makeSecureStore(storedKey);
    const generateRawKey = jest.fn(async () => "c".repeat(64));

    const result = await resolveDatabaseKey(
      true,
      "existing-database-key",
      secureStore,
      generateRawKey,
    );

    expect(result).toEqual({ key: storedKey, generated: false });
    expect(generateRawKey).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("fails closed when a database exists and its key is missing", async () => {
    const { secureStore } = makeSecureStore(null);
    const generateRawKey = jest.fn(async () => "d".repeat(64));

    await expect(
      resolveDatabaseKey(
        true,
        "lost-key-database",
        secureStore,
        generateRawKey,
      ),
    ).rejects.toMatchObject({
      code: "MISSING_KEY_FOR_EXISTING_DATABASE",
    });
    expect(generateRawKey).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("fails closed for an invalid stored key instead of replacing it", async () => {
    const { secureStore } = makeSecureStore("not-a-raw-key");
    const generateRawKey = jest.fn(async () => "e".repeat(64));

    await expect(
      resolveDatabaseKey(false, "invalid-key", secureStore, generateRawKey),
    ).rejects.toMatchObject({
      code: "INVALID_STORED_KEY",
    });
    expect(generateRawKey).not.toHaveBeenCalled();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
