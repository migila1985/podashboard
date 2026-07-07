import { useMemo, useState } from "react";

function formatDate(value) {
  return new Date(value).toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export default function PointSection({
  title,
  category,
  points,
  commentsByPointId,
  onCreatePoint,
  onCreateComment
}) {
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [interestedCustomersValue, setInterestedCustomersValue] = useState("");
  const [commentDraftByPointId, setCommentDraftByPointId] = useState({});

  const sectionPoints = useMemo(
    () => points.filter((point) => point.category === category),
    [points, category]
  );

  const submitPoint = async (event) => {
    event.preventDefault();
    if (!titleValue.trim()) return;

    await onCreatePoint({
      category,
      title: titleValue.trim(),
      description: descriptionValue.trim(),
      interested_customers:
        category === "market_interest" ? interestedCustomersValue.trim() : null
    });

    setTitleValue("");
    setDescriptionValue("");
    setInterestedCustomersValue("");
  };

  const submitComment = async (event, pointId) => {
    event.preventDefault();
    const value = commentDraftByPointId[pointId] ?? "";
    if (!value.trim()) return;

    await onCreateComment(pointId, value.trim());
    setCommentDraftByPointId((prev) => ({ ...prev, [pointId]: "" }));
  };

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <form className="mt-4 grid gap-3" onSubmit={submitPoint}>
        <input
          className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:text-slate-100"
          placeholder="Titel"
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          required
        />
        <textarea
          className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:text-slate-100"
          placeholder="Omschrijving"
          rows={3}
          value={descriptionValue}
          onChange={(e) => setDescriptionValue(e.target.value)}
        />
        {category === "market_interest" && (
          <input
            className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:text-slate-100"
            placeholder="Geinteresseerde klanten (gescheiden met komma)"
            value={interestedCustomersValue}
            onChange={(e) => setInterestedCustomersValue(e.target.value)}
          />
        )}
        <button
          type="submit"
          className="w-fit rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500"
        >
          Punt toevoegen
        </button>
      </form>

      <div className="mt-5 space-y-4">
        {sectionPoints.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nog geen punten in deze lijst.</p>
        ) : (
          sectionPoints.map((point) => (
            <article
              key={point.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            >
              <h3 className="font-medium text-slate-900 dark:text-slate-100">{point.title}</h3>
              {point.description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{point.description}</p>
              )}
              {point.interested_customers && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Geinteresseerden: {point.interested_customers}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-400">{formatDate(point.created_at)}</p>

              <div className="mt-3 space-y-2">
                {(commentsByPointId[point.id] ?? []).map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800"
                  >
                    <p className="text-slate-700 dark:text-slate-200">{comment.content}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(comment.created_at)}</p>
                  </div>
                ))}
              </div>

              <form className="mt-3 flex gap-2" onSubmit={(e) => submitComment(e, point.id)}>
                <input
                  className="flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:text-slate-100"
                  placeholder="Voeg opmerking toe"
                  value={commentDraftByPointId[point.id] ?? ""}
                  onChange={(e) =>
                    setCommentDraftByPointId((prev) => ({ ...prev, [point.id]: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  Opslaan
                </button>
              </form>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
