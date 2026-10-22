import { useEffect, useState } from "react";

const parse = () => (window.location.hash.replace(/^#\/?/, "") || "dashboard").split("?")[0];

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const navigate = (r) => { window.location.hash = `/${r}`; };
