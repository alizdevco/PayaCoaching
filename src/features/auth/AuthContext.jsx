// Holds the current Supabase session and the matching profile (with role).
// Loads the session once on app start and keeps it in sync via
// onAuthStateChange, so a valid session survives refresh and browser restart.

import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./authContext.js";
import { getSession, getProfile, onAuthStateChange } from "./authApi.js";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const currentSession = await getSession();
    if (!currentSession?.user?.id) {
      setProfile(null);
      return null;
    }

    const currentProfile = await getProfile(currentSession.user.id);
    setProfile(currentProfile);
    return currentProfile;
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadInitialSession() {
      try {
        const currentSession = await getSession();
        if (!isMounted) {
          return;
        }
        setSession(currentSession);

        if (currentSession?.user?.id) {
          const currentProfile = await getProfile(currentSession.user.id);
          if (isMounted) {
            setProfile(currentProfile);
          }
        }
      } catch (error) {
        console.error("Failed to load session:", error.message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialSession();

    const subscription = onAuthStateChange(async (nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        try {
          const nextProfile = await getProfile(nextSession.user.id);
          setProfile(nextProfile);
        } catch (error) {
          console.error("Failed to load profile:", error.message);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    profile,
    role: profile?.role ?? null,
    isLoading,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
