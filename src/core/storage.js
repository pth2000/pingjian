/* 本地存储：读写都走这里。键名自动加上 gomoku- 前缀，再由 core/profile.js 分到当前角色名下。
   存储不可用（隐私模式、配额满）时读回默认值、写入静默失败，游戏照常能玩。 */
const K = key => 'gomoku-' + key;

export function load(key, fallback = null) {
  try { const v = localStorage.getItem(K(key)); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(K(key), JSON.stringify(value)); } catch (e) {}
}
export function remove(key) {
  try { localStorage.removeItem(K(key)); } catch (e) {}
}

// 不分角色、整台设备共用的开关（例如调试模式）
export function loadDevice(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
export function saveDevice(key, value) { try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch (e) {} }
