import { buildTree } from "./builder";
import { getPath, Path } from "./path";
import { Import, readImports } from "./reader";

export function buildImportTree(entrypointLocation: string): void {
  const entrypoint = getPath(entrypointLocation);
  const buildingTree: Record<string, Import[]> = {};

  processAndStoreImports(entrypoint);
  return buildTree(buildingTree, entrypoint);

  function processAndStoreImports(filePath: Path): void {
    const imports = readImports(filePath);
    buildingTree[filePath.path] = imports;

    for (const x of imports) {
      if (buildingTree[x.destination?.path ?? ""] || x.isExternalModule) {
        return;
      }

      processAndStoreImports(x.destination!);
    }
  }
}
