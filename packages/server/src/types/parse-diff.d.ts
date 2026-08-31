declare module 'parse-diff' {
  namespace parseDiff {
    interface Change {
      type: 'add' | 'del' | 'normal';
      del?: boolean;
      add?: boolean;
      normal?: boolean;
      ln?: number;
      ln1?: number;
      ln2?: number;
      content: string;
    }

    interface Chunk {
      content: string;
      changes: Change[];
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
    }

    interface File {
      chunks: Chunk[];
      deletions: number;
      additions: number;
      from?: string;
      to?: string;
      oldHeader?: string;
      newHeader?: string;
      index?: string[];
      deleted?: boolean;
      new?: boolean;
    }
  }

  function parseDiff(diff: string): parseDiff.File[];
  export = parseDiff;
}

