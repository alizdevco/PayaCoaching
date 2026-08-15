// Holds the current Supabase session and the matching profile (with role).
// Loads the session once on app start and keeps it in sync via
// onAuthStateChange, so a valid session survives refresh and browser restart.

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext } from "./authContext.js";
import { getSession, getProfile, onAuthStateChange } from "./authApi.js";
import { examListQueryOptions } from "../exams/useExamList.js";
import { queryClient } from "../../lib/queryClient.js";

function prefetchStudentExams(profile) {
  if (profile?.role !== "student") {
    return;
  }

  void queryClient
    .prefetchQuery(examListQueryOptions({ publishedOnly: true }))
    .catch((error) => {
      console.error("Failed to prefetch exams:", error.message);
    });
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    const currentSession = await getSession();
    setSession(currentSession);
    if (!currentSession?.user?.id) {
      setProfile(null);
      return null;
    }
    const currentProfile = await getProfile(currentSession.user.id);
    setProfile(currentProfile);
    prefetchStudentExams(currentProfile);
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
            prefetchStudentExams(currentProfile);
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

    const subscription = onAuthStateChange(async (event, nextSession) => {
      // Initial session + profile are loaded by loadInitialSession above.
      if (event === "INITIAL_SESSION") {
        return;
      }

      setSession(nextSession);

      if (!nextSession?.user?.id) {
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      const userId = nextSession.user.id;
      const currentProfile = profileRef.current;

      // Token refresh only renews the JWT — profile data is unchanged.
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      // Same user already loaded — skip refetch to avoid tab-switch flicker.
      if (currentProfile?.id === userId && event !== "USER_UPDATED") {
        return;
      }

      const shouldBlockUi = !currentProfile || currentProfile.id !== userId;

      if (shouldBlockUi) {
        setIsProfileLoading(true);
      }

      try {
        const nextProfile = await getProfile(userId);
        setProfile(nextProfile);
        prefetchStudentExams(nextProfile);
      } catch (error) {
        console.error("Failed to load profile:", error.message);
        if (shouldBlockUi) {
          setProfile(null);
        }
      } finally {
        if (shouldBlockUi) {
          setIsProfileLoading(false);
        }
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
    isProfileLoading,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
