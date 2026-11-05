import {
  parseFxRateRatio,
  splitDecliningPrincipalInput,
} from "./liability-input";

describe("liability input parsing", () => {
  it.each([
    ["1", { numerator: "1", denominator: "1" }],
    ["25000", { numerator: "25000", denominator: "1" }],
    ["1.25", { numerator: "125", denominator: "100" }],
    ["0.00000001", { numerator: "1", denominator: "100000000" }],
    ["1,25", { numerator: "125", denominator: "100" }],
  ])("parses FX rate %s as an exact rational", (input, expected) => {
    expect(parseFxRateRatio(input)).toEqual(expected);
  });

  it.each(["0", "-1", "1.123456789", "abc"])(
    "rejects invalid FX rate %s",
    (input) => {
      expect(() => parseFxRateRatio(input)).toThrow();
    },
  );

  it("splits custom principal amounts by newline or semicolon", () => {
    expect(splitDecliningPrincipalInput("100\n200;\n300")).toEqual([
      "100",
      "200",
      "300",
    ]);
  });
});
