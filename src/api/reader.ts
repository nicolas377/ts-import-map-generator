import { isBuiltin } from "node:module";
import { dirname } from "node:path";
import {
  CompilerOptions,
  findConfigFile,
  parseJsonConfigFileContent,
  preProcessFile,
  readConfigFile,
  resolveModuleName,
  sys,
} from "typescript";
import { getPath, Path } from "./path";
import { Debug } from "utils/debug";

export const enum ImportFlags {
  None = 0,
  IsExternalModule = 1 << 0,
  IsNodeBuiltIn = 1 << 1,
}

// If isNodeBuiltIn is true, then destination is undefined.
export interface Import {
  descriptor: string;
  root: Path;
  isExternalModule: boolean;
  isNodeBuiltIn: boolean;
  destination?: Path;
}

let tsconfig: CompilerOptions;

export function readImports(file: Path): Import[] {
  if (tsconfig === undefined) {
    const tsconfigLocation = Debug.checkDefined(
      findConfigFile(file.path, sys.fileExists),
      "No config file found",
    );
    tsconfig = parseJsonConfigFileContent(
      readConfigFile(tsconfigLocation, sys.readFile).config,
      sys,
      dirname(tsconfigLocation),
    ).options;
  }

  const importNames: string[] = preProcessFile(
    file.readFile(),
    undefined,
    true,
  ).importedFiles.map((x) => x.fileName);

  return importNames.map((x) => createObjectFromImport(x));

  function createObjectFromImport(importName: string): Import {
    if (isBuiltin(importName)) {
      return {
        descriptor: importName,
        root: file,
        isNodeBuiltIn: true,
        isExternalModule: true,
      };
    }

    const resolvedModule = resolveModuleName(importName, file.path, tsconfig, {
      fileExists: sys.fileExists,
      readFile: sys.readFile,
    }).resolvedModule?.resolvedFileName;

    Debug.assertIsDefined(
      resolvedModule,
      `Could not resolve module: ${importName}`,
    );

    return {
      descriptor: importName,
      root: file,
      isNodeBuiltIn: false,
      destination: getPath(resolvedModule),
      isExternalModule: getPath(resolvedModule).path.includes("node_modules"),
    };
  }
}
