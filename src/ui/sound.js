/* ---- 音效（WebAudio 合成，无外部文件） ---- */
import { S } from './state.js';
import { LETTERS, N } from '../engine/engine.js';

let AC = null;
function audio() {
  if (!S.sound) return null;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; }
  return AC;
}
export function clack(c) {
  const a = audio(); if (!a) return;
  const t = a.currentTime, len = Math.floor(0.05 * a.sampleRate);
  const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 4);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = c === 1 ? 1900 : 2400; f.Q.value = 1.1;
  const g = a.createGain(); g.gain.value = 0.55;
  src.connect(f); f.connect(g); g.connect(a.destination); src.start(t);
  const o = a.createOscillator(), og = a.createGain();
  o.frequency.setValueAtTime(c === 1 ? 380 : 440, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.06);
  og.gain.setValueAtTime(0.16, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  o.connect(og); og.connect(a.destination); o.start(t); o.stop(t + 0.1);
}
export function chime(notes, type = 'triangle', step = 0.13) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + 0.05;
  notes.forEach((fq, k) => {
    const o = a.createOscillator(), g = a.createGain(), t = t0 + k * step;
    o.type = type; o.frequency.value = fq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 0.65);
  });
}

export const coord = i => LETTERS[i % N] + (N - ((i / N) | 0));
export const narrow = () => window.matchMedia('(max-width: 820px), (max-height: 560px)').matches;
export const toMove = () => (S.moves.length % 2 === 0 ? 1 : 2);
export const PVP = () => S.mode === 'pvp';
// 开局规则进行中（S.op）：能不能点棋盘由开局那边说了算（S.op.mine），摆的是哪色就看轮到第几手
export const myTurn = () => (S.op ? !!S.op.mine : PVP() || toMove() === S.human);
export const myColor = () => (S.op || PVP() ? toMove() : S.human);

/* ---- 启动时由 app.js 调用：读存档、接事件 ---- */
export function __init() {
  // 音频环境首次创建要十几二十毫秒，放在第一次按下时预热，别让它挤到落子那一帧
  ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, function warm() { if (S.sound) { try { audio(); } catch (e) {} } removeEventListener(ev, warm, true); }, { capture: true, once: true }));
}
