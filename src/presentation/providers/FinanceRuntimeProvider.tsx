import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { FinanceRuntime } from "../../infrastructure/finance-runtime";

interface FinanceRuntimeState {
  runtime: FinanceRuntime | null;
  error: string | null;
  loading: boolean;
}

const FinanceRuntimeContext = createContext<FinanceRuntimeState>({ runtime: null, error: null, loading: true });

export function FinanceRuntimeProvider({ createRuntime, children }: PropsWithChildren<{ createRuntime: () => Promise<FinanceRuntime> }>) {
  const [state, setState] = useState<FinanceRuntimeState>({ runtime: null, error: null, loading: true });
  useEffect(() => {
    let active = true;
    createRuntime().then((runtime) => {
      if (active) setState({ runtime, error: null, loading: false });
    }).catch((error: unknown) => {
      if (active) setState({ runtime: null, error: error instanceof Error ? error.message : "Không thể khởi tạo dữ liệu tài chính.", loading: false });
    });
    return () => { active = false; };
  }, [createRuntime]);
  return <FinanceRuntimeContext.Provider value={state}>{children}</FinanceRuntimeContext.Provider>;
}

export function useFinanceRuntime(): FinanceRuntimeState {
  return useContext(FinanceRuntimeContext);
}
