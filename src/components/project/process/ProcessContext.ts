import { createContext, useContext } from "react";
import { ProcessModel } from "./useProcess";

const ProcessContext = createContext<ProcessModel | null>(null);

export const ProcessProvider = ProcessContext.Provider;

export function useProcessContext() {
  const model = useContext(ProcessContext);
  if (!model) throw new Error("useProcessContext must be used inside a ProcessProvider");
  return model;
}
