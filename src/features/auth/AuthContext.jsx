// Holds the current Supabase session and the matching profile (with role).
// Loads the session once on app start and keeps it in sync via
// onAuthStateChange, so a valid session survives refresh and browser restart.

import { useCallback, useEffect, useRef, useState } from "react";
import { AuthContext } from "./authContext.js";
import { isDefinitiveProfileLoadFailure } from "./authMutationErrors.js";
import {
  getSession,
  getProfile,
  getProfileWithRetry,
  onAuthStateChange,
} from "./authApi.js";
import { queryClient } from "../../lib/queryClient.js";
import { supabase } from "../../lib/supabase.js";

function prefetchStudentExams(profile) {
  if (profile?.role !== "student") {
    return;
  }

  void import("../exams/useExamList.js")
    .then(({ examListQueryOptions }) =>
      queryClient.prefetchQuery(
        examListQueryOptions({ publishedOnly: true }),
      ),
    )
    .catch((error) => {
      console.error("Failed to prefetch exams:", error.message);
    });
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionValidated, setIsSessionValidated] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(null);
  const profileRef = useRef(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const refreshProfile = useCallback(async () => {
    const currentSession = await getSession();
    if (!currentSession?.user?.id) {
      setSession(currentSession);
      setProfile(null);
      return null;
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      await supabase.auth.signOut({ scope: "local" });
      setSession(null);
      setProfile(null);
      return null;
    }

    setSession(currentSession);
    const currentProfile = await getProfile(userData.user.id);
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

        if (!currentSession?.user?.id) {
          setSession(null);
          return;
        }

        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (!isMounted) {
          return;
        }

        if (userError || !userData.user) {
          await supabase.auth.signOut({ scope: "local" });
          setSession(null);
          setProfile(null);
          return;
        }

        setSession(currentSession);

        const currentProfile = await getProfile(userData.user.id);
        if (isMounted) {
          setProfile(currentProfile);
          prefetchStudentExams(currentProfile);
        }
      } catch (error) {
        console.error("Failed to load session:", error.message);
      } finally {
        if (isMounted) {
          setIsSessionValidated(true);
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
        setProfileLoadError(null);
        const nextProfile = await getProfileWithRetry(userId);
        setProfile(nextProfile);
        prefetchStudentExams(nextProfile);
      } catch (error) {
        console.error("Failed to load profile:", error.message);
        if (isDefinitiveProfileLoadFailure(error)) {
          setProfileLoadError(null);
          if (shouldBlockUi) {
            setProfile(null);
          }
        } else {
          setProfileLoadError(error);
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
    isSessionValidated,
    isProfileLoading,
    profileLoadError,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

