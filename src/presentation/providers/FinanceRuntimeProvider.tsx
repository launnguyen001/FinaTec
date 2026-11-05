import { AppState } from "react-native";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { FinanceRuntime } from "../../infrastructure/finance-runtime";
import { registerAssetRefreshTask } from "../../infrastructure/background/asset-refresh-task";

interface FinanceRuntimeState {
  runtime: FinanceRuntime | null;
  error: string | null;
  loading: boolean;
}

const FinanceRuntimeContext = createContext<FinanceRuntimeState>({
  runtime: null,
  error: null,
  loading: true,
});

export function FinanceRuntimeProvider({
  createRuntime,
  children,
}: PropsWithChildren<{ createRuntime: () => Promise<FinanceRuntime> }>) {
  const [state, setState] = useState<FinanceRuntimeState>({
    runtime: null,
    error: null,
    loading: true,
  });
  useEffect(() => {
    let active = true;
    createRuntime()
      .then((runtime) => {
        if (active) setState({ runtime, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            runtime: null,
            error:
              error instanceof Error
                ? error.message
                : "Không thể khởi tạo dữ liệu tài chính.",
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [createRuntime]);
  useEffect(() => {
    const runtime = state.runtime;
    if (!runtime) return;
    void registerAssetRefreshTask().catch(() => undefined);
    let refreshing = false;
    const refresh = () => {
      if (refreshing) return;
      refreshing = true;
      void runtime.assetPriceRefresh
        .refreshDueAssets(false)
        .catch(() => undefined)
        .finally(() => {
          refreshing = false;
        });
    };
    refresh();
    void runtime.interest.catchUpActivePlans().catch(() => undefined);
    void runtime.liabilities.syncStatuses().catch(() => undefined);
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refresh();
        void runtime.interest.catchUpActivePlans().catch(() => undefined);
        void runtime.liabilities.syncStatuses().catch(() => undefined);
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [state.runtime]);

  return (
    <FinanceRuntimeContext.Provider value={state}>
      {children}
    </FinanceRuntimeContext.Provider>
  );
}

export function useFinanceRuntime(): FinanceRuntimeState {
  return useContext(FinanceRuntimeContext);
}
