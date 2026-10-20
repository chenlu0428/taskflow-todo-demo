/* ============================================================
   工具层（Utils）：与业务无关的通用函数
   通过 window.App 命名空间挂载，避免污染全局
   ============================================================ */
window.App = window.App || {};

App.Utils = (function () {
  // 生成唯一 ID：时间戳 + 随机串
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  // 返回今天 "YYYY-MM-DD"
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // 把 "2026-10-25" 格式化为 "10月25日"
  function formatDate(str) {
    if (!str) return '';
    const parts = str.split('-');
    return parts[1] + '月' + parts[2] + '日';
  }

  // 距截止日期还有几天（负数=已过期），无截止日期返回 null
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const then = new Date(dateStr); then.setHours(0, 0, 0, 0);
    return Math.round((then - now) / 86400000);
  }

  // 是否已逾期（仅未完成且有截止日期的任务才算）
  function isOverdue(dateStr, completed) {
    if (completed || !dateStr) return false;
    return daysUntil(dateStr) < 0;
  }

  // 距截止天数的友好文案
  function dueLabel(dateStr, completed) {
    if (!dateStr) return '无截止';
    if (completed) return '截止 ' + formatDate(dateStr);
    const d = daysUntil(dateStr);
    if (d < 0) return '已逾期 ' + Math.abs(d) + ' 天';
    if (d === 0) return '今天截止';
    return d + ' 天后截止';
  }

  // 转义 HTML，防止 XSS
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  return {
    uid: uid,
    todayStr: todayStr,
    formatDate: formatDate,
    daysUntil: daysUntil,
    isOverdue: isOverdue,
    dueLabel: dueLabel,
    escapeHtml: escapeHtml
  };
})();
