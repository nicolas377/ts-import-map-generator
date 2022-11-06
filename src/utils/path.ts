import {
  readdirSync as readDirectory,
  readFileSync as readFile,
  statSync,
} from "node:fs";
import {
  relative as getRelativePath,
  resolve as getResolvedPath,
  join as joinPaths,
  isAbsolute as pathIsAbsolute,
} from "node:path/posix";
import { cwd as getCurrentWorkingDir } from "node:process";
import { Debug } from "./debug";

export const enum PathType {
  DoesNotExist = 1 << 0,
  File = 1 << 1,
  Directory = 1 << 2,
}

// It doesn't matter what the relativeTo is, just that it's consistent.
const relativeTo = getCurrentWorkingDir();

interface IPathData {
  expandedPath: string;
  relativePath: string;
  type: PathType;
  exists: boolean;
}

interface IPath {
  type: PathType;
  exists: boolean;
  readFile(): string;
  readDir(): Path[];
}

function getPathData(path: string): IPathData {
  const fileStats = statSync(path);

  let isDirectory = false;
  const pathExists =
    fileStats.isFile() || (fileStats.isDirectory() && (isDirectory = true));
  const expandedPath = pathIsAbsolute(path)
    ? getResolvedPath(path)
    : getResolvedPath(relativeTo, path);
  const relativePath = getRelativePath(relativeTo, expandedPath);

  return {
    expandedPath,
    relativePath,
    type: getTypeOfFile(),
    exists: pathExists,
  };

  function getTypeOfFile(): PathType {
    if (!pathExists) {
      return PathType.DoesNotExist;
    }
    if (isDirectory) {
      return PathType.Directory;
    }
    return PathType.File;
  }
}

export class Path implements IPath {
  public readonly type: PathType;
  public readonly exists: boolean;
  public readonly relativePath: string;
  public readonly expandedPath: string;

  constructor(path: string) {
    // Empty path is not allowed
    Debug.assert(path !== "", "Path cannot be empty");

    const pathData = getPathData(path);

    this.expandedPath = pathData.expandedPath;
    this.type = pathData.type;
    this.exists = pathData.exists;
    this.relativePath = pathData.relativePath;
  }

  public readFile(): string {
    // checking bitflags to ensure that the path is a file
    Debug.assert(
      this.type & (PathType.DoesNotExist | PathType.Directory),
      "Path is not a file"
    );

    return readFile(this.expandedPath, "utf8");
  }

  public readDir(): Path[] {
    // checking bitflags to ensure that the path is a directory
    Debug.assert(
      this.type & (PathType.DoesNotExist | PathType.File),
      "Path is not a directory"
    );

    const paths: Path[] = [];
    // these strings are paths in the directory
    const directoryContents = readDirectory(this.expandedPath);

    for (const path of directoryContents) {
      const realPath = joinPaths(this.expandedPath, path);
      paths.push(new Path(realPath));
    }

    return paths;
  }
}
