import { useContext } from "react";
import { SyncContext } from "./SyncContext";

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};
