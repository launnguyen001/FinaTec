import { renderRouter, screen } from "expo-router/testing-library";

describe("Expo Router entry route", () => {
  it("renders the root screen from src/app", async () => {
    await renderRouter("./src/app");

    expect(screen).toHavePathname("/");
    expect(screen.getByText("Két Số")).toBeTruthy();
  });
});
