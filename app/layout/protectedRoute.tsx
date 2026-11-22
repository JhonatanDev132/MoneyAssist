import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "~/service/firebase";
import { Spinner } from "~/components/ui";

export function ProtectedRoute() {
  const [user, setUser] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCarregando(false);
    });
    return unsubscribe;
  }, []);

  if (carregando) {
    return (
      <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-dark text-zinc-400">
        <Spinner className="h-6 w-6 text-brand-yellow" />
        <p className="text-sm">Carregando seus dados...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default ProtectedRoute;
