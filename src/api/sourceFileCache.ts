import { createSourceFile, ScriptTarget, SourceFile } from "typescript";
import { Path } from "./path";

const sourceFileCache: Record<string, SourceFile> = {};

export function getSourceFile(file: Path): SourceFile {
  return (
    sourceFileCache[file.path] ??
    (sourceFileCache[file.path] = createSourceFile(
      file.path,
      file.readFile(),
      ScriptTarget.Latest,
      true,
    ))
  );
}
