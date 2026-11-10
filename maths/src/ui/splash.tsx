import { CubeMark } from "./wordmark";

/** A calm one-colour screen with the logo, shown while a returning parent's account opens. */
export function Splash({ label = "Loading" }: { label?: string }) {
  return (
    <main class="boot-splash" role="status" aria-live="polite">
      <CubeMark />
      <span class="sr">{label}</span>
    </main>
  );
}
