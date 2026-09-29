/* 确认弹框和提示条。画面在 components/ConfirmModal.vue、AppToast.vue，这里是调用它们的函数。 */
import { ui } from '../stores/ui.js';

// 确认弹框：返回 Promise<boolean>。cancel: null 时只有一个按钮；给了 alt 就多一个按钮，点它返回 'alt'
export let askResolve = null;
let askReturn = null;
export function ask({ title, text = '', html = '', ok = '确定', cancel = '取消', alt = null, danger = false }) {
  if (askResolve) askResolve(false);
  askReturn = document.activeElement;
  Object.assign(ui.modal, { open: true, title, text, html, ok, cancel, alt, danger, seq: ui.modal.seq + 1 });
  return new Promise(res => { askResolve = res; });
}
export function closeAsk(v) {
  if (!askResolve) return;
  const r = askResolve; askResolve = null;
  ui.modal.open = false;
  try { askReturn && askReturn.focus({ preventScroll: true }); } catch (e) {}
  r(v);
}

let toastTimer = 0;
export function toast(msg) {
  ui.toast.msg = msg; ui.toast.on = true;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast.on = false; }, 2200);
}
