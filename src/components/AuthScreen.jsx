import { useState } from "react";
import { useStore } from "../store";
import { Button, inputCls } from "./ui";
import { isDemo } from "../lib/supabaseClient";

export default function AuthScreen() {
  const { signIn, signUp } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (isLogin) await signIn(email, password);
      else {
        const r = await signUp(email, password);
        if (!r.session && !isDemo) setMessage("Account aangemaakt. Controleer je inbox voor verificatie.");
      }
    } catch (err) {
      setMessage(err.message);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center p-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="w-full rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
        <img src="/icons/icon.svg" alt="" className="mb-3 h-12 w-12 rounded-xl" />
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Mijn Uitgaven</h1>
        <p className="mt-1 text-sm text-slate-500">{isLogin ? "Log in op je account" : "Maak een nieuw account aan"}</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input className={inputCls} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="E-mailadres" aria-label="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputCls} type="password" autoComplete={isLogin ? "current-password" : "new-password"} placeholder="Wachtwoord" aria-label="Wachtwoord" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Bezig..." : isLogin ? "Inloggen" : "Registreren"}</Button>
        </form>
        {message && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p>}
        <button onClick={() => setIsLogin((p) => !p)} className="mt-4 min-h-[44px] text-sm text-brand-600" type="button">
          {isLogin ? "Nog geen account? Registreren" : "Al een account? Inloggen"}
        </button>
      </div>
    </div>
  );
}
