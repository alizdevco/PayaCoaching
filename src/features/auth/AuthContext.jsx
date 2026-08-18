// Holds the current Supabase session and the matching profile (with role).
// Loads the session once on app start and keeps it in sync via
// onAuthStateChange, so a valid session survives refresh and browser restart.

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "./authContext.js";
import { isDefinitiveProfileLoadFailure } from "./authMutationErrors.js";
import {
  hasStoredSessionHint,
  requiresAuthBootstrap,
  shouldDeferAuthBootstrap,
} from "./sessionHint.js";
import { queryClient } from "../../lib/queryClient.js";

function prefetchStudentRouteChunks(pathname) {
  if (!pathname.startsWith("/student")) {
    return;
  }

  void import("../../components/StudentLayout.jsx").catch(() => {});
  void import("../../pages/student/StudentExamsPage.jsx").catch(() => {});
}

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

function getInitialAuthState(pathname) {
  const deferBootstrap = shouldDeferAuthBootstrap(pathname);

  return {
    deferBootstrap,
    isLoading: !deferBootstrap,
    isSessionValidated: deferBootstrap,
  };
}

export function AuthProvider({ children }) {
  const { pathname } = useLocation();
  const initialAuthStateRef = useRef(null);
  if (!initialAuthStateRef.current) {
    initialAuthStateRef.current = getInitialAuthState(pathname);
  }

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(initialAuthStateRef.current.isLoading);
  const [isSessionValidated, setIsSessionValidated] = useState(
    initialAuthStateRef.current.isSessionValidated,
  );
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(null);
  const profileRef = useRef(null);
  const bootstrapRef = useRef({
    started: false,
    done: false,
    promise: null,
    cleanup: null,
  });

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const runBootstrap = useCallback(async () => {
    if (bootstrapRef.current.done) {
      return;
    }

    if (bootstrapRef.current.promise) {
      return bootstrapRef.current.promise;
    }

    bootstrapRef.current.started = true;
    setIsLoading(true);
    setIsSessionValidated(false);

    bootstrapRef.current.promise = (async () => {
      if (pathname.startsWith("/student") || hasStoredSessionHint()) {
        prefetchStudentRouteChunks(pathname);
      }

      const [
        { getSession, getProfile, getProfileWithRetry, onAuthStateChange },
        { supabase },
      ] = await Promise.all([
        import("./authApi.js"),
        import("../../lib/supabase.js"),
      ]);

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
          setIsProfileLoading(true);

          try {
            const currentProfile = await getProfile(userData.user.id);
            if (isMounted) {
              setProfile(currentProfile);
              prefetchStudentExams(currentProfile);
            }
          } catch (error) {
            console.error("Failed to load profile:", error.message);
            if (isMounted && isDefinitiveProfileLoadFailure(error)) {
              setProfile(null);
            }
          } finally {
            if (isMounted) {
              setIsProfileLoading(false);
            }
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

      await loadInitialSession();

      const subscription = onAuthStateChange(async (event, nextSession) => {
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

        if (event === "TOKEN_REFRESHED") {
          return;
        }

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

      bootstrapRef.current.cleanup = () => {
        isMounted = false;
        subscription.unsubscribe();
      };
      bootstrapRef.current.done = true;
    })();

    try {
      await bootstrapRef.current.promise;
    } finally {
      bootstrapRef.current.promise = null;
    }
  }, []);

  const ensureBootstrapped = useCallback(async () => {
    if (bootstrapRef.current.done || bootstrapRef.current.started) {
      if (bootstrapRef.current.promise) {
        await bootstrapRef.current.promise;
      }
      return;
    }

    await runBootstrap();
  }, [runBootstrap]);

  useEffect(() => {
    if (pathname.startsWith("/student")) {
      prefetchStudentRouteChunks(pathname);
    }

    if (requiresAuthBootstrap(pathname)) {
      void ensureBootstrapped();
    }
  }, [pathname, ensureBootstrapped]);

  useEffect(
    () => () => {
      bootstrapRef.current.cleanup?.();
    },
    [],
  );

  const refreshProfile = useCallback(async () => {
    await ensureBootstrapped();

    const [{ getSession, getProfile }, { supabase }] = await Promise.all([
      import("./authApi.js"),
      import("../../lib/supabase.js"),
    ]);

    const currentSession = await getSession();
    if (!currentSession?.user?.id) {
      setSession(currentSession);
      setProfile(null);
      return null;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

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
  }, [ensureBootstrapped]);

  const isAuthPending =
    requiresAuthBootstrap(pathname) && !bootstrapRef.current.done;

  const value = {
    session,
    profile,
    role: profile?.role ?? null,
    isLoading: isAuthPending || isLoading,
    isSessionValidated: isAuthPending ? false : isSessionValidated,
    isProfileLoading,
    profileLoadError,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
