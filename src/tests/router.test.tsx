import { renderRouter, screen } from "expo-router/testing-library";

describe("Expo Router routes", () => {
  it("renders the root screen from src/app", async () => {
    await renderRouter("./src/app");

    expect(screen).toHavePathname("/");
    expect(screen.getByText("Két Số")).toBeTruthy();
  });

  it("renders the accounts screen", async () => {
    await renderRouter("./src/app", { initialUrl: "/accounts" });

    expect(screen).toHavePathname("/accounts");
    expect(screen.getByText("QUẢN LÝ")).toBeTruthy();
  });

  it("renders the categories screen", async () => {
    await renderRouter("./src/app", { initialUrl: "/categories" });

    expect(screen).toHavePathname("/categories");
    expect(screen.getByText("PHÂN LOẠI")).toBeTruthy();
  });

  it("renders the quick-expense screen", async () => {
    await renderRouter("./src/app", { initialUrl: "/quick-expense" });

    expect(screen).toHavePathname("/quick-expense");
    expect(screen.getByText("Khoản chi")).toBeTruthy();
  });

  it("renders the quick-income screen", async () => {
    await renderRouter("./src/app", { initialUrl: "/quick-income" });

    expect(screen).toHavePathname("/quick-income");
    expect(screen.getByText("Khoản thu")).toBeTruthy();
  });

  it("renders the transfer screen", async () => {
    await renderRouter("./src/app", { initialUrl: "/transfer" });

    expect(screen).toHavePathname("/transfer");
    expect(screen.getByText("CHUYỂN TIỀN NỘI BỘ")).toBeTruthy();
  });

  it("renders the opening-balance screen", async () => {
    await renderRouter("./src/app", { initialUrl: "/opening-balance" });

    expect(screen).toHavePathname("/opening-balance");
    expect(screen.getByText("THIẾT LẬP LEDGER")).toBeTruthy();
  });

  it("renders the history screen", async () => {
    await renderRouter("./src/app", { initialUrl: "/history" });

    expect(screen).toHavePathname("/history");
    expect(screen.getByText("Lịch sử giao dịch")).toBeTruthy();
  });
});
