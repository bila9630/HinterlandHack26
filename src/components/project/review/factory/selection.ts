import { createContext } from "react";

// The id of the selected person or vehicle, if any.
export const SelectionContext = createContext<string | null>(null);
