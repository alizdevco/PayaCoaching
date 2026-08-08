// Read the current session, profile, and role from anywhere in the app.
import { useContext } from "react";
import { AuthContext } from "./authContext.js";
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
