import { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "~/service/firebase";

export function NavBar() {

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Opcional: Redirecionar após o logout se necessário
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  return (
    <nav className="bg-surface-dark border border-surface-border p-4 flex items-center">
      <h1 className="text-xl font-bold text-brand-yellow">Money Assist</h1>
      <div className="ml-auto relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-brand-yellow w-11 h-11 rounded-full flex items-center justify-center text-surface-dark font-bold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-brand-yellow/50"
          aria-label="Menu do usuário"
        >
          {/* Iniciais ou ícone do usuário */}
          U
        </button>

        {/* Menu Suspenso (Dropdown) */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-surface-dark border border-surface-border rounded-xl shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-2 border-b border-surface-border">
              <p className="text-xs text-zinc-400">Logado como</p>
              <p className="text-sm font-medium text-white truncate">
                {auth.currentUser?.email ?? "Usuário"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-surface-border/50 transition-colors flex items-center gap-2"
            >
              Sair da conta
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}