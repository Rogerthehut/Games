import type { Stage } from "../engine/types";
import grove from "../assets/terrain/grove.webp";
import sandstone from "../assets/terrain/sandstone.webp";
import reef from "../assets/terrain/reef.webp";
import peak from "../assets/terrain/peak.webp";

const reliefLandmarks: Record<Stage, string> = { KS2: grove, KS3: sandstone, KS4: reef, KS5: peak };

export const WORLDS: Record<Stage, string> = {
  KS2: "Treetop Trail",
  KS3: "Sandstone Desert",
  KS4: "Open Ocean",
  KS5: "Cloudtop Mountains",
};

type Region = { stage: Stage; top: number };
type Stop = { x: number; y: number; stage: Stage };

export function TerrainMap({ width, height, wide, regions, stops }: {
  width: number;
  height: number;
  wide: boolean;
  regions: Region[];
  stops: Stop[];
}) {
  return (
    <svg class="journey-terrain" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="journey-clay-grain" width="47" height="43" patternUnits="userSpaceOnUse">
          <path d="M3 7l2-1m11 25 2-1m9-16 2-1m10 21 2-1m-1-27 1-1" fill="none" stroke="#352a32" stroke-width="1.1" stroke-linecap="round" opacity=".11" />
          <path d="M7 23h2m12-14 1-1m11 14 2-1m-12 18h2m16-21h1" fill="none" stroke="#fff5df" stroke-width="1.2" stroke-linecap="round" opacity=".26" />
        </pattern>
        <path id="journey-forest-contour" d="M-61 19Q-35-51 10-49t41 63Q24 52-20 55t-41-36Zm12 1Q-30-40 9-38t32 49Q16 40-18 44t-31-24Z" />
        <g id="journey-tree">
          <path fill="var(--relief)" d="M-24 6q-10-12 0-22 8-10 17-8 9-7 20-1 11 1 14 12 9 10 3 20-7 10-20 8-14 7-24-2-7 0-10-7Z" transform="translate(2 5)" />
          <path fill="var(--form)" d="M-24 6q-10-12 0-22 8-10 17-8 9-7 20-1 11 1 14 12 9 10 3 20-7 10-20 8-14 7-24-2-7 0-10-7Z" />
          <path d="M-19-3q-2-12 12-15 8-6 15 1 10-4 17 8-3 7-10 8-8 5-15-1-11 5-19-1Z" fill="var(--ground)" opacity=".47" />
          <path fill="none" stroke="var(--carve)" stroke-width="1.3" stroke-linecap="round" opacity=".75" d="M-20-9q7-8 16-5m-18 12q4-5 10-6M5-16q10-1 14 7M1 8q8 4 15-1" />
        </g>
        <g id="journey-dunes">
          <path fill="var(--form)" d="M-60 42C-19 36-30-24 28-37 51-44 75-29 83-9 50-19 35 8 25 28 14 50-31 61-60 42Z" />
          <path fill="none" stroke="var(--carve)" stroke-width="1.3" stroke-linecap="round" opacity=".75" d="M-62 31C-25 33-31-19 19-36M-55 42c52 2 40-65 96-69 14-1 26 4 37 14M-32 48c39-5 38-53 69-60 12-4 23-2 31 0M-13 48C22 34 14 7 47-2" />
          <path fill="var(--relief)" d="M-25 65q9-13 21-6 5 7-3 10-9 3-18-4Zm48-10q5-6 12-4 3 3 0 7-8 4-12-3Z" />
        </g>
        <g id="journey-island">
          <path fill="none" stroke="var(--carve)" stroke-width="1.3" stroke-linecap="round" opacity=".75" d="M-71-9c-8-39 44-59 68-51 32-9 64 10 73 31C94 10 44 57 10 54-34 67-76 37-71-9Z" />
          <path fill="var(--form)" d="M-61-6c-8-35 38-51 60-43 25-8 54 7 63 27 19 32-21 70-53 65-40 12-72-13-70-49Z" />
          <path fill="var(--relief)" d="M-51-7c-3-23 28-39 51-31 19-8 45 8 52 23 13 23-20 54-44 48-32 10-59-9-59-40Z" />
        </g>
        <g id="journey-waves" fill="none" stroke="var(--carve)" stroke-width="1.3" stroke-linecap="round" opacity=".75">
          <path d="M-48-22q13-8 26 0t26 0 26 0m-60 15q11-7 23 0t23 0 23 0M-53 25q12-7 24 0t24 0m16 16q11-7 23 0t23 0" />
        </g>
        <g id="journey-ridge">
          <path fill="var(--form)" d="M-66 46-42 1-20-14 3-53l23 18 12 26 34 29 14 35-41-9-26 16-23-9-23 9z" />
          <path fill="var(--relief)" d="m3-53 23 18 12 26 34 29 14 35-41-9-26 16-8-29 9-27L3-11z" />
          <path fill="light-dark(#f8f2e7, #bcb5ca)" d="M3-53 26-35 35-16 18-25l-10 6-8-12-14 6z" />
          <path fill="none" stroke="var(--carve)" stroke-width="1.3" stroke-linecap="round" opacity=".75" d="M-56 39-31 9l14-7L-2-24m-38 69 28-19 9-30m33-12 8 22 22 22m-39-7 12 19 25 3m-61-19-3 16-17 13" />
        </g>
        <g id="journey-fern" fill="none" stroke="light-dark(#4d7857, #9ab587)" stroke-width="1.6" stroke-linecap="round">
          <path d="M0 10Q0-2 4-12M0 5q-7-1-10-6M1 1q7-1 11-7M2-3q-6-2-7-6M3-6q4-1 6-5" />
        </g>
        <g id="journey-footbridge">
          <path d="M-78-16C-39-49-5-7 23-19q19-9 42-8l4 13Q47-14 29-7C-10 7-37-31-78 0Z" fill="light-dark(#8fb7ac, #4c7475)" />
          <path d="M-74-7Q-51-25-30-19M20-12q17-9 42-9" stroke="#e0e9cc" opacity=".7" stroke-width="1.4" fill="none" stroke-linecap="round" />
          <g transform="translate(-5 -20) rotate(19)">
            <rect x="-13" y="-15" width="25" height="32" rx="3" fill="#795d43" />
            <path d="M-10-11h19m-19 6H9m-19 6H9m-19 6H9m-19 6H9" stroke="#caa276" stroke-width="3" stroke-linecap="round" />
            <path d="M-13-15v32m25-32v32" stroke="#594b40" stroke-width="2" />
          </g>
        </g>
        <g id="journey-oasis">
          <path d="M-37 7c4-19 22-27 39-21 17-5 36 4 37 16 1 14-16 21-35 19C-11 26-32 22-37 7Z" fill="light-dark(#e8c083, #a17b55)" />
          <path d="M-31 6C-27-7-13-14 2-9c13-4 30 1 31 12 0 10-14 15-29 13-14 5-31 1-35-10Z" fill="light-dark(#75a6a0, #548480)" />
          <path d="M-19 6q9-5 20-1m-6 6q10-4 21-1" stroke="#d3e7ca" fill="none" stroke-width="1.4" stroke-linecap="round" />
          <path d="M23 8q-3-16 4-25m-44 14q-2-10-7-14" stroke="#795f49" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M27-16q-13-9-20-2 9-2 19 4-7 2-7 9 8-8 11-8 4 3 9 8-1-8-7-11 6-2 13 0-4-8-17-3Zm-51 0q-7-9-13-5 7 1 11 8-7-1-9 4 7-3 11-2 4 3 6 6 2-6-4-10 5 0 8-4-6-3-10 3Z" fill="light-dark(#638462, #a2b08a)" />
        </g>
        <g id="journey-lighthouse">
          <ellipse cy="10" rx="25" ry="13" fill="var(--form)" />
          <path d="m-8 13 3-28H6l3 28Z" fill="#f6e6c5" />
          <path d="M-7 4H8l-1-7H-6Z" fill="#b7696c" />
          <rect x="-7" y="-20" width="14" height="7" rx="1" fill="#f4cb74" stroke="#685b6a" stroke-width="1.5" />
          <path d="m-10-20 10-8 10 8Z" fill="#b7696c" />
          <path d="M-35 9q7-3 13-1m45 6q8-3 14-2" stroke="#e7efdc" stroke-width="1.5" fill="none" stroke-linecap="round" />
        </g>
        <g id="journey-sail">
          <path d="m-15 8 31-2-5 7-20 1Z" fill="#a96561" />
          <path d="M0-17 12 3H0Zm-2 4-10 17h10Z" fill="#fff2cf" />
          <path d="M0-17v24m-22 9q8-3 15 0m20 1q8-4 14-1" stroke="#617f90" stroke-width="1.3" fill="none" stroke-linecap="round" />
        </g>
        <g id="journey-pines">
          <path d="M-25 10-15-13-6 11Zm15 3L1-18l12 31Zm16 3L17-9l9 25Z" fill="light-dark(#6d8277, #8daca2)" />
          <path d="m-18-6 3-7 3 8-4-2zm15-2 4-10 4 11-4-2zm17 6 3-7 3 8-3-2z" fill="#f2ece4" />
        </g>
        <g id="journey-tarn">
          <path d="M-36 2c12-13 22-7 32-13 14-7 35-5 41 7 6 10-5 21-22 20C-4 15-23 23-34 13q-6-6-2-11Z" fill="light-dark(#90b4be, #5b7d91)" />
          <path d="M-25 7q9 4 22-1m9-7q9-4 17-1m-14 11 13-2" fill="none" stroke="#dbe3e5" stroke-width="1.4" stroke-linecap="round" />
        </g>
      </defs>
      <rect class="clubhouse-lawn" width={width} height="170" />
      <rect width={width} height="170" fill="url(#journey-clay-grain)" />
      <g class="terrain-ks2">
        <path fill="none" stroke="var(--carve)" stroke-width="1.3" stroke-linecap="round" opacity=".75" d="M-10 30Q40 0 96 24t33 59Q96 118 0 110M-10 42Q43 9 94 35t23 46Q83 108 0 99M-5 54Q50 22 89 46t16 30Q70 96 0 87" />
        <use href="#journey-tree" transform="translate(43 66) scale(.66)" />
        <use href="#journey-tree" transform="translate(76 87) scale(.4)" />
        <g transform={`translate(${width - 360} 0)`}>
          <path fill="none" stroke="var(--carve)" stroke-width="1.3" stroke-linecap="round" opacity=".75" d="M270 0q-36 27 5 57t92 24m-73-81q-39 27-4 49t76 20m-45-69q-41 22-17 40t63 14" />
          <use href="#journey-tree" transform="translate(311 32) scale(.6)" />
        </g>
        {wide && <>
          <use href="#journey-footbridge" transform={`translate(${width * .25} 85) rotate(-12) scale(.85)`} />
          <use href="#journey-tree" transform={`translate(${width * .71} 57) scale(.9)`} />
          <use href="#journey-fern" transform={`translate(${width * .75} 62)`} />
        </>}
      </g>
      {regions.map(({ stage, top }, index) => {
        const end = regions[index + 1]?.top ?? height;
        const scale = width / 360;
        const seam = `M0 ${top + 6} Q${56 * scale} ${top - 24} ${126 * scale} ${top + 4} T${253 * scale} ${top + 6} T${width} ${top}`;
        const ground = `${seam} V${end + 32} H0Z`;
        return <g key={stage} class={`terrain-${stage.toLowerCase()}`}>
          <path class="terrain-fill" d={ground} />
          <path d={ground} fill="url(#journey-clay-grain)" />
          <path class="terrain-seam" d={seam} />
          <path class="terrain-seam-light" d={seam} />
          {stage === "KS4" && stops.filter(stop => stop.stage === stage).map(({ x, y }) =>
            <use key={`${x}-${y}`} href="#journey-island" transform={`translate(${x} ${y + 9}) rotate(${y % 25 - 12})`} />
          )}
          {Array.from({ length: Math.max(0, Math.floor((end - top - 35) / 140)) }, (_, row) => {
            const y = top + 83 + row * 140;
            const x = row % 2 === 0 ? 42 : width - 42;
            const other = width - x;
            const landmark = row % 5 === 0;
            return <g key={y}>
              {stage === "KS2" && <>
                <g transform={`translate(${x} ${y}) rotate(${row % 2 ? 9 : -12})`}>
                  <path fill="var(--form)" opacity=".45" d="M-70 28Q-47-60 10-59t52 76Q28 65-20 66t-50-38Z" />
                  <use href="#journey-forest-contour" class="terrain-contour-light" />
                  <use href="#journey-forest-contour" class="terrain-contour" />
                  {!landmark && <>
                    <use href="#journey-tree" transform="translate(-3 -13) scale(.86)" />
                    <use href="#journey-tree" transform="translate(22 22) scale(.56)" />
                  </>}
                </g>
                {row % 4 === 0
                  ? <use href="#journey-footbridge" transform={`translate(${other} ${y + 58}) rotate(-13) scale(.83)`} />
                  : <use href="#journey-tree" transform={`translate(${other} ${y + 30}) scale(.54)`} />}
                <use href="#journey-fern" transform={`translate(${other - 16} ${y + 13}) rotate(${row * 19 % 45 - 20})`} />
                <use href="#journey-fern" transform={`translate(${x + 18} ${y + 63}) scale(.6)`} />
              </>}
              {stage === "KS3" && <>
                <use href="#journey-dunes" transform={`translate(${x} ${y}) scale(${row % 2 ? -1 : 1} 1)`} />
                <use href={row % 4 === 0 ? "#journey-oasis" : "#journey-dunes"} transform={`translate(${other} ${y + 43}) rotate(${row % 2 ? 18 : -12}) scale(${row % 4 === 0 ? .9 : .53})`} />
                <path d="m-10 1 5-3m6 6 4-2m5-8 3-1" transform={`translate(${other - 14} ${y + 70})`} fill="none" stroke="var(--carve)" stroke-width="1.8" stroke-linecap="round" opacity=".65" />
              </>}
              {stage === "KS4" && <>
                <use href="#journey-waves" transform={`translate(${x} ${y})`} />
                <use href="#journey-waves" transform={`translate(${other} ${y + 38}) scale(.72)`} />
                {row === 0
                  ? <use href="#journey-lighthouse" transform={`translate(${other} ${y + 34})`} />
                  : !landmark && <g transform={`translate(${x} ${y + 19}) rotate(${row % 2 ? 14 : -12})`}>
                    <use href="#journey-sail" class="terrain-sail" />
                  </g>}
              </>}
              {stage === "KS5" && <>
                <use href="#journey-ridge" transform={`translate(${x} ${y}) rotate(${row % 2 ? -23 : 17})`} />
                <use href={row % 3 === 0 ? "#journey-tarn" : "#journey-ridge"} transform={`translate(${other} ${y + 38}) rotate(-10) scale(${row % 3 === 0 ? .9 : .55})`} />
                <use href="#journey-pines" transform={`translate(${x + (row % 2 ? -14 : 14)} ${y + 65}) scale(.82)`} />
              </>}
              {landmark && <image class="terrain-landmark" href={reliefLandmarks[stage]}
                x={row % 2 === 0 ? 11 : width - 103} y={y - 13} width="92" height="80" />}
            </g>;
          })}
        </g>;
      })}
    </svg>
  );
}

export function Clubhouse() {
  return <svg viewBox="0 0 102 65" aria-hidden="true" focusable="false">
    <path d="M9 52 13 18 80 10 94 24 94 55 29 64Z" fill="#536746" opacity=".23" />
    <path d="m23 44 2-23 55-5 6 27-5 12-52 5z" fill="#9d674f" />
    <path d="m43 39 16-2 2 16-17 2z" fill="#5b3c4d" />
    <path d="m31 41 8-1 1 7-9 1zm33-3 9-1 1 7-9 1z" fill="#ffe7a0" />
    <path d="m16 33 5-19L72 7l15 15-10 16-51 7Z" fill="#a4516e" stroke="#793d55" stroke-width="2" stroke-linejoin="round" />
    <path d="m16 33 57-10L72 7m1 16 14-1M28 18l34-5m-36 10 21-3m-21 15 31-5" fill="none" stroke="#d8879c" stroke-width="2" stroke-linecap="round" />
    <path d="M70 14V2" stroke="#5b3c4d" stroke-width="2" />
    <path d="M71 2q8-4 17 1v8q-9-5-17 0z" fill="#e889ad" />
  </svg>;
}
