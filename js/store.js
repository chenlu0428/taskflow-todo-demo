/* ============================================================
   数据层（Store）：负责任务数据的 CRUD + localStorage 持久化
   与 UI 完全解耦：界面只调用这里的方法，不直接改数据
   ============================================================ */
window.App = window.App || {};

App.Store = (function () {
  const KEY = 'taskflow.tasks';
  const THEME_KEY = 'taskflow.theme';

  let tasks = [];
  let lastDeleted = null; // 供“撤销删除”使用

  // 初始化：读取本地存储
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      tasks = raw ? JSON.parse(raw) : [];
    } catch (e) {
      tasks = [];
    }
    return tasks;
  }

  // 保存到本地存储
  function save() {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  }

  function getAll() {
    return tasks.slice(); // 返回副本，避免外部直接改内部数组
  }

  // 新增（放到最前）
  function add(task) {
    tasks.unshift(task);
    save();
    return task;
  }

  // 按 id 更新部分字段
  function update(id, patch) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return null;
    Object.assign(t, patch, { updatedAt: Date.now() });
    save();
    return t;
  }

  // 删除，并缓存到 lastDeleted 供撤销
  function remove(id) {
    const idx = tasks.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const removed = tasks.splice(idx, 1)[0];
    lastDeleted = removed;
    save();
    return removed;
  }

  // 撤销上一步删除
  function undoDelete() {
    if (!lastDeleted) return null;
    tasks.unshift(lastDeleted);
    lastDeleted = null;
    save();
    return tasks[0];
  }

  // 批量标记完成/未完成
  function setAllCompleted(completed) {
    tasks.forEach((t) => {
      t.completed = completed;
      t.updatedAt = Date.now();
    });
    save();
  }

  // 清除所有已完成任务，返回删除数量
  function clearCompleted() {
    const before = tasks.length;
    tasks = tasks.filter((t) => !t.completed);
    save();
    return before - tasks.length;
  }

  // 导出为 JSON 字符串
  function exportJSON() {
    return JSON.stringify(tasks, null, 2);
  }

  // 从 JSON 导入，成功返回 true
  function importJSON(json) {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return false;
      tasks = data;
      save();
      return true;
    } catch (e) {
      return false;
    }
  }

  // 主题存取
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light';
  }
  function setTheme(t) {
    localStorage.setItem(THEME_KEY, t);
  }

  return {
    load: load,
    getAll: getAll,
    add: add,
    update: update,
    remove: remove,
    undoDelete: undoDelete,
    setAllCompleted: setAllCompleted,
    clearCompleted: clearCompleted,
    exportJSON: exportJSON,
    importJSON: importJSON,
    getTheme: getTheme,
    setTheme: setTheme
  };
})();
