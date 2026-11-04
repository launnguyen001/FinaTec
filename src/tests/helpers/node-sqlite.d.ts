declare module "node:sqlite" {
  export type SQLInputValue = null | number | bigint | string | Uint8Array;

  export interface StatementSync {
    all(...parameters: SQLInputValue[]): unknown[];
    get(...parameters: SQLInputValue[]): unknown;
    run(...parameters: SQLInputValue[]): {
      changes: number | bigint;
      lastInsertRowid: number | bigint;
    };
    setReturnArrays(enabled: boolean): void;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(source: string): void;
    prepare(source: string): StatementSync;
    close(): void;
  }
}
