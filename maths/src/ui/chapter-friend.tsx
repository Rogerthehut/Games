import { useEffect, useRef, useState } from "preact/hooks";
import type { Stage } from "../engine/types";
import squirrel from "../assets/guides/squirrel.webp";
import fennec from "../assets/guides/fennec.webp";
import seal from "../assets/guides/seal.webp";
import goat from "../assets/guides/goat.webp";

const guides: Record<Stage, string> = { KS2: squirrel, KS3: fennec, KS4: seal, KS5: goat };

export function ChapterFriend({ stage, pose }: { stage: Stage; pose?: "wave" | "clap" }) {
  const figure = useRef<HTMLSpanElement>(null);
  const [waving, setWaving] = useState(false);

  useEffect(() => {
    const node = figure.current;
    if (pose !== "wave" || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setWaving(true);
      observer.disconnect();
    }, { threshold: .6 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [pose]);

  return (
    <span ref={figure} class={`chapter-friend ${pose === "clap" ? "friend-clap" : pose === "wave" && waving ? "friend-wave" : ""}`} aria-hidden="true">
      <img src={guides[stage]} alt="" width="58" height="56" loading={pose === "clap" ? "eager" : "lazy"} decoding="async" />
    </span>
  );
}
