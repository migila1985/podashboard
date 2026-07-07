import { useEffect, useMemo, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import PointSection from "./components/PointSection";
import { supabase } from "./lib/supabaseClient";

const sections = [
  {
    key: "functional_open",
    title: "Openstaande functionele punten (Defensie)"
  },
  {
    key: "functional_new",
    title: "Nieuwe functionele wensen (Defensie)"
  },
  {
    key: "general_wishes",
    title: "Algemene wensen (Defensie)"
  },
  {
    key: "market_interest",
    title: "Interessepunten van klanten"
  }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [points, setPoints] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setLoading(false);
    };
    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setPoints([]);
      setComments([]);
      return;
    }

    const load = async () => {
      const [{ data: pointsData, error: pointsError }, { data: commentsData, error: commentsError }] =
        await Promise.all([
          supabase.from("points").select("*").order("created_at", { ascending: false }),
          supabase.from("comments").select("*").order("created_at", { ascending: true })
        ]);

      if (pointsError) throw pointsError;
      if (commentsError) throw commentsError;

      setPoints(pointsData ?? []);
      setComments(commentsData ?? []);
    };

    load().catch(console.error);
  }, [session?.user?.id]);

  const commentsByPointId = useMemo(() => {
    return comments.reduce((acc, item) => {
      acc[item.point_id] = acc[item.point_id] ?? [];
      acc[item.point_id].push(item);
      return acc;
    }, {});
  }, [comments]);

  const createPoint = async (payload) => {
    const { data, error } = await supabase
      .from("points")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    setPoints((prev) => [data, ...prev]);
  };

  const createComment = async (pointId, content) => {
    const { data, error } = await supabase
      .from("comments")
      .insert({ point_id: pointId, content })
      .select("*")
      .single();

    if (error) throw error;
    setComments((prev) => [...prev, data]);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500 dark:text-slate-300">
        Laden...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Exquiray - Lopende Zaken Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{session.user.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDark((prev) => !prev)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:text-slate-100"
            type="button"
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          <button
            onClick={signOut}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
            type="button"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <PointSection
            key={section.key}
            title={section.title}
            category={section.key}
            points={points}
            commentsByPointId={commentsByPointId}
            onCreatePoint={createPoint}
            onCreateComment={createComment}
          />
        ))}
      </div>
    </main>
  );
}
