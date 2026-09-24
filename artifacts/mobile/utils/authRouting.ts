export type AuthRedirect = "/(auth)/sign-in" | "/(tabs)" | null;

export function resolveAuthRedirect({
  isLoaded,
  isSignedIn,
  inAuthGroup,
  atRoot,
}: {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  inAuthGroup: boolean;
  atRoot: boolean;
}): AuthRedirect {
  if (!isLoaded || isSignedIn === undefined) return null;
  if (!isSignedIn && !inAuthGroup) return "/(auth)/sign-in";
  if (isSignedIn && (inAuthGroup || atRoot)) return "/(tabs)";
  return null;
}
