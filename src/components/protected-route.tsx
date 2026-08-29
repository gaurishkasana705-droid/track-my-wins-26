import type { ReactNode } from "react";

// Authentication has been removed: every visitor enters the app directly.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
