import { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "~/service/firebase";

function BotaoTema() {
  const [claro, setClaro] = useState(false);
  useEffect(() => setClaro(document.documentElement.dataset.theme === "light"), []);

  function alternar() {
    const novo = !claro;
    setClaro(novo);
    if (novo) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("tema", novo ? "light" : "dark"); } catch { /* sem armazenamento: vale só nesta sessão */ }
  }

  return (
    <button onClick={alternar} aria-label={claro ? "Usar tema escuro" : "Usar tema claro"} title={claro ? "Tema escuro" : "Tema claro"}
      className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-surface-hover hover:text-white">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {claro ? <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>}
      </svg>
    </button>
  );
}

export function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const email = auth.currentUser?.email ?? "";
  const inicial = (auth.currentUser?.displayName || email || "U").charAt(0).toUpperCase();

  useEffect(() => {
    function fora(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    function esc(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center border-b border-surface-border bg-surface-dark/90 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-yellow font-black text-on-brand">$</span>
        <span className="text-lg font-bold text-white">Money <span className="text-brand-yellow">Assist</span></span>
      </div>

      <div className="ml-auto flex items-center gap-1">
      <BotaoTema />
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label="Menu do usuário"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow font-bold text-on-brand transition hover:brightness-110"
        >
          {inicial}
        </button>

        {isOpen && (
          <div role="menu" className="animate-pop absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-surface-border bg-surface-dark py-1 shadow-xl shadow-black/40">
            <div className="border-b border-surface-border px-4 py-3">
              <p className="text-xs text-zinc-400">Logado como</p>
              <p className="truncate text-sm font-medium text-white">{email || "Usuário"}</p>
            </div>
            <button role="menuitem" onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-surface-hover">
              Sair da conta
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
