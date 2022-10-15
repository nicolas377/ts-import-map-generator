import { ArgumentKind } from "cli/options/arguments";
import { argumentKindToOptionNameMap, programOptions } from "utils/options";

describe("options", () => {
  const originalOptions = { ...programOptions };

  afterEach(() => {
    Object.assign(programOptions, originalOptions);
  });

  test("should have a default value for all options", () => {
    const allOptions = Object.keys(argumentKindToOptionNameMap);

    for (const option of allOptions) {
      expect(
        programOptions[option as keyof typeof programOptions]
      ).toBeDefined();
    }
  });

  test("default options should match snapshot", () => {
    expect(programOptions).toMatchSnapshot();
  });

  test("should be able to set options by a setter", () => {
    programOptions.entrypointLocation = "test";
    expect(programOptions.entrypointLocation).toBe("test");
  });

  test("should be able to set options setOption()", () => {
    programOptions.setOption(ArgumentKind.Entrypoint, "test");
    expect(programOptions.entrypointLocation).toBe("test");
  });

  test("should be able to get options by getOption()", () => {
    programOptions.entrypointLocation = "test";
    expect(programOptions.getOption(ArgumentKind.Entrypoint)).toBe("test");
  });
});
