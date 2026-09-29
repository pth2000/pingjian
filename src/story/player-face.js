/* ================= 玩家头像：撑伞的外乡人（玩家在故事里总是「你」，不露脸） =================
   两套同一个构图：细雨黄昏，一把压得很低的油纸伞遮住整张脸，远处棋馆的灯笼是两点暖光。
   青衫（m）：淡青灰长衫、青绿油纸伞，伞下漏出一角朱红发带；
   红袖（f）：月白衣、朱红窄袖、朱红油纸伞，长发从伞下垂下来，发尾一根红绳。
   画好的图放在 art/player_m.webp、player_f.webp，会自动替换这里的剪影。 */
import { oppArt } from './portraits.js';

export function playerFace(g) {
  const pic = oppArt('player', g === 'f' ? 'f' : 'm');
  if (pic) return `<img class="face-art face-img" src="${pic}" alt="" draggable="false">`;
  const u = 'pl' + (playerFace.n = (playerFace.n || 0) + 1), SEAL = '#B23A2B', SHADE = '#2A2420';
  const f = g === 'f';
  const um = f ? ['#D0664F', '#9E3325'] : ['#8FB3A4', '#557A6C'];           // 伞面：亮 → 暗
  const robe = f ? '#E8E2D4' : '#6F7F78', collar = f ? '#C9C0AE' : '#3E4A45';
  const extra = f
    ? `<path d="M8 124 C9 108 18 98 30 93 L36 124 Z" fill="${SEAL}"/><path d="M112 124 C111 108 102 98 90 93 L84 124 Z" fill="${SEAL}"/>
       <path d="M44 60 C38 78 40 100 46 122 L54 122 C50 100 50 80 52 62 Z" fill="${SHADE}"/>
       <path d="M44 104 L52 104" stroke="${SEAL}" stroke-width="2.4" stroke-linecap="round"/>`
    : `<path d="M70 58 C82 62 90 70 92 82 C93 88 97 92 102 94" stroke="${SEAL}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
       <path d="M70 60 C78 68 80 76 78 86" stroke="${SEAL}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>`;
  return `<svg class="face-art player-art" viewBox="0 0 120 120" aria-hidden="true"><defs>`
    + `<linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f ? '#E9D9CB' : '#DCDDD0'}"/><stop offset="1" stop-color="${f ? '#8E6F66' : '#6E756C'}"/></linearGradient>`
    + `<linearGradient id="${u}u" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${um[0]}"/><stop offset="1" stop-color="${um[1]}"/></linearGradient>`
    + `<clipPath id="${u}c"><circle cx="60" cy="60" r="60"/></clipPath></defs>`
    + `<g clip-path="url(#${u}c)"><rect width="120" height="120" fill="url(#${u}g)"/>`
    + `<circle cx="${f ? 22 : 98}" cy="70" r="3.2" fill="#F6C46A" opacity=".85"/><circle cx="${f ? 30 : 90}" cy="73" r="2.4" fill="#F6C46A" opacity=".6"/>`
    + `<g stroke="#FFFFFF" stroke-width=".8" opacity=".35">${[8, 26, 44, 78, 96, 112].map((x, k) => `<path d="M${x} ${k % 2 ? 60 : 72} l-5 12"/>`).join('')}</g>`
    + `<path d="M8 124 C10 102 30 90 47 86 L73 86 C90 90 110 102 112 124 Z" fill="${robe}"/>`
    + `<path d="M47 86 L60 104 L73 86" fill="none" stroke="${collar}" stroke-width="3"/>`
    + `<path d="M52 72 L68 72 L70 88 L50 88 Z" fill="${SHADE}"/>`
    + `<ellipse cx="60" cy="62" rx="15" ry="16" fill="${SHADE}"/>`
    + extra
    + `<path d="M61 50 L64 100" stroke="#3B2F24" stroke-width="2.2" stroke-linecap="round"/>`
    + `<path d="M6 58 Q20 16 60 11 Q100 16 114 58 Q103 52 91 57 Q77 50 60 57 Q43 50 29 57 Q17 52 6 58 Z" fill="url(#${u}u)"/>`
    + `<g stroke="#000" stroke-width=".8" opacity=".22" fill="none"><path d="M60 11 L29 57"/><path d="M60 11 L60 57"/><path d="M60 11 L91 57"/><path d="M60 11 L12 55"/><path d="M60 11 L108 55"/></g>`
    + `<path d="M6 58 Q17 52 29 57 Q43 50 60 57 Q77 50 91 57 Q103 52 114 58" stroke="#000" stroke-width="1" fill="none" opacity=".25"/>`
    + `<circle cx="60" cy="10" r="2.4" fill="#3B2F24"/></g></svg>`;
}
// 剧情关闭时的玩家头像：不带人物、不写字。浅木色棋盘的一角（带木纹和星位），交叉点上落着一枚黑子
export function plainFace() {
  const u = 'pp' + (plainFace.n = (plainFace.n || 0) + 1);
  const lines = [18, 46, 74, 102].map(p => `<path d="M0 ${p}H120M${p} 0V120"/>`).join('');
  const grain = [14, 33, 57, 88, 109].map((y, k) => `<path d="M-4 ${y} C30 ${y + (k % 2 ? 5 : -4)} 80 ${y + (k % 2 ? -3 : 6)} 124 ${y + 2}"/>`).join('');
  return `<svg class="face-art player-plain" viewBox="0 0 120 120" aria-hidden="true"><defs>`
    + `<radialGradient id="${u}b" cx=".42" cy=".36" r=".85"><stop offset="0" stop-color="#EED8AC"/><stop offset="1" stop-color="#C6975A"/></radialGradient>`
    + `<radialGradient id="${u}s" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#707270"/><stop offset=".42" stop-color="#262726"/><stop offset="1" stop-color="#0A0A0A"/></radialGradient>`
    + `<clipPath id="${u}c"><circle cx="60" cy="60" r="60"/></clipPath></defs>`
    + `<g clip-path="url(#${u}c)"><rect width="120" height="120" fill="url(#${u}b)"/>`
    + `<g stroke="#8A5A22" stroke-opacity=".12" stroke-width="2" fill="none">${grain}</g>`
    + `<g stroke="#5E3F16" stroke-opacity=".42" stroke-width="1.3">${lines}</g>`
    + `<circle cx="46" cy="46" r="3.2" fill="#5E3F16" opacity=".55"/>`
    + `<circle cx="76.5" cy="77.5" r="21" fill="#3A2408" opacity=".3"/>`
    + `<circle cx="74" cy="74" r="21" fill="url(#${u}s)"/>`
    + `<ellipse cx="67" cy="65" rx="7" ry="4" fill="#fff" opacity=".16" transform="rotate(-32 67 65)"/></g></svg>`;
}
