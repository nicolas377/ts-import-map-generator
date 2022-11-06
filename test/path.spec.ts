import { Path } from "utils/path";

describe("Path class", () => {
  it("should only throw when constructed with an empty path", () => {
    expect(() => new Path("")).toThrowErrorMatchingSnapshot();
  });

  it("doesn't throw on non-existent path", () => {
    expect(() => new Path("foo")).not.toThrow();
  });
});
