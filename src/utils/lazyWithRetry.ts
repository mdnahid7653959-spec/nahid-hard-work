import { lazy, ComponentType } from "react";

/**
 * Enhanced React.lazy wrapper that automatically retries and handles stale chunk deployments
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageRefreshed = sessionStorage.getItem("chunk_retry_refreshed");

    try {
      const component = await componentImport();
      sessionStorage.setItem("chunk_retry_refreshed", "false");
      return component;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.message?.includes("Loading chunk");

      if (isChunkError && pageRefreshed !== "true") {
        sessionStorage.setItem("chunk_retry_refreshed", "true");
        window.location.reload();
      }

      throw error;
    }
  });
}
