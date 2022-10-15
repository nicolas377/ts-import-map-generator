import { Semver } from "version";

describe("Semver class", () => {
  test("should parse a valid semver string", () => {
    const semver = new Semver("1.2.3-alpha.1+build.1");
    expect(semver.major).toBe(1);
    expect(semver.minor).toBe(2);
    expect(semver.patch).toBe(3);
    expect(semver.prerelease).toStrictEqual(["alpha", "1"]);
    expect(semver.build).toStrictEqual(["build", "1"]);
  });

  const invalidSemverStrings: string[] = [
    "1.2.3-alpha.1+build.1.",
    "1.2a.3",
    "1.2.3-alpha.1+build.1.2",
    "1.2.3-alpha.1+build.1+build.2",
    "1.a.3-alpha.1",
  ];

  test.each(invalidSemverStrings)(
    "should throw an error if the string is invalid %s",
    (versionString) => {
      expect(() => new Semver(versionString)).toThrow();
    }
  );
});
