import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const dynamicParams = false;

// The app icon: the i of internradar in the masthead font, its dot sending out a signal.
// "any" icons have round corners of their own; maskable ones fill the square and keep the i in the middle 60%,
// because Android cuts them to a circle or a drop; the Apple one fills the square because iOS rounds it.
const files: Record<string, { size: number; shape: "any" | "full"; scale: number }> = {
  "icon-32.png": { size: 32, shape: "any", scale: 1 },
  "icon-192.png": { size: 192, shape: "any", scale: 1 },
  "icon-512.png": { size: 512, shape: "any", scale: 1 },
  "maskable-512.png": { size: 512, shape: "full", scale: 0.78 },
  "apple-touch-icon.png": { size: 180, shape: "full", scale: 0.92 },
};

export function generateStaticParams() {
  return Object.keys(files).map((file) => ({ file }));
}

const bold = readFileSync(join(process.cwd(), "assets/fonts", "libre-baskerville-700.woff"));
const paper = "#fff1e5";
const claret = "#990f3d";

/** Where the dot of the i sits on the 96 grid, and the arcs around it (angle ±35 degrees). */
const DOT_X = 48.3;
const DOT_Y = 29;
const arc = (r: number, side: 1 | -1) => {
  const dx = r * Math.cos((35 * Math.PI) / 180) * side;
  const dy = r * Math.sin((35 * Math.PI) / 180);
  return `M${DOT_X + dx} ${DOT_Y - dy} A${r} ${r} 0 0 ${side === 1 ? 1 : 0} ${DOT_X + dx} ${DOT_Y + dy}`;
};
const arcs = [arc(10.5, 1), arc(17, 1), arc(10.5, -1), arc(17, -1)];

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const { size, shape, scale } = files[file];
  const u = (size / 96) * scale; // one unit of the 96 grid the icon is drawn on
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: claret,
          borderRadius: shape === "any" ? size * 0.22 : 0,
        }}
      >
        <div style={{ width: 96 * u, height: 96 * u, display: "flex", position: "relative" }}>
          {/* the i: font size 64 on the grid puts the dot 0.096 em below the top of the line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: (DOT_Y - 0.096 * 64) * u,
              width: 96 * u,
              height: 64 * u,
              display: "flex",
              justifyContent: "center",
              fontFamily: "Libre Baskerville",
              fontWeight: 700,
              fontSize: 64 * u,
              lineHeight: 1,
              color: paper,
            }}
          >
            i
          </div>
          {/* the signal from the dot, two arcs on each side */}
          <svg width={96 * u} height={96 * u} viewBox="0 0 96 96" style={{ position: "absolute", left: 0, top: 0 }}>
            {arcs.map((d) => (
              <path key={d} d={d} stroke={paper} strokeWidth={3.4} strokeLinecap="round" fill="none" />
            ))}
          </svg>
        </div>
      </div>
    ),
    { width: size, height: size, fonts: [{ name: "Libre Baskerville", data: bold, weight: 700 }] },
  );
}
