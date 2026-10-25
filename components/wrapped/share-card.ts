import type { WrappedData } from "@/lib/wrapped/types";

/** Story-sized (1080×1920) PNG of someone's Wrapped, drawn on a canvas — no extra libraries. */
export async function renderWrappedCard(data: WrappedData): Promise<Blob> {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't available in this browser.");

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#2a0845");
  bg.addColorStop(0.55, "#12021f");
  bg.addColorStop(1, "#3d0233");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  for (const [x, y, r, color] of [
    [880, 260, 420, "rgba(255,0,204,0.28)"],
    [140, 1500, 480, "rgba(174,0,255,0.25)"],
  ] as const) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, color);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const wrap = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) => {
    const words = text.split(/\s+/);
    let line = "";
    let lines = 0;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth && line) {
        ctx.fillText(line, x, y + lines * lineHeight);
        lines += 1;
        line = word;
        if (lines === maxLines - 1) break;
      } else line = next;
    }
    if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
    return y + (lines + 1) * lineHeight;
  };

  const pad = 96;
  ctx.fillStyle = "#ff7ae0";
  ctx.font = font(700, 40);
  ctx.fillText(`ANIVERSE WRAPPED ${data.year}`, pad, 190);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = font(500, 44);
  ctx.fillText(`${data.userName.split(" ")[0]} is`, pad, 320);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(800, 104);
  let y = wrap(data.persona.name, pad, 440, width - pad * 2, 116);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = font(500, 42);
  y = wrap(data.persona.tagline, pad, y + 10, width - pad * 2, 54, 2);

  // Stat tiles.
  const tiles = [
    { label: "Hours watched", value: String(Math.round(data.totals.watchMinutes / 60)) },
    { label: "Hours listened", value: String(Math.round(data.totals.listenMinutes / 60)) },
    { label: "Titles", value: String(data.totals.titles) },
    { label: data.topPercent ? "Of AniVerse" : "Active days", value: data.topPercent ? `Top ${data.topPercent}%` : String(data.totals.activeDays) },
  ];
  const tileTop = Math.max(y + 60, 880);
  const tileWidth = (width - pad * 2 - 40) / 2;
  tiles.forEach((tile, index) => {
    const x = pad + (index % 2) * (tileWidth + 40);
    const top = tileTop + Math.floor(index / 2) * 220;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.roundRect(x, top, tileWidth, 190, 36);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = font(800, 76);
    ctx.fillText(tile.value, x + 40, top + 105);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = font(500, 34);
    ctx.fillText(tile.label, x + 40, top + 155);
  });

  // Top titles + top artist.
  y = tileTop + 500;
  const column = (title: string, items: string[], x: number) => {
    ctx.fillStyle = "#ff7ae0";
    ctx.font = font(700, 34);
    ctx.fillText(title, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(600, 40);
    items.slice(0, 3).forEach((item, index) => {
      let text = `${index + 1}  ${item}`;
      while (ctx.measureText(text).width > tileWidth && text.length > 4) text = `${text.slice(0, -2)}…`;
      ctx.fillText(text, x, y + 70 + index * 62);
    });
  };
  column("TOP TITLES", data.topTitles.map((item) => item.title), pad);
  column(data.topArtists.length ? "TOP ARTISTS" : "TOP GENRES", data.topArtists.length ? data.topArtists.map((item) => item.title) : data.topGenres.map((item) => item.label), pad + tileWidth + 40);

  if (data.vibes.length) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = font(600, 40);
    ctx.fillText(data.vibes.map((vibe) => `${vibe.emoji} ${vibe.label}`).join("   "), pad, 1730);
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = font(500, 32);
  ctx.fillText("Made with AniVerse · your AI entertainment hub", pad, 1820);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't create the image."))), "image/png"));
}
