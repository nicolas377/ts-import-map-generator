import { readFileSync, Stats, statSync } from "node:fs";
import { resolve as getAbsolutePath, join as joinPath } from "node:path";
import { Debug } from "utils/debug";

const enum PathType {
  File,
  Other,
}

// Represents a path in the filesystem. Includes methods to read the file contents, and to get the path's parent directory.
// Does not support directories.
class Path {
  // with js truthiness, this could be used as a isNotFile switch
  private readonly pathType: PathType;

  private cache = {
    parent: undefined as Stats | undefined,
    fileContents: undefined as string | false | undefined,
  };

  constructor(
    private readonly _providedPath: string,
    private readonly absolutePath: string,
  ) {
    this.pathType = statSync(this.absolutePath).isFile()
      ? PathType.File
      : PathType.Other;
  }

  // TODO: do i need to handle false, since an error was thrown?
  public readFile(): string {
    if (this.cache.fileContents) {
      return this.cache.fileContents;
    }

    Debug.assert(
      this.cache.fileContents !== false,
      `Path is not a file: ${this.absolutePath}`,
    );

    if (this.pathType !== PathType.File) {
      this.cache.fileContents = false;
      Debug.fail(`Path is not a file: ${this.absolutePath}`);
    }

    return (this.cache.fileContents = readFileSync(this.absolutePath, "utf8"));
  }

  // Most likely returns a directory.
  public get parent(): Stats {
    return (
      this.cache.parent ??
      (this.cache.parent = statSync(joinPath(this.absolutePath, "..")))
    );
  }

  public get path(): string {
    return this.absolutePath;
  }
}

const pathCache = new Map<string, Path>();

export function getPath(providedPath: string): Path {
  const absolutePath = getAbsolutePath(providedPath);

  if (!pathCache.has(absolutePath)) {
    pathCache.set(absolutePath, new Path(providedPath, absolutePath));
  }

  return pathCache.get(absolutePath)!;
}

export type { Path };
