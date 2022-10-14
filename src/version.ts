import { version as programVersion } from "../package.json";
import {
  checkIsReadonlyArray,
  compareValues,
  Comparison,
  Debug,
  emptyArray,
} from "utils";

// Implements the SemVer 2.0 spec
// A lot of this code is borrowed from typescript's semver.ts, but repurposed for our purposes
export class Semver {
  static readonly zero = new Semver(0, 0, 0, ["0"]);

  public readonly major: number;
  public readonly minor: number;
  public readonly patch: number;
  public readonly prerelease: readonly string[];
  public readonly build: readonly string[];

  constructor(text: string);
  constructor(
    major: number,
    minor: number,
    patch: number,
    prerelease?: string | readonly string[],
    build?: string | readonly string[]
  );
  constructor(
    major: number | string,
    // These defaults are never used, they're just here to provide type compatibility between the signatures
    minor = 0,
    patch = 0,
    prerelease: string | readonly string[] = "",
    build: string | readonly string[] = ""
  ) {
    if (typeof major === "string") {
      const result = Debug.checkDefined(
        parseSemverComponents(major),
        "Invalid version"
      );

      ({ major, minor, patch, prerelease, build } = result);
    }

    Debug.assert(
      !Number.isNaN(major) && major >= 0,
      "Major version should be a positive number"
    );
    Debug.assert(
      !Number.isNaN(minor) && minor >= 0,
      "Minor version should be a positive number"
    );
    Debug.assert(
      !Number.isNaN(patch) && patch >= 0,
      "Patch version should be a positive number"
    );

    const prereleaseArray =
      prerelease === ""
        ? emptyArray
        : checkIsReadonlyArray(prerelease)
        ? prerelease
        : prerelease.split(".");
    const buildArray =
      build === ""
        ? emptyArray
        : checkIsReadonlyArray(build)
        ? build
        : build.split(".");

    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.prerelease = prereleaseArray;
    this.build = buildArray;
  }

  public toString(): string {
    let result = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease.length) result += `-${this.prerelease.join(".")}`;
    if (this.build.length) result += `+${this.build.join(".")}`;
    return result;
  }

  private comparePrerelease(
    left: readonly string[],
    right: readonly string[]
  ): Comparison {
    if (left === right) return Comparison.Equal;
    if (left.length === 0)
      return right.length === 0 ? Comparison.Equal : Comparison.GreaterThan;
    if (right.length === 0) return Comparison.LessThan;

    // The earlier elements are more significant, and comparisons from them are returned if they're not equal.
    const length = Math.min(left.length, right.length);
    for (let i = 0; i < length; i++) {
      const leftIdentifier = left[i]!;
      const rightIdentifier = right[i]!;

      if (leftIdentifier === rightIdentifier) continue;

      const leftIsNumber = stringIsNumeric(leftIdentifier);
      const rightIsNumber = stringIsNumeric(rightIdentifier);

      if (leftIsNumber || rightIsNumber) {
        // Non-numeric values get precedence over numeric values
        if (leftIsNumber !== rightIsNumber) {
          return leftIsNumber ? Comparison.LessThan : Comparison.GreaterThan;
        }

        // Identifiers consisting of only digits are compared numerically
        const result = compareValues(+leftIdentifier, +rightIdentifier);
        if (result !== Comparison.Equal) return result;
      }
    }

    // Larger sets of prerelease components get precedence.
    return compareValues(left.length, right.length);

    function stringIsNumeric(s: string) {
      return !Number.isNaN(+s);
    }
  }

  // remember that the result says that this instance is blank to the argument
  public compareTo(other: Semver | undefined): Comparison {
    if (other === undefined) {
      return Comparison.GreaterThan;
    }
    if (this === other) {
      return Comparison.Equal;
    }

    return (
      compareValues(this.major, other.major) ||
      compareValues(this.minor, other.minor) ||
      compareValues(this.patch, other.patch) ||
      this.comparePrerelease(this.prerelease, other.prerelease)
    );
  }
}

interface SemverComponents {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
  build: string;
}

function parseSemverComponents(text: string): SemverComponents | undefined {
  const match =
    /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*)(?:-([a-z0-9-.]+))?(?:\+([a-z0-9-.]+))?)?)?$/i.exec(
      text
    );

  if (!match) return undefined;

  const [, major, minor = "0", patch = "0", prerelease = "", build = ""] =
    match;

  Debug.assertIsDefined(major, "Major version should be defined");

  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    prerelease,
    build,
  };
}

export const generatorVersion = new Semver(programVersion);

export { programVersion };
