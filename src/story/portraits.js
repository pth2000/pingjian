/* ================= 对手：画像与小设定 =================
   画像是 SVG 现画的剪影，脸总藏着一半（斗笠、面具、面纱、兜帽……），留点神秘感。
   oppFace(id) 返回 SVG 字符串；id 为 'rand' 时是“随机”的问号剪影。 */
import { OPP_ART } from 'virtual:art';
import { ST } from './story.js';
import { OPPONENTS } from '../engine/engine.js';
import { OPP_COL } from '../ui/state.js';

export function oppFace(id) {
  const pic = oppArt(id, 'a');
  if (pic) return `<img class="face-art face-img" src="${pic}" alt="" draggable="false">`;
  const u = 'of' + (oppFace.n = (oppFace.n || 0) + 1);
  const INK = '#15110E';
  const bust = (fill, extra = '') => `<path d="M8 124 C10 100 30 88 47 84 L73 84 C90 88 110 100 112 124 Z" fill="${fill}" ${extra}/>`
    + `<path d="M51 70 L69 70 L71 88 L49 88 Z" fill="${fill}" ${extra}/>`;
  const bg = (a, b2, cx = 50, cy = 30) => `<radialGradient id="${u}g" cx="${cx}%" cy="${cy}%" r="85%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b2}"/></radialGradient>`;
  let defs = '', art = '';
  switch (id) {
    case 'wuming':   // 守中：斗笠遮住了脸，身后一轮落日
      defs = bg('#E7C98E', '#3A2717', 50, 38) + `<linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2C20"/><stop offset="1" stop-color="${INK}"/></linearGradient>`;
      art = `<circle cx="60" cy="50" r="33" fill="#F6E7C6" opacity=".78"/>
        <path d="M0 96 Q30 90 60 94 T120 92 L120 120 L0 120Z" fill="#2A1D12" opacity=".35"/>
        ${bust(INK)}
        <ellipse cx="60" cy="58" rx="15" ry="18" fill="${INK}"/>
        <path d="M10 60 Q60 22 110 60 Q60 70 10 60Z" fill="url(#${u}h)"/>
        <path d="M10 60 Q60 70 110 60" stroke="#C9A36A" stroke-width="1.2" fill="none" opacity=".7"/>
        <path d="M60 27 L60 33" stroke="#C9A36A" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
        <path d="M46 84 L60 104 L74 84" stroke="#5A4632" stroke-width="1.6" fill="none"/>
        <path d="M22 110 q2 -8 0 -14 M26 110 q3 -9 0 -16" stroke="#F6E7C6" stroke-width="1" fill="none" opacity=".35"/>`;
      break;
    case 'chong':    // 惊雷：半张铜面具，一只发亮的眼，身后劈下一道雷
      defs = bg('#E0775C', '#240B08', 40, 25) + `<linearGradient id="${u}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2B878"/><stop offset=".55" stop-color="#B8662E"/><stop offset="1" stop-color="#6A3316"/></linearGradient>`;
      art = `<g transform="translate(-50 0)"><path d="M84 0 L70 34 L82 36 L64 72 L76 74 L58 112 L96 60 L82 58 L98 26 L86 24 L100 0Z" fill="#FFD890" opacity=".8"/><path d="M84 0 L70 34 L82 36 L64 72 L76 74 L58 112" stroke="#FFF3D0" stroke-width="1.2" fill="none" opacity=".8"/></g>
        ${bust(INK)}
        <path d="M66 40 Q86 30 96 46 Q104 62 98 80 Q96 90 88 96 Q94 80 88 64 Q84 52 72 50Z" fill="${INK}"/><path d="M70 38 Q66 30 72 26 Q74 32 76 36Z" fill="${INK}"/>
        <ellipse cx="60" cy="56" rx="16" ry="19" fill="${INK}"/>
        <path d="M44 48 Q60 34 76 46 L76 42 Q60 30 44 44Z" fill="${INK}"/>
        <path d="M60 37 Q76 38 76 56 Q76 72 60 75 Z" fill="url(#${u}m)"/>
        <path d="M60 37 L60 75" stroke="#3A1A0A" stroke-width="1"/>
        <path d="M64 53 Q69 50 73 53" stroke="#FFE9B0" stroke-width="2.2" stroke-linecap="round" fill="none"/>
        <path d="M63 63 L72 62" stroke="#5A2A10" stroke-width="1" opacity=".7"/>
        <path d="M40 92 L56 100 M80 92 L64 100" stroke="#8A2E22" stroke-width="2" opacity=".8"/>`;
      break;
    case 'laogui':   // 磐石：山脚的年轻石匠，宽肩，额上扎一条布巾，群山在身后
      defs = bg('#A9C3AE', '#18261C', 50, 25);
      art = `<path d="M0 78 L22 48 L38 64 L60 36 L84 66 L100 50 L120 72 L120 120 L0 120Z" fill="#2C4434" opacity=".7"/>
        <path d="M0 92 L30 70 L52 86 L78 66 L120 90 L120 120 L0 120Z" fill="#1F3226" opacity=".85"/>
        <path d="M0 124 C2 96 26 84 44 81 L76 81 C94 84 118 96 120 124 Z" fill="${INK}"/>
        <path d="M50 68 L70 68 L72 86 L48 86 Z" fill="${INK}"/>
        <ellipse cx="60" cy="55" rx="16.5" ry="18.5" fill="${INK}"/>
        <path d="M45 43 Q60 37 75 43 L76.5 47.5 Q60 41.5 43.5 47.5 Z" fill="#C9B99A"/>
        <path d="M75.5 44 Q84 45 87 52 M75.5 46 Q82 51 82 58" stroke="#C9B99A" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M44 84 L60 104 L76 84" stroke="#4A5A48" stroke-width="2" fill="none"/>`;
      break;
    case 'xieyue':   // 斜月：面纱遮住下半张脸，一弯斜月
      defs = bg('#6F8FD0', '#0B1128', 70, 20) + `<mask id="${u}k"><rect width="120" height="120" fill="#fff"/><circle cx="98" cy="22" r="17" fill="#000"/></mask>`;
      art = `${[[18, 22], [34, 12], [12, 44], [46, 26], [104, 64], [26, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#E8EEFF" opacity=".8"/>`).join('')}
        <circle cx="88" cy="28" r="18" fill="#F1F4FF" mask="url(#${u}k)" transform="rotate(-25 88 28)"/>
        <path d="M38 60 Q36 34 60 34 Q84 34 82 60 L90 108 L30 108Z" fill="${INK}"/>
        ${bust(INK)}
        <ellipse cx="60" cy="56" rx="15" ry="18" fill="${INK}"/>
        <path d="M45 46 Q60 30 76 46 Q66 40 52 44Z" fill="${INK}"/>
        <path d="M45 57 Q60 53 75 57 L77 84 Q72 88 68 84 Q64 90 60 85 Q56 90 52 84 Q48 88 43 84Z" fill="#DCE4FA" opacity=".24"/><path d="M52 58 L50 84 M60 56 L60 85 M68 58 L70 84" stroke="#DCE4FA" stroke-width=".6" opacity=".35"/><path d="M45 57 Q60 53 75 57" stroke="#E8EEFF" stroke-width="1" fill="none" opacity=".6"/>
        <path d="M50 53 q3 -2 6 0 M64 53 q3 -2 6 0" stroke="#C9D4F4" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        <path d="M76 40 L86 32" stroke="#C9A36A" stroke-width="1.6" stroke-linecap="round"/><circle cx="87" cy="31" r="2" fill="#E6C27A"/>
        <path d="M14 118 L34 92 M14 118 L42 98 M14 118 L46 108 M14 118 L40 116" stroke="#8FA4D8" stroke-width="1.2" opacity=".75"/>
        <path d="M34 92 Q44 100 46 108 Q44 114 40 116" stroke="#8FA4D8" stroke-width="1.4" fill="none" opacity=".75"/>`;
      break;
    case 'yehu':     // 飞鸿：兜帽和围巾里只露出一点眼光，雁阵飞过
      defs = bg('#E2C08A', '#2E1C0C', 45, 30);
      art = `${[[16, 30], [30, 20], [44, 30]].map(([x, y]) => `<path d="M${x - 5} ${y - 3} L${x} ${y} L${x + 5} ${y - 3}" stroke="#3A2614" stroke-width="1.4" fill="none" stroke-linecap="round"/>`).join('')}
        ${[[80, 14], [96, 40], [24, 70], [104, 86], [88, 22], [14, 96], [70, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#FFF8EA" opacity=".85"/>`).join('')}
        <path d="M8 124 C10 102 26 90 40 86 L48 60 Q60 26 72 60 L80 86 C94 90 110 102 112 124 L100 118 L92 124 L82 116 L72 124 L60 116 L48 124 L38 116 L28 124 L18 118Z" fill="${INK}"/>
        <path d="M42 64 Q44 34 60 32 Q76 34 78 64 L74 84 L46 84Z" fill="#1E1712"/>
        <ellipse cx="60" cy="60" rx="12" ry="14" fill="#0A0806"/>
        <path d="M44 66 Q60 60 76 66 L76 76 Q60 72 44 76Z" fill="#7A5230"/>
        <path d="M44 70 Q60 65 76 70" stroke="#A67446" stroke-width="1" fill="none"/>
        <circle cx="54.5" cy="58" r="1.3" fill="#F4E2B8"/><circle cx="65.5" cy="58" r="1.3" fill="#F4E2B8"/>`;
      break;
    case 'atu':      // 如影：通身漆黑的姑娘，挽着髻、插一支木簪，只露一双眼睛；身后还跟着一道影子
      defs = bg('#8E8466', '#0A0907', 25, 20) + `<filter id="${u}b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.6"/></filter>`;
      art = `<circle cx="26" cy="22" r="26" fill="#F2DDA0" opacity=".22"/>
        <g transform="translate(10 4)" opacity=".38" filter="url(#${u}b)">${bust('#000')}<ellipse cx="60" cy="56" rx="16" ry="19" fill="#000"/></g>
        ${bust('#050404')}
        <ellipse cx="60" cy="56" rx="16" ry="19" fill="#050404"/>
        <path d="M44 50 Q46 34 60 34 Q76 34 78 52 Q70 42 58 44 Q50 46 44 50Z" fill="#050404"/>
        <ellipse cx="60" cy="34" rx="10" ry="7" fill="#050404"/>
        <path d="M45 52 Q40 72 45 92 L52 92 Q47 72 49 56Z M75 52 Q80 72 75 92 L68 92 Q73 72 71 56Z" fill="#050404"/>
        <path d="M50 30 L72 37" stroke="#C9B27A" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>
        <ellipse cx="53" cy="57" rx="2.6" ry="1.4" fill="#F2E6B8"/><ellipse cx="67" cy="57" rx="2.6" ry="1.4" fill="#F2E6B8"/>
        <ellipse cx="53" cy="57" rx="5" ry="3" fill="#F2E6B8" opacity=".18"/><ellipse cx="67" cy="57" rx="5" ry="3" fill="#F2E6B8" opacity=".18"/>`;
      break;
    default:         // 随机：和还不认识的对手一样的圆章，只写一个毛笔问号
      defs = bg('#8C867A', '#625D54', 50, 35);
      art = `<circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>`
        + `<text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="64" fill="#fff" style="font-family:var(--brush)">?</text>`;
  }
  return `<svg class="face-art" viewBox="0 0 120 120" aria-hidden="true"><defs>${defs}<clipPath id="${u}c"><circle cx="60" cy="60" r="60"/></clipPath></defs>`
    + `<g clip-path="url(#${u}c)"><rect width="120" height="120" fill="url(#${u}g)"/>${art}</g></svg>`;
}

/* 还不认识的对手（交情没到「相识」）：只显示当初那种彩色圆章，不露画像 */
/* 画好的画像（art_data.js）：有就用图，没有就用上面的剪影 */
export function oppArt(id, k) { try { return (OPP_ART[id] || {})[k] || ''; } catch (e) { return ''; } }
// 剧情关掉时，所有对手都停在初见（只显示圆章）
export function oppKnown(id) { try { return ST.on !== false && (ST.stage[id] || 0) >= 1; } catch (e) { return false; } }
export function oppSeal(id) {
  const o = OPPONENTS.find(x => x.id === id), col = (typeof OPP_COL !== 'undefined' && OPP_COL[id]) || '#6A655C';
  return `<svg class="face-art seal-art" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill="${col}"/><circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/><text x="60" y="62" text-anchor="middle" dominant-baseline="central" font-size="62" fill="#fff" style="font-family:var(--brush)">${o ? o.mark : '?'}</text></svg>`;
}
export function oppAvatar(id) { return id === 'rand' ? oppFace('rand') : oppKnown(id) ? oppFace(id) : oppSeal(id); }