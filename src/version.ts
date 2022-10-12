import { version as programVersion } from "../package.json";

interface ISemver {
  major: number;
  minor: number;
  patch: number;
}

interface ParsedComponents {
  major: number;
  minor?: number;
  patch?: number;
  prerelease?: readonly string[];
  build?: readonly string[];
}

// A lot of this code is copied from TypeScript's source, but modified to work for this use-case.
export class Semver implements ISemver {
  static readonly zero = new Semver(0, 0, 0);

  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: readonly string[];
  readonly build: readonly string[];

  constructor(text: string);
  constructor(
    major: number,
    minor?: number,
    patch?: number,
    prerelease?: string | string[],
    build?: string | readonly string[]
  );
  constructor(
    major: number | string,
    minor = 0,
    patch = 0,
    prerelease: string | string[] = "",
    build: string | readonly string[] = ""
  ) {
    if (typeof major === "string") {
      const components = this.tryParseComponents(major);

      if (components === undefined) {
        throw new Error(`Invalid semver string: ${major}`);
      }

      ({ major, minor, patch, prerelease, build } = components);
    }

    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }

  private tryParseComponents(major: string): ParsedComponents | undefined {
    throw new Error("Method not implemented.");
  }
}

export const version = new Semver(programVersion);

export { programVersion };
