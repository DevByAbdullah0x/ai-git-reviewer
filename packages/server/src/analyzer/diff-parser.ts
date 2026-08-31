import parseDiff from 'parse-diff';
import { ParsedDiffFile, ParsedDiffHunk } from '@ai-reviewer/shared';

export interface FileChangeContext {
  filePath: string;
  isNew: boolean;
  isDeleted: boolean;
  additions: number;
  deletions: number;
  changedLines: number[]; // All added/modified line numbers in new file
  lineMap: Map<number, { content: string; position: number }>;
  hunks: ParsedDiffHunk[];
  diffText: string;
}

export function parseUnifiedDiff(rawDiff: string): FileChangeContext[] {
  if (!rawDiff || rawDiff.trim().length === 0) {
    return [];
  }

  let parsedFiles: parseDiff.File[] = [];
  try {
    parsedFiles = parseDiff(rawDiff);
  } catch (err) {
    // If standard parser fails on loose snippets, normalize diff header and retry
    try {
      const normalized = normalizeSnippetToDiff(rawDiff);
      parsedFiles = parseDiff(normalized);
    } catch {
      return [];
    }
  }

  const results: FileChangeContext[] = [];

  for (const file of parsedFiles) {
    const filePath = file.to || file.from || 'unknown_file';
    // Remove leading a/ or b/ if present
    const cleanPath = filePath.replace(/^[ab]\//, '');

    const changedLines: number[] = [];
    const lineMap = new Map<number, { content: string; position: number }>();
    const hunks: ParsedDiffHunk[] = [];

    let overallPosition = 0;

    for (const chunk of file.chunks) {
      const hunkLines: ParsedDiffHunk['lines'] = [];

      for (const line of chunk.changes) {
        overallPosition++;
        const isAdd = line.type === 'add';
        const isDel = line.type === 'del';
        const isNormal = line.type === 'normal';

        const newLineNumber = 'ln' in line ? line.ln : 'ln2' in line ? line.ln2 : undefined;
        const oldLineNumber = 'ln1' in line ? line.ln1 : undefined;

        hunkLines.push({
          type: isAdd ? 'add' : isDel ? 'del' : 'normal',
          content: line.content,
          oldLineNumber,
          newLineNumber,
          position: overallPosition,
        });

        if (isAdd && newLineNumber !== undefined) {
          changedLines.push(newLineNumber);
          lineMap.set(newLineNumber, {
            content: line.content,
            position: overallPosition,
          });
        }
      }

      hunks.push({
        content: chunk.content,
        oldStart: chunk.oldStart,
        oldLines: chunk.oldLines,
        newStart: chunk.newStart,
        newLines: chunk.newLines,
        lines: hunkLines,
      });
    }

    results.push({
      filePath: cleanPath,
      isNew: Boolean(file.new),
      isDeleted: Boolean(file.deleted),
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      changedLines,
      lineMap,
      hunks,
      diffText: extractFileDiff(rawDiff, cleanPath),
    });
  }

  return results;
}

function normalizeSnippetToDiff(snippet: string): string {
  // If user pasted bare diff hunks or code snippet
  if (!snippet.startsWith('diff --git') && !snippet.startsWith('--- ')) {
    return `--- a/file.ts\n+++ b/file.ts\n@@ -1,1 +1,${snippet.split('\n').length} @@\n${snippet
      .split('\n')
      .map((l) => (l.startsWith('+') || l.startsWith('-') || l.startsWith(' ') ? l : `+${l}`))
      .join('\n')}`;
  }
  return snippet;
}

function extractFileDiff(rawDiff: string, filePath: string): string {
  const parts = rawDiff.split(/(?=diff --git)/g);
  const matched = parts.find((p) => p.includes(filePath));
  return matched || rawDiff;
}

