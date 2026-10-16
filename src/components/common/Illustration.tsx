import { memo, type ReactNode } from 'react';
import type { Motif } from '@/models';

/**
 * Bundled vector artwork used as the image fallback for every service and
 * category. It never breaks (no network), works offline and in both themes.
 * Replace with real photography by setting `media[].url` in the catalogue.
 */

const palettes: Record<Motif, [string, string, string]> = {
  magic: ['#3b1f5c', '#6b3fa0', '#f2b544'],
  clown: ['#ff6b5b', '#ffb36b', '#ffffff'],
  mascot: ['#1f8f6a', '#7dd3a8', '#fff3c4'],
  kids: ['#ff8fab', '#ffc6d9', '#f2b544'],
  interactive: ['#2b59c3', '#7aa2ff', '#f2b544'],
  bubbles: ['#2bb3c0', '#a7e8ef', '#ffffff'],
  illusion: ['#1f0f33', '#5a2a82', '#f2b544'],
  games: ['#e9a826', '#ffd27a', '#3b1f5c'],
  host: ['#24172f', '#55407a', '#f2b544'],
  variety: ['#0f5c4a', '#2bb37f', '#f2b544'],
  science: ['#3a4cc4', '#8fd0ff', '#b4f0a8'],
  puppets: ['#a3324b', '#ef7a8c', '#f2b544'],
};

function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Confetti({ seed, accent }: { seed: number; accent: string }) {
  const rnd = seeded(seed);
  const colors = [accent, '#ffffff', '#ff6b5b', '#7dd3a8', '#ffd27a'];
  return (
    <g opacity="0.85">
      {Array.from({ length: 26 }, (_, i) => {
        const x = rnd() * 400;
        const y = rnd() * 300;
        const c = colors[i % colors.length];
        const r = rnd() * 360;
        return i % 3 === 0 ? (
          <circle key={i} cx={x} cy={y} r={2 + rnd() * 3} fill={c} opacity={0.5 + rnd() * 0.4} />
        ) : (
          <rect key={i} x={x} y={y} width={4 + rnd() * 6} height={2.5 + rnd() * 3} rx="1" fill={c} opacity={0.45 + rnd() * 0.4} transform={`rotate(${r} ${x} ${y})`} />
        );
      })}
    </g>
  );
}

const Sparkle = ({ x, y, s = 1, fill = '#fff' }: { x: number; y: number; s?: number; fill?: string }) => (
  <path
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z"
    fill={fill}
  />
);

const motifs: Record<Motif, (accent: string) => ReactNode> = {
  magic: (accent) => (
    <g>
      <ellipse cx="200" cy="232" rx="92" ry="16" fill="#000" opacity="0.18" />
      <ellipse cx="200" cy="214" rx="88" ry="18" fill="#1a1024" />
      <path d="M140 214 L150 110 H250 L260 214 Z" fill="#1a1024" />
      <rect x="148" y="176" width="104" height="18" fill="#c0392b" />
      <ellipse cx="200" cy="110" rx="50" ry="10" fill="#2d1648" />
      <g transform="rotate(-28 270 120)">
        <rect x="236" y="114" width="96" height="10" rx="5" fill="#1a1024" />
        <rect x="318" y="114" width="14" height="10" rx="3" fill="#fff" />
      </g>
      <Sparkle x={300} y={70} s={1.6} fill={accent} />
      <Sparkle x={330} y={110} s={0.9} />
      <Sparkle x={110} y={90} s={1.1} fill={accent} />
      <Sparkle x={140} y={60} s={0.7} />
      <circle cx="200" cy="80" r="4" fill="#fff" />
    </g>
  ),
  clown: (accent) => (
    <g>
      <circle cx="140" cy="140" r="30" fill="#ff4d8d" />
      <circle cx="260" cy="140" r="30" fill="#4dabff" />
      <circle cx="200" cy="160" r="70" fill="#fff4ea" />
      <path d="M150 100 L200 30 L250 100 Z" fill="#7c52b0" />
      <circle cx="200" cy="30" r="10" fill={accent} />
      <circle cx="175" cy="146" r="8" fill="#24172f" />
      <circle cx="225" cy="146" r="8" fill="#24172f" />
      <circle cx="200" cy="172" r="15" fill="#e0503f" />
      <path d="M165 192 Q200 226 235 192" stroke="#e0503f" strokeWidth="8" fill="none" strokeLinecap="round" />
      <circle cx="162" cy="182" r="8" fill="#ff9aa2" opacity="0.7" />
      <circle cx="238" cy="182" r="8" fill="#ff9aa2" opacity="0.7" />
      <path d="M170 228 L200 214 L230 228 L200 242 Z" fill="#f2b544" />
    </g>
  ),
  mascot: (accent) => (
    <g>
      <circle cx="148" cy="96" r="26" fill="#8a5a3c" />
      <circle cx="252" cy="96" r="26" fill="#8a5a3c" />
      <circle cx="148" cy="96" r="13" fill="#d9a77c" />
      <circle cx="252" cy="96" r="13" fill="#d9a77c" />
      <circle cx="200" cy="150" r="72" fill="#8a5a3c" />
      <ellipse cx="200" cy="176" rx="38" ry="30" fill="#d9a77c" />
      <circle cx="174" cy="138" r="9" fill="#24172f" />
      <circle cx="226" cy="138" r="9" fill="#24172f" />
      <circle cx="177" cy="135" r="3" fill="#fff" />
      <circle cx="229" cy="135" r="3" fill="#fff" />
      <ellipse cx="200" cy="164" rx="11" ry="8" fill="#24172f" />
      <path d="M186 184 Q200 196 214 184" stroke="#24172f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M176 222 L200 236 L224 222 L224 246 L200 234 L176 246 Z" fill={accent === '#fff3c4' ? '#ff6b5b' : accent} />
    </g>
  ),
  kids: (accent) => (
    <g>
      {[
        [150, 100, '#ff6b5b'],
        [200, 78, accent],
        [250, 104, '#7c52b0'],
        [176, 128, '#2bb3c0'],
        [228, 130, '#7dd3a8'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M${x} ${Number(y) + 38} Q${Number(x) + (i % 2 ? 8 : -8)} ${Number(y) + 90} 200 ${215}`} stroke="#fff" strokeWidth="2" fill="none" opacity="0.8" />
          <ellipse cx={x} cy={y} rx="28" ry="34" fill={String(c)} />
          <ellipse cx={Number(x) - 9} cy={Number(y) - 12} rx="6" ry="10" fill="#fff" opacity="0.45" />
        </g>
      ))}
      <rect x="168" y="208" width="64" height="44" rx="6" fill="#fff" />
      <rect x="194" y="208" width="12" height="44" fill="#ff6b5b" />
      <rect x="164" y="200" width="72" height="14" rx="4" fill="#ffe6e2" />
    </g>
  ),
  interactive: (accent) => (
    <g>
      <path d="M140 230 L200 90 L260 230 Z" fill={accent} opacity="0.25" />
      <path d="M118 238 L178 182 L196 200 L136 256 Z" fill="#ff6b5b" />
      <path d="M118 238 L136 256 L110 262 Z" fill="#c0392b" />
      {[
        ['M190 170 Q230 110 290 120', '#fff'],
        ['M196 186 Q260 170 300 200', accent],
        ['M180 160 Q190 100 230 70', '#7dd3a8'],
      ].map(([d, c], i) => (
        <path key={i} d={d} stroke={c} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray="2 14" />
      ))}
      <Sparkle x={300} y={110} s={1.4} />
      <Sparkle x={240} y={60} s={1} fill={accent} />
      <circle cx="310" cy="200" r="8" fill="#ff6b5b" />
      <circle cx="270" cy="90" r="6" fill="#fff" />
    </g>
  ),
  bubbles: () => (
    <g>
      {[
        [200, 150, 74],
        [112, 110, 38],
        [300, 96, 46],
        [290, 214, 30],
        [116, 214, 26],
        [250, 50, 18],
        [150, 52, 14],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="#ffffff" opacity="0.18" />
          <circle cx={x} cy={y} r={r} fill="none" stroke="#fff" strokeWidth="3" opacity="0.9" />
          <path d={`M${x - r * 0.55} ${y - r * 0.2} A${r * 0.6} ${r * 0.6} 0 0 1 ${x - r * 0.1} ${y - r * 0.62}`} stroke="#fff" strokeWidth={Math.max(3, r / 9)} fill="none" strokeLinecap="round" />
          <circle cx={x + r * 0.45} cy={y + r * 0.35} r={r * 0.08} fill="#ffd1f0" opacity="0.9" />
        </g>
      ))}
    </g>
  ),
  illusion: (accent) => (
    <g>
      <path d="M200 40 L120 260 H280 Z" fill={accent} opacity="0.18" />
      <path d="M0 0 H120 Q100 150 60 300 H0 Z" fill="#9b1c3a" />
      <path d="M400 0 H280 Q300 150 340 300 H400 Z" fill="#9b1c3a" />
      <path d="M0 0 H400 V36 Q300 56 200 36 Q100 56 0 36 Z" fill="#7a1530" />
      <g transform="rotate(-12 200 150)">
        <rect x="170" y="100" width="64" height="92" rx="8" fill="#fff" />
        <path d="M202 128 C190 112 172 128 202 156 C232 128 214 112 202 128 Z" fill="#e0503f" />
      </g>
      <ellipse cx="200" cy="262" rx="90" ry="12" fill={accent} opacity="0.35" />
      <Sparkle x={260} y={90} s={1.1} fill={accent} />
      <Sparkle x={140} y={200} s={0.8} />
    </g>
  ),
  games: (accent) => (
    <g>
      <path d="M150 70 H250 V120 Q250 180 200 186 Q150 180 150 120 Z" fill={accent} />
      <path d="M150 84 Q112 84 116 116 Q120 142 152 142" stroke={accent} strokeWidth="10" fill="none" />
      <path d="M250 84 Q288 84 284 116 Q280 142 248 142" stroke={accent} strokeWidth="10" fill="none" />
      <rect x="188" y="184" width="24" height="30" fill={accent} />
      <rect x="160" y="212" width="80" height="22" rx="4" fill="#3b1f5c" />
      <path d="M200 96 L208 116 L229 117 L212 130 L218 150 L200 138 L182 150 L188 130 L171 117 L192 116 Z" fill="#fff" />
      <Sparkle x={110} y={70} s={1} />
      <Sparkle x={300} y={190} s={1.2} />
    </g>
  ),
  host: (accent) => (
    <g>
      {[60, 90, 120].map((r, i) => (
        <path key={i} d={`M${200 + r * 0.7} ${120 - r * 0.7} A${r} ${r} 0 0 1 ${200 + r * 0.7} ${120 + r * 0.7}`} stroke={accent} strokeWidth="6" fill="none" opacity={0.9 - i * 0.25} strokeLinecap="round" />
      ))}
      {[60, 90, 120].map((r, i) => (
        <path key={`l${i}`} d={`M${200 - r * 0.7} ${120 - r * 0.7} A${r} ${r} 0 0 0 ${200 - r * 0.7} ${120 + r * 0.7}`} stroke={accent} strokeWidth="6" fill="none" opacity={0.9 - i * 0.25} strokeLinecap="round" />
      ))}
      <rect x="176" y="66" width="48" height="96" rx="24" fill="#ebe6ef" />
      <path d="M176 110 H224" stroke="#b9b0c0" strokeWidth="3" />
      <path d="M176 96 H224 M176 124 H224" stroke="#b9b0c0" strokeWidth="2" />
      <path d="M164 140 Q164 186 200 186 Q236 186 236 140" stroke="#fff" strokeWidth="7" fill="none" />
      <rect x="194" y="186" width="12" height="44" fill="#fff" />
      <rect x="168" y="228" width="64" height="10" rx="5" fill="#fff" />
    </g>
  ),
  variety: (accent) => (
    <g>
      {[
        [130, 100, accent, 44],
        [270, 90, '#ff6b5b', 52],
        [210, 180, '#ffffff', 40],
      ].map(([x, y, c, r], i) => (
        <g key={i} stroke={String(c)} strokeWidth="5" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            const R = Number(r);
            return (
              <line key={k} x1={Number(x) + Math.cos(a) * R * 0.35} y1={Number(y) + Math.sin(a) * R * 0.35} x2={Number(x) + Math.cos(a) * R} y2={Number(y) + Math.sin(a) * R} />
            );
          })}
          <circle cx={x} cy={y} r="5" fill={String(c)} />
        </g>
      ))}
      <path d="M90 300 Q130 220 130 150" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" fill="none" opacity="0.6" />
      <path d="M310 300 Q270 200 270 145" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" fill="none" opacity="0.6" />
    </g>
  ),
  science: (accent) => (
    <g>
      <path d="M176 60 H224 V120 L270 220 Q276 240 254 240 H146 Q124 240 130 220 L176 120 Z" fill="#ffffff" opacity="0.92" />
      <path d="M150 180 H250 L270 220 Q276 240 254 240 H146 Q124 240 130 220 Z" fill={accent} />
      <rect x="168" y="52" width="64" height="14" rx="6" fill="#ebe6ef" />
      {[
        [182, 206, 8],
        [214, 196, 6],
        [236, 218, 5],
        [196, 160, 6],
        [210, 130, 9],
        [190, 100, 11],
        [214, 70, 13],
      ].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y - (i > 3 ? 40 : 0)} r={r} fill="#fff" opacity={i > 3 ? 0.7 : 0.9} stroke={i > 3 ? '#fff' : 'none'} />
      ))}
      <Sparkle x={290} y={100} s={1} />
      <Sparkle x={110} y={140} s={0.8} fill={accent} />
    </g>
  ),
  puppets: (accent) => (
    <g>
      <rect x="96" y="70" width="208" height="190" rx="10" fill="#7a1530" />
      <rect x="116" y="100" width="168" height="110" fill="#2d1648" />
      <path d="M116 100 H200 Q170 160 116 200 Z" fill="#c0392b" />
      <path d="M284 100 H200 Q230 160 284 200 Z" fill="#c0392b" />
      <path d="M96 70 H304 V96 Q250 112 200 96 Q150 112 96 96 Z" fill={accent} />
      <circle cx="200" cy="152" r="22" fill="#ffd8b5" />
      <circle cx="192" cy="148" r="3" fill="#24172f" />
      <circle cx="208" cy="148" r="3" fill="#24172f" />
      <path d="M192 160 Q200 166 208 160" stroke="#24172f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M178 140 Q200 112 222 140" fill="#ff6b5b" />
      <path d="M176 210 L184 174 H216 L224 210 Z" fill="#2bb3c0" />
      <rect x="96" y="228" width="208" height="32" fill="#5a0f22" />
    </g>
  ),
};

export interface IllustrationProps {
  motif: Motif;
  seed?: number;
  className?: string;
  /** Accessible label; omit for decorative usage. */
  label?: string;
}

export const Illustration = memo(function Illustration({ motif, seed = 7, className, label }: IllustrationProps) {
  const [c1, c2, accent] = palettes[motif];
  const id = `g-${motif}-${seed}`;
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id})`} />
      <rect width="400" height="300" fill={`url(#${id}-glow)`} />
      <circle cx={seed % 2 ? 40 : 360} cy="40" r="90" fill="#fff" opacity="0.07" />
      <circle cx={seed % 2 ? 370 : 30} cy="280" r="110" fill="#fff" opacity="0.06" />
      <Confetti seed={seed * 97 + motif.length} accent={accent} />
      {motifs[motif](accent)}
    </svg>
  );
});
