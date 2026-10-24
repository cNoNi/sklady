export type ImagePlayer = { name: string; mmr?: number; role?: string };
export type ImageTeam = { title: string; total?: number; players: ImagePlayer[] };

const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
const SCALE = 2; // ostrzejszy obraz na ekranach HiDPI i po wklejeniu w Discordzie
const PAD = 16;
const GAP = 12;
const BOX_W = 320;
const HEAD_H = 40;
const ROW_H = 32;

/**
 * Rysuje obie drużyny na canvasie w kolorach bieżącego motywu (jasny/ciemny) i zwraca PNG.
 * Rysowanie ręczne zamiast zrzutu DOM – bez dodatkowych zależności i zawsze ten sam wygląd.
 */
export function renderTeamsPng(teams: [ImageTeam, ImageTeam], roleLabel: (role: string) => string): Promise<Blob> {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  const colors = [
    { line: v("--a"), fill: v("--a-bg") },
    { line: v("--b"), fill: v("--b-bg") },
  ];

  const rows = Math.max(...teams.map((t) => t.players.length));
  const boxH = HEAD_H + rows * ROW_H + 10;
  const width = PAD * 2 + BOX_W * 2 + GAP;
  const height = PAD * 2 + boxH;

  const canvas = document.createElement("canvas");
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Brak obsługi canvas."));
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = v("--bg");
  ctx.fillRect(0, 0, width, height);

  const hasRoles = teams.some((t) => t.players.some((p) => p.role));
  teams.forEach((team, i) => {
    const x = PAD + i * (BOX_W + GAP);
    const y = PAD;

    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, BOX_W - 2, boxH - 2, 10);
    ctx.fillStyle = colors[i].fill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = colors[i].line;
    ctx.stroke();

    const left = x + 14;
    const right = x + BOX_W - 14;
    ctx.textBaseline = "middle";
    ctx.fillStyle = v("--ink");
    ctx.font = `700 16px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(team.title, left, y + 24);
    if (team.total !== undefined) {
      ctx.textAlign = "right";
      ctx.fillText(String(team.total), right, y + 24);
    }

    team.players.forEach((p, j) => {
      const top = y + HEAD_H + j * ROW_H;
      const mid = top + ROW_H / 2;
      if (j > 0) {
        ctx.fillStyle = "rgba(128,128,128,.25)";
        ctx.fillRect(left, top, right - left, 1);
      }
      let nameX = left;
      if (hasRoles) {
        ctx.textAlign = "left";
        ctx.fillStyle = v("--mute");
        ctx.font = `600 12px ${FONT}`;
        if (p.role) ctx.fillText(roleLabel(p.role).toUpperCase(), left, mid);
        nameX = left + 74;
      }
      ctx.textAlign = "left";
      ctx.fillStyle = v("--ink");
      ctx.font = `400 16px ${FONT}`;
      ctx.fillText(p.name, nameX, mid);
      if (p.mmr !== undefined) {
        ctx.textAlign = "right";
        ctx.font = `600 16px ${FONT}`;
        ctx.fillText(String(p.mmr), right, mid);
      }
    });
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Nie udało się utworzyć obrazu."))), "image/png")
  );
}

/**
 * Kopiuje PNG do schowka. Schowek na obrazy działa tylko w bezpiecznym kontekście (HTTPS lub localhost),
 * więc w innym wypadku obraz jest pobierany jako plik. Zwraca, co się udało.
 */
export async function copyOrDownloadPng(make: () => Promise<Blob>, fileName: string): Promise<"copied" | "downloaded"> {
  if (window.isSecureContext && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      // Promise w ClipboardItem zamiast gotowego Bloba – Safari wymaga, by zapis zaczął się od razu po kliknięciu
      await navigator.clipboard.write([new ClipboardItem({ "image/png": make() })]);
      return "copied";
    } catch {
      // brak uprawnień do schowka – spróbuj pobrać plik
    }
  }
  const url = URL.createObjectURL(await make());
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
