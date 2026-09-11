import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "~/service/firebase";

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
      <div className="flex min-h-screen items-center justify-center bg-bg-dark">
        <p className="text-white">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;