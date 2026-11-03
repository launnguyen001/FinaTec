import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { createFinanceRuntime } from "../finance-runtime";

export const ASSET_REFRESH_TASK = "ketso.asset-price-refresh.v1";

TaskManager.defineTask(ASSET_REFRESH_TASK, async () => {
  try {
    const runtime = await createFinanceRuntime();
    const outcomes = await runtime.assetPriceRefresh.refreshDueAssets(false);
    const hasFailure = outcomes.some((outcome) => outcome.status === "FAILED");
    return hasFailure
      ? BackgroundTask.BackgroundTaskResult.Failed
      : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerAssetRefreshTask(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  const isRegistered =
    await TaskManager.isTaskRegisteredAsync(ASSET_REFRESH_TASK);
  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(ASSET_REFRESH_TASK, {
      minimumInterval: 15,
    });
  }
  return true;
}
