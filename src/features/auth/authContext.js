// The auth context object lives in its own file so the provider component file
// only exports components (keeps React Fast Refresh happy).

import { createContext } from "react";
export const AuthContext = createContext(null);
