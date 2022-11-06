import {
  createSourceFile as createTsSourceFile,
  ScriptTarget as TsScriptTarget,
} from "typescript";
import { Debug } from "utils/debug";
import { Path, PathType } from "utils/path";

interface ImportMap {
  [key: string]: string[];
}

export function generateImportMap(entrypoint: string): ImportMap {
  const entrypointPath = new Path(entrypoint);

  Debug.assert(
    fileIsValidTsFile(entrypointPath),
    "Entrypoint must be a valid ts file"
  );

  console.log(getImportedFilesOfFile(entrypointPath));

  return {};

  function fileIsValidTsFile(filePath: Path): boolean {
    return (
      // ensure entrypoint exists and is a file
      filePath.type === PathType.File &&
      // ensure entrypoint file extension matches .ts, .tsx, .d.ts, but not .d.tsx
      /\.((d\.ts)|((?<!\.d\.)tsx?))$/.test(entrypointPath.expandedPath)
    );
  }

  function getImportedFilesOfFile(filePath: Path): Path[] {
    // create a ts representation of the file
    const sourceFile = createTsSourceFile(
      filePath.expandedPath,
      filePath.readFile(),
      TsScriptTarget.Latest
    );

    console.log(sourceFile);

    return [];
  }
}
