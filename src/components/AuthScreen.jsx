import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const action = isLogin
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { error } = await action;

    if (error) {
      setMessage(error.message);
    } else if (!isLogin) {
      setMessage("Account aangemaakt. Controleer je inbox voor verificatie.");
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center p-6">
      <div className="w-full rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Exquiray PO Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isLogin ? "Log in op je account" : "Maak een nieuw account aan"}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:text-slate-100"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:text-slate-100"
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <button
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500 disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? "Bezig..." : isLogin ? "Inloggen" : "Registreren"}
          </button>
        </form>

        {message && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p>
        )}

        <button
          onClick={() => setIsLogin((prev) => !prev)}
          className="mt-4 text-sm text-brand-600 hover:underline"
          type="button"
        >
          {isLogin ? "Nog geen account? Registreren" : "Al een account? Inloggen"}
        </button>
      </div>
    </div>
  );
}
