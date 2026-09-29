/* 陪练形象：三位临溪人的矢量头像，SVG 现画，不依赖外部图片。
   drawAvatar(style, mood) -> SVG 字符串；mood: idle / happy / worry / surprise
   画风往熟客的水墨画像靠：纸色底、淡墨远山、墨褐色线条，衣服是交领、长衫；表情仍然靠眉眼口和一点小符号。 */
(function () {
  let uid = 0;
  const LINE = '#3B302A';

  // 眼睛：眼白 + 深色虹膜 + 瞳孔 + 一个高光 + 上眼线
  function eye(cx, cy, irisTop, irisBot, mood, flip, id) {
    const s = flip ? -1 : 1;
    if (mood === 'happy') {
      return `<path d="M${cx - 3.2} ${cy + 1.2} Q${cx} ${cy - 2.8} ${cx + 3.2} ${cy + 1.2}" stroke="${LINE}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    }
    const big = mood === 'surprise';
    const ir = big ? 1.9 : 2.6, iry = big ? 2.4 : 3.2;
    return `<defs><linearGradient id="ir${id}${flip ? 'b' : 'a'}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${irisTop}"/><stop offset="1" stop-color="${irisBot}"/></linearGradient></defs>
      <ellipse cx="${cx}" cy="${cy + .4}" rx="3.4" ry="3.9" fill="#FBF8F1"/>
      <ellipse cx="${cx}" cy="${cy + .7}" rx="${ir}" ry="${iry}" fill="url(#ir${id}${flip ? 'b' : 'a'})"/>
      <ellipse cx="${cx}" cy="${cy + .9}" rx="${big ? .7 : 1}" ry="${big ? 1 : 1.5}" fill="#1B1512"/>
      <circle cx="${cx - .9 * s}" cy="${cy - .6}" r="${big ? .6 : .85}" fill="#fff" opacity=".9"/>
      <path d="M${cx - 3.8 * s} ${cy - 1} Q${cx} ${cy - 5} ${cx + 3.8 * s} ${cy - 2} L${cx + 4.6 * s} ${cy - 2.8}" stroke="${LINE}" stroke-width="1.35" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  function brows(mood, lx, rx, y, col, w) {
    const b = (x1, y1, qx, qy, x2, y2) => `<path d="M${x1} ${y1} Q${qx} ${qy} ${x2} ${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
    if (mood === 'worry') return b(lx - 2.2, y + .3, lx, y - .4, lx + 2, y - 1.6) + b(rx - 2, y - 1.6, rx, y - .4, rx + 2.2, y + .3);
    if (mood === 'surprise') return b(lx - 2.2, y - 1.4, lx, y - 2.8, lx + 2, y - 1.6) + b(rx - 2, y - 1.6, rx, y - 2.8, rx + 2.2, y - 1.4);
    return b(lx - 2.2, y, lx, y - 1, lx + 2, y - .4) + b(rx - 2, y - .4, rx, y - 1, rx + 2.2, y);
  }
  // 小符号：颜色都压低，像淡墨点出来的
  const blushLines = (x, y) => `<path d="M${x - 2.2} ${y + .9} l1 -1.8M${x - .5} ${y + .9} l1 -1.8M${x + 1.2} ${y + .9} l1 -1.8" stroke="#C9807A" stroke-width=".6" stroke-linecap="round" opacity=".8"/>`;
  const sweat = (x, y) => `<path d="M${x} ${y} q2.4 3.8 0 5.2 q-2.4 -1.4 0 -5.2z" fill="#C9D4D6" stroke="#7E9196" stroke-width=".5"/>`;
  const shock = (x, y) => `<path d="M${x} ${y} l1.4 -3.2M${x + 2.8} ${y + 1.1} l2.7 -2.3M${x + 3.8} ${y + 3.8} l3.2 -.7" stroke="${LINE}" stroke-width=".9" stroke-linecap="round"/>`;
  const sparkle = (x, y, r, c) => `<path d="M${x} ${y - r} Q${x + r * .18} ${y - r * .18} ${x + r} ${y} Q${x + r * .18} ${y + r * .18} ${x} ${y + r} Q${x - r * .18} ${y + r * .18} ${x - r} ${y} Q${x - r * .18} ${y - r * .18} ${x} ${y - r}z" fill="${c}"/>`;
  // 纸色底 + 远处一抹淡墨山
  const paper = (id, top, bot, ink) => `<defs><linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>
      <rect width="64" height="64" fill="url(#bg${id})"/>
      <path d="M0 40 C6 36 9 31 14 33 C18 35 20 30 25 31 C29 32 31 37 36 36 L36 64 L0 64Z" fill="${ink}" opacity=".13"/>
      <path d="M36 38 C41 33 45 34 49 30 C53 27 57 31 64 29 L64 64 L36 64Z" fill="${ink}" opacity=".09"/>`;
  function girlMouth(mood, y) {
    return {
      idle: `<path d="M30.5 ${y} q1.5 1 3 0" stroke="${LINE}" stroke-width=".95" stroke-linecap="round" fill="none"/>`,
      happy: `<path d="M29.4 ${y - .6} q2.6 3.8 5.2 0z" fill="#A9453F" stroke="${LINE}" stroke-width=".6"/>`,
      worry: `<path d="M29.9 ${y + .8} q1.05 -1 2.1 0 q1.05 1 2.1 0" stroke="${LINE}" stroke-width=".95" stroke-linecap="round" fill="none"/>`,
      surprise: `<ellipse cx="32" cy="${y + .6}" rx="1.3" ry="1.7" fill="#A9453F" stroke="${LINE}" stroke-width=".55"/>`,
    }[mood];
  }
  const face = `M20.6 26.5 C20.4 35.5 25 43 32 46.2 C39 43 43.6 35.5 43.4 26.5 C43.2 19 38.6 15.4 32 15.4 C25.4 15.4 20.8 19 20.6 26.5Z`;
  // 交领（右衽）：左襟压右襟，领口是一道斜过去的缘边
  const collar = (base, trim, under) => `
      <path d="M9 64 C11 52 20 48.4 32 48.4 C44 48.4 53 52 55 64Z" fill="${base}" stroke="${LINE}" stroke-width=".75"/>
      <path d="M26.4 48.9 L33.6 59.6 L31.4 64 L27 64 L23.6 49.6Z" fill="${under}" stroke="${LINE}" stroke-width=".5" opacity=".9"/>
      <path d="M37.6 48.9 C35.4 54 31.6 59 25.8 64 L21.6 64 C28.4 58.4 32.6 53.4 34.4 48.6Z" fill="${trim}" stroke="${LINE}" stroke-width=".6"/>
      <path d="M26.4 48.9 L30.4 55" stroke="${trim}" stroke-width="2.4" stroke-linecap="round"/>`;

  /* ---------------- 小棠：茶铺的小姑娘。双丫髻扎红绳，鬓边一朵海棠，杏色交领短袄 ---------------- */
  function xiaotang(mood) {
    const id = ++uid, hair = '#2E2421', hairL = '#4D3E37';
    const L = 27, R = 37, E = 32.6;
    const fx = mood === 'happy' ? sparkle(9, 18, 2.6, '#FFF8EA') + sparkle(55, 30, 1.9, '#FFF8EA')
      : mood === 'worry' ? sweat(46, 17) : mood === 'surprise' ? shock(46, 16) : '';
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="av ${mood}">
      ${paper(id, '#F6ECE1', '#EAD6C6', '#8A6A5C')}
      <g opacity=".75"><path d="M64 6 C58 9 54 13 51 19" stroke="#6E5646" stroke-width=".8" fill="none" stroke-linecap="round"/>
        <circle cx="57.4" cy="9.6" r="2" fill="#EDB3AC"/><circle cx="53.4" cy="14.6" r="1.6" fill="#F0C2BC"/><circle cx="57.4" cy="9.6" r=".6" fill="#C9574F"/></g>
      ${collar('#E6BFA6', '#9C4D43', '#F3E4D6')}
      <path d="M28.6 42 L28.6 49 Q32 50.4 35.4 49 L35.4 42Z" fill="#F1D0BC"/>
      <path d="M28.6 44 Q32 46.4 35.4 44 L35.4 42 L28.6 42Z" fill="#E0B39C"/>
      <circle cx="18.4" cy="13.4" r="6.6" fill="${hair}" stroke="${LINE}" stroke-width=".7"/><circle cx="45.6" cy="13.4" r="6.6" fill="${hair}" stroke="${LINE}" stroke-width=".7"/>
      <path d="M14.8 11 q3 -2.4 6 -1.2M43.2 9.8 q3.2 -1.2 6 1.2" stroke="${hairL}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M22.4 17.4 q-2 2.6 -4.8 2.4M41.6 17.4 q2 2.6 4.8 2.4" stroke="#B8423A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
      <path d="M17.6 33 C16.4 21 22 15 32 15 C42 15 47.6 21 46.4 33 L45 41 L41 37 L23 37 L19 41Z" fill="${hair}" stroke="${LINE}" stroke-width=".7"/>
      <path d="${face}" fill="#FAE3D2" stroke="${LINE}" stroke-width=".75"/>
      <path d="M19.8 27.4 L21.2 20.4 L23.2 24 L25.6 18.6 L27.8 23.2 L30.6 18 L32.8 23 L35.6 18.4 L37.8 23.2 L40.4 19 L42 24 L43.6 20.6 L44.4 27.4 C44.8 19.6 40 15.4 32 15.4 C24 15.4 19.2 19.6 19.8 27.4Z" fill="${hair}" stroke="${LINE}" stroke-width=".7" stroke-linejoin="round"/>
      <path d="M24.4 19.4 Q32 16.2 39.6 19.4" stroke="#fff" stroke-width="1" fill="none" opacity=".18" stroke-linecap="round"/>
      <g transform="translate(42.6 20.6)"><circle cx="0" cy="-1.5" r="1.25" fill="#E7A3A0"/><circle cx="1.45" cy="-.45" r="1.25" fill="#E7A3A0"/><circle cx=".9" cy="1.25" r="1.25" fill="#E7A3A0"/><circle cx="-.9" cy="1.25" r="1.25" fill="#E7A3A0"/><circle cx="-1.45" cy="-.45" r="1.25" fill="#E7A3A0"/><circle r=".7" fill="#C9574F"/></g>
      ${mood === 'worry' || mood === 'surprise' ? brows(mood, L, R, 24.8, '#2E211D', .95) : brows('idle', L, R, 25.4, '#3A2B25', .75)}
      <g class="eyes">${eye(L, E, '#3A2A26', '#7A5646', mood, false, id)}${eye(R, E, '#3A2A26', '#7A5646', mood, true, id)}</g>
      <ellipse cx="22.8" cy="38.4" rx="2.8" ry="1.3" fill="#E9A39C" opacity=".5"/><ellipse cx="41.2" cy="38.4" rx="2.8" ry="1.3" fill="#E9A39C" opacity=".5"/>
      ${mood === 'happy' || mood === 'surprise' ? blushLines(22.8, 38.4) + blushLines(41.2, 38.4) : ''}
      <path d="M31.7 38 l.5 .7" stroke="#C99680" stroke-width=".85" stroke-linecap="round"/>
      ${girlMouth(mood, 41.6)}
      ${fx}
    </svg>`;
  }

  /* ---------------- 小晴：书院的女先生。乌发垂肩，一支木簪，月白交领衫、青色缘边 ---------------- */
  function xiaoqing(mood) {
    const id = ++uid, hair = '#27201D', hairL = '#463A34';
    const L = 27, R = 37, E = 32.2;
    const fx = mood === 'happy' ? sparkle(10, 20, 2.3, '#FFFDF4') + sparkle(55, 38, 1.8, '#FFFDF4')
      : mood === 'worry' ? sweat(46.5, 18) : mood === 'surprise' ? shock(46, 15.6) : '';
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="av ${mood}">
      ${paper(id, '#E9ECE7', '#D2DAD6', '#4F6560')}
      <circle cx="51" cy="12" r="6.4" fill="#F7F4EA" opacity=".85"/>
      <path d="M17 24 C11.6 33 11.6 46 13.2 56 L15.4 51 L16.4 60 L19.2 54 L21 64 L43 64 L44.8 54 L47.6 60 L48.6 51 L50.8 56 C52.4 46 52.4 33 47 24Z" fill="${hair}" stroke="${LINE}" stroke-width=".75" stroke-linejoin="round"/>
      ${collar('#EFEDE5', '#557571', '#E0E3DC')}
      <path d="M28.6 42 L28.6 49.4 Q32 50.8 35.4 49.4 L35.4 42Z" fill="#EFCDB8"/>
      <path d="M28.6 44 Q32 46.4 35.4 44 L35.4 42 L28.6 42Z" fill="#DDAE98"/>
      <path d="${face}" fill="#F9E2D1" stroke="${LINE}" stroke-width=".75"/>
      <circle cx="21" cy="36.6" r=".9" fill="#8FB5A5" stroke="#5E7F72" stroke-width=".35"/><circle cx="43" cy="36.6" r=".9" fill="#8FB5A5" stroke="#5E7F72" stroke-width=".35"/>
      <path d="M19.2 28.6 C18 19.4 23.6 14 32.4 14 C41.6 14 46.4 20.2 44.8 28.6 L43.2 22.6 L41 25.6 L39.6 20.8 C36 23.8 30 24.8 23.6 23.6 L22.2 27.2 L20.8 23.4Z" fill="${hair}" stroke="${LINE}" stroke-width=".75" stroke-linejoin="round"/>
      <path d="M20 26.6 C19.2 32.6 19.8 39 21.6 43.6 C21.4 37.6 21.8 31.6 22.4 26.4Z" fill="${hair}" stroke="${LINE}" stroke-width=".55"/>
      <path d="M44 26.6 C44.8 32.6 44.2 39 42.4 43.6 C42.6 37.6 42.2 31.6 41.6 26.4Z" fill="${hair}" stroke="${LINE}" stroke-width=".55"/>
      <path d="M15.4 34 C14.8 42 15.6 50 17.6 56M48.6 34 C49.2 42 48.4 50 46.4 56" stroke="${hairL}" stroke-width=".8" fill="none" opacity=".7" stroke-linecap="round"/>
      <path d="M24 19.6 Q32 15.8 40.6 19.6" stroke="#fff" stroke-width="1" fill="none" opacity=".16" stroke-linecap="round"/>
      <path d="M36.4 15.4 L47.4 8.6" stroke="#8C6A46" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M36.4 15.4 L47.4 8.6" stroke="${LINE}" stroke-width=".35" opacity=".5"/>
      <circle cx="47.8" cy="8.4" r="1.3" fill="#6F8F86" stroke="${LINE}" stroke-width=".4"/>
      ${mood === 'worry' || mood === 'surprise' ? brows(mood, L, R, 24.6, '#2A201C', .95) : brows('idle', L, R, 25.2, '#2F2520', .75)}
      <g class="eyes">${eye(L, E, '#2E2A28', '#6B5A4E', mood, false, id)}${eye(R, E, '#2E2A28', '#6B5A4E', mood, true, id)}</g>
      <ellipse cx="22.8" cy="38.2" rx="2.6" ry="1.2" fill="#E3A69E" opacity=".42"/><ellipse cx="41.2" cy="38.2" rx="2.6" ry="1.2" fill="#E3A69E" opacity=".42"/>
      ${mood === 'happy' ? blushLines(22.8, 38.2) + blushLines(41.2, 38.2) : ''}
      <path d="M31.7 37.6 l.5 .7" stroke="#C99680" stroke-width=".85" stroke-linecap="round"/>
      ${girlMouth(mood, 41.2)}
      ${fx}
    </svg>`;
  }

  /* ---------------- 老陈：棋馆的老茶客。白眉白须、圆框老花镜，石青长衫盘扣，一把蒲扇一把紫砂壶 ---------------- */
  function laochen(mood) {
    const id = ++uid;
    const L = 26.6, R = 37.4, E = 29.2;
    let eyes;
    if (mood === 'idle') {
      // 平时镜片反光，看不见眼睛
      eyes = '';
    } else if (mood === 'happy') {
      eyes = `<path d="M${L - 2.4} ${E + .8} q2.4 -2.8 4.8 0M${R - 2.4} ${E + .8} q2.4 -2.8 4.8 0" stroke="${LINE}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    } else if (mood === 'surprise') {
      eyes = `<circle cx="${L}" cy="${E}" r="2.3" fill="#FBF8F1" stroke="${LINE}" stroke-width=".7"/><circle cx="${R}" cy="${E}" r="2.3" fill="#FBF8F1" stroke="${LINE}" stroke-width=".7"/>
        <circle cx="${L}" cy="${E}" r=".85" fill="${LINE}"/><circle cx="${R}" cy="${E}" r=".85" fill="${LINE}"/>`;
    } else {
      eyes = `<path d="M${L - 2} ${E} h4M${R - 2} ${E} h4" stroke="${LINE}" stroke-width="1.4" stroke-linecap="round"/>`;
    }
    const lensFill = mood === 'idle' ? '#E4ECEA' : '#F4F4EE';
    const lensOp = mood === 'idle' ? '.8' : '.2';
    const mouth = {
      idle: `<path d="M29.8 41.4 q2.2 .9 4.4 0" stroke="${LINE}" stroke-width=".95" stroke-linecap="round" fill="none"/>`,
      happy: `<path d="M28.8 40.6 q3.2 4.2 6.4 0z" fill="#8C4A3E" stroke="${LINE}" stroke-width=".55"/>`,
      worry: `<path d="M29.6 42.2 q2.4 -1.5 4.8 0" stroke="${LINE}" stroke-width=".95" stroke-linecap="round" fill="none"/>`,
      surprise: `<ellipse cx="32" cy="41.8" rx="1.5" ry="1.9" fill="#8C4A3E" stroke="${LINE}" stroke-width=".55"/>`,
    }[mood];
    const fx = mood === 'worry' ? sweat(47, 16) : mood === 'surprise' ? `<text x="47.4" y="19" font-size="9" font-weight="700" fill="#A8332A" font-family="serif">!</text>` : '';
    const steam = mood === 'idle' ? `<path class="steam" d="M41.4 47.2 q-1.4 -2 0 -4 q1.4 -2 0 -4M44 47.4 q-1.2 -1.8 0 -3.6 q1.2 -1.8 0 -3.6" stroke="#FBFAF4" stroke-width=".9" fill="none" opacity=".75" stroke-linecap="round"/>` : '';
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="av ${mood}">
      ${paper(id, '#E8E9DF', '#D0D5C6', '#56604F')}
      <defs><radialGradient id="hd${id}" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#F2D5BB"/><stop offset="1" stop-color="#DDB293"/></radialGradient></defs>
      <g transform="rotate(-22 12 38)">
        <ellipse cx="11" cy="34" rx="8.2" ry="10.4" fill="#D9C592" stroke="${LINE}" stroke-width=".65"/>
        <path d="M11 24 V44M6 27 L11 44M16 27 L11 44M3.4 33 L11 44M18.6 33 L11 44" stroke="#B59A5E" stroke-width=".55"/>
        <path d="M11 44.4 V52" stroke="#8A6A38" stroke-width="1.9" stroke-linecap="round"/>
      </g>
      <path d="M8 64 C10 52 20 48 32 48 C44 48 54 52 56 64Z" fill="#40535F" stroke="${LINE}" stroke-width=".75"/>
      <path d="M26.8 48.4 Q32 50.6 37.2 48.4 L37 51.4 Q32 53.4 27 51.4Z" fill="#33454F" stroke="${LINE}" stroke-width=".5"/>
      <path d="M32 51.8 V64" stroke="#2E3F48" stroke-width=".9"/>
      <path d="M29.6 55 h4.8M29.6 58.8 h4.8M29.6 62.6 h4.8" stroke="#C9B48A" stroke-width="1.1" stroke-linecap="round"/>
      <path d="M28.4 42 L28.4 48.6 Q32 50 35.6 48.6 L35.6 42Z" fill="#D8A785"/>
      <ellipse cx="18.8" cy="30.6" rx="2.7" ry="3.7" fill="#DDAC8A" stroke="${LINE}" stroke-width=".65"/><ellipse cx="45.2" cy="30.6" rx="2.7" ry="3.7" fill="#DDAC8A" stroke="${LINE}" stroke-width=".65"/>
      <path d="M20.2 28 C20 18.6 25 13.6 32 13.6 C39 13.6 44 18.6 43.8 28 C43.8 37.6 39.6 45 32 46.4 C24.4 45 20.2 37.6 20.2 28Z" fill="url(#hd${id})" stroke="${LINE}" stroke-width=".75"/>
      <ellipse cx="27.4" cy="17.6" rx="4" ry="1.6" fill="#fff" opacity=".3" transform="rotate(-18 27.4 17.6)"/>
      <path d="M19.4 29.6 L18.4 24.8 L20.6 25.8 L20 21.2 L22.6 23.6 L22.4 29.8Z" fill="#E9E8E1" stroke="${LINE}" stroke-width=".55" stroke-linejoin="round"/>
      <path d="M44.6 29.6 L45.6 24.8 L43.4 25.8 L44 21.2 L41.4 23.6 L41.6 29.8Z" fill="#E9E8E1" stroke="${LINE}" stroke-width=".55" stroke-linejoin="round"/>
      <path d="M22.4 24.8 Q26 21.4 30.2 23.8 Q27 23.8 24.6 26.2 Q23.8 25 22.4 24.8Z" fill="#EDECE6" stroke="${LINE}" stroke-width=".55"/>
      <path d="M41.6 24.8 Q38 21.4 33.8 23.8 Q37 23.8 39.4 26.2 Q40.2 25 41.6 24.8Z" fill="#EDECE6" stroke="${LINE}" stroke-width=".55"/>
      ${mood === 'worry' ? `<path d="M23.6 23.4 L29.4 25.2M40.4 23.4 L34.6 25.2" stroke="${LINE}" stroke-width=".55" opacity=".45"/>` : ''}
      <g class="eyes">${eyes}</g>
      <circle cx="${L}" cy="${E}" r="4.1" fill="${lensFill}" fill-opacity="${lensOp}" stroke="#5A4A3E" stroke-width=".9"/>
      <circle cx="${R}" cy="${E}" r="4.1" fill="${lensFill}" fill-opacity="${lensOp}" stroke="#5A4A3E" stroke-width=".9"/>
      <path d="M${L + 4.1} ${E - .4} q1.3 -.8 2.6 0" stroke="#5A4A3E" stroke-width=".8" fill="none"/>
      ${mood === 'idle' ? `<path d="M${L - 2.2} ${E + 1.4} l3 -3M${R - 2.2} ${E + 1.4} l3 -3" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".85"/>` : ''}
      <path d="M32.2 32 q-1.3 2.2 .4 2.8" stroke="#B98A68" stroke-width=".9" fill="none" stroke-linecap="round"/>
      <path d="M25.6 38.6 Q28.6 36 32 37.6 Q35.4 36 38.4 38.6 Q35.8 38.6 34.4 40 Q32 38.8 29.6 40 Q28.2 38.6 25.6 38.6Z" fill="#EDECE6" stroke="${LINE}" stroke-width=".55"/>
      ${mouth}
      <path d="M29.4 43.8 L32 48.6 L34.6 43.8 Q32 45 29.4 43.8Z" fill="#EDECE6" stroke="${LINE}" stroke-width=".55"/>
      <g transform="translate(42.2 45.2) scale(.92)">
        <path d="M2.2 5.6 L-1.8 3.2 Q-2.6 2.8 -2.2 3.8 L.8 7.4" fill="#7E5037" stroke="${LINE}" stroke-width=".5"/>
        <path d="M14.2 5.2 q3.4 .2 3.2 3.4 q-.2 3.2 -3.6 3" stroke="#7E5037" stroke-width="1.6" fill="none"/>
        <path d="M14.2 5.2 q3.4 .2 3.2 3.4 q-.2 3.2 -3.6 3" stroke="${LINE}" stroke-width=".4" fill="none"/>
        <ellipse cx="8.2" cy="9.4" rx="7.4" ry="5.6" fill="#8B5A3C" stroke="${LINE}" stroke-width=".6"/>
        <path d="M2.4 6.8 Q8.2 5 14 6.8" stroke="#6E432C" stroke-width=".7" fill="none"/>
        <ellipse cx="8.2" cy="4.4" rx="3.6" ry="1.1" fill="#7E5037" stroke="${LINE}" stroke-width=".5"/>
        <circle cx="8.2" cy="3" r="1.1" fill="#7E5037" stroke="${LINE}" stroke-width=".45"/>
        <ellipse cx="5.4" cy="8.6" rx="1.8" ry="1" fill="#fff" opacity=".18"/>
      </g>
      ${steam}
      ${fx}
    </svg>`;
  }

  window.AVATAR_STYLES = { laochen, xiaotang, xiaoqing };
  window.drawAvatar = (style, mood) => (window.AVATAR_STYLES[style] ? window.AVATAR_STYLES[style](mood || 'idle') : null);
})();
