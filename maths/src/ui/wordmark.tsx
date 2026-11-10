import cube from "../../public/icon.svg?raw";

export const cubeUrl = `data:image/svg+xml,${encodeURIComponent(cube)}`;

export function CubeMark() {
  return <img class="cube-mark" src={cubeUrl} alt="" aria-hidden="true" />;
}

export function Wordmark() {
  return (
    <span class="wordmark" role="img" aria-label="quarter">
      <span aria-hidden="true">qua<svg class="wordmark-slash" viewBox="0 0 14 20" focusable="false">
        <path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z" />
      </svg>ter</span>
      <sup class="wordmark-tm" aria-hidden="true">™</sup>
    </span>
  );
}
