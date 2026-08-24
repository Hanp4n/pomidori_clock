import { useContext } from "react";
import { PomodoroConfigContext } from "./PomodoroConfigContext";

export const usePomodoroConfig = () => {
  const context = useContext(PomodoroConfigContext);
  if (!context) {
    throw new Error('usePomodoroConfig must be used within PomodoroConfigProvider');
  }
  return context;
};
