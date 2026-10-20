/* ============================================================
   控制器层（App）：负责 UI 渲染、事件绑定、业务编排
   依赖 utils.js、store.js，按顺序加载
   ============================================================ */
window.App = window.App || {};

App.App = (function () {
  const Utils = App.Utils;
  const Store = App.Store;

  const $ = (sel) => document.querySelector(sel);

  // 当前筛选状态
  const state = {
    filter: 'all',     // all | active | completed
    search: '',
    tag: 'all',        // all | work | life | study | shop
    sort: 'created'    // created | due | priority | name
  };

  const PRIORITY_TEXT = { high: '高', mid: '中', low: '低' };
  const PRIORITY_CLASS = { high: 'p-high', mid: 'p-mid', low: 'p-low' };
  const TAG_TEXT = { work: '工作', life: '生活', study: '学习', shop: '购物' };

  /* ============ 通用工具 ============ */

  // 创建一个完整任务对象
  function makeTask(data) {
    return {
      id: Utils.uid(),
      text: data.text,
      note: data.note || '',
      priority: data.priority || 'mid',
      tag: data.tag || 'life',
      dueDate: data.dueDate || null,
      completed: data.completed || false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  // Toast 通知
  function toast(msg, type) {
    const wrap = $('#toastWrap');
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2200);
  }

  // 首次访问时写入几条示例数据，避免空页面
  function seedData() {
    if (Store.getAll().length) return;
    const today = Utils.todayStr();
    const samples = [
      { text: '完成前端作品集三个 Demo', note: '企业官网 / Todo 重构版 / Vue3 项目', priority: 'high', tag: 'work', dueDate: today },
      { text: '学习 Vue3 组合式 API', note: '先过官方文档再刷题', priority: 'mid', tag: 'study', dueDate: null },
      { text: '去超市采购', note: '牛奶、鸡蛋、水果', priority: 'low', tag: 'shop', dueDate: null },
      { text: '给 GitHub 仓库写 README', note: '每个项目都要有', priority: 'mid', tag: 'work', dueDate: null, completed: true }
    ];
    samples.forEach((s) => Store.add(makeTask(s)));
  }

  /* ============ 数据过滤与排序 ============ */

  function getVisibleTasks() {
    let list = Store.getAll();

    // 状态筛选
    if (state.filter === 'active') list = list.filter((t) => !t.completed);
    if (state.filter === 'completed') list = list.filter((t) => t.completed);

    // 分类筛选
    if (state.tag !== 'all') list = list.filter((t) => t.tag === state.tag);

    // 关键词搜索（匹配任务名或备注）
    const kw = state.search.trim().toLowerCase();
    if (kw) {
      list = list.filter((t) =>
        t.text.toLowerCase().includes(kw) ||
        (t.note || '').toLowerCase().includes(kw)
      );
    }

    // 排序
    switch (state.sort) {
      case 'due': // 按截止日期，无截止的排最后
        list.sort((a, b) => {
          const da = a.dueDate || '9999-99-99';
          const db = b.dueDate || '9999-99-99';
          return da < db ? -1 : da > db ? 1 : 0;
        });
        break;
      case 'priority': { // 高 > 中 > 低
        const order = { high: 0, mid: 1, low: 2 };
        list.sort((a, b) => order[a.priority] - order[b.priority]);
        break;
      }
      case 'name':
        list.sort((a, b) => a.text.localeCompare(b.text, 'zh'));
        break;
      default: // 按创建时间（新的在前）
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }

  /* ============ 渲染：统计仪表盘 ============ */

  function renderStats() {
    const all = Store.getAll();
    const total = all.length;
    const active = all.filter((t) => !t.completed).length;
    const done = total - active;
    const overdue = all.filter((t) => Utils.isOverdue(t.dueDate, t.completed)).length;
    const rate = total ? Math.round((done / total) * 100) : 0;

    $('#statTotal').textContent = total;
    $('#statActive').textContent = active;
    $('#statDone').textContent = done;
    $('#statOverdue').textContent = overdue;
    $('#statRate').textContent = rate + '%';
  }

  /* ============ 渲染：单条任务 ============ */

  function renderTask(task) {
    const li = document.createElement('li');
    li.className = 'task-item ' + PRIORITY_CLASS[task.priority] + (task.completed ? ' done' : '');
    li.dataset.id = task.id;

    const overdue = Utils.isOverdue(task.dueDate, task.completed);
    const dueHtml = task.dueDate
      ? '<span class="due' + (overdue ? ' overdue' : '') + '">' +
        (overdue ? '⚠ ' : '') + Utils.dueLabel(task.dueDate, task.completed) + '</span>'
      : '';

    li.innerHTML =
      '<input type="checkbox" class="task-check" ' + (task.completed ? 'checked' : '') + '>' +
      '<div class="task-body">' +
        '<div class="task-top">' +
          '<span class="task-text' + (task.completed ? ' done' : '') + '">' + Utils.escapeHtml(task.text) + '</span>' +
          '<span class="badge ' + task.priority + '">' + PRIORITY_TEXT[task.priority] + '</span>' +
          '<span class="tag-badge ' + task.tag + '">' + TAG_TEXT[task.tag] + '</span>' +
          dueHtml +
        '</div>' +
        (task.note ? '<div class="task-note">' + Utils.escapeHtml(task.note) + '</div>' : '') +
      '</div>' +
      '<div class="task-actions">' +
        '<button class="icon-btn-sm edit" title="双击标题也可编辑">✏️</button>' +
        '<button class="icon-btn-sm del" title="删除">🗑️</button>' +
      '</div>';

    // 勾选切换完成
    li.querySelector('.task-check').addEventListener('change', () => {
      Store.update(task.id, { completed: !task.completed });
      render();
    });

    // 删除
    li.querySelector('.del').addEventListener('click', () => {
      Store.remove(task.id);
      toast('已删除，可点“撤销”恢复', 'warn');
      render();
    });

    // 编辑（按钮 或 双击标题）
    const textEl = li.querySelector('.task-text');
    li.querySelector('.edit').addEventListener('click', () => enterEdit(li, textEl, task));
    textEl.addEventListener('dblclick', () => enterEdit(li, textEl, task));

    return li;
  }

  // 进入行内编辑模式
  function enterEdit(li, textEl, task) {
    const body = li.querySelector('.task-body');
    const input = document.createElement('input');
    input.className = 'edit-input';
    input.value = task.text;
    body.prepend(input);
    li.querySelector('.task-top').style.display = 'none';
    li.querySelector('.task-note') && (li.querySelector('.task-note').style.display = 'none');
    input.focus();
    input.select();

    function save() {
      const val = input.value.trim();
      if (val && val !== task.text) {
        Store.update(task.id, { text: val });
        toast('任务已更新', 'success');
      }
      render();
    }
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') render();
    });
  }

  /* ============ 渲染：列表 + 空状态 ============ */

  function renderList() {
    const ul = $('#taskList');
    const list = getVisibleTasks();
    ul.innerHTML = '';

    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.innerHTML =
        '<div class="big">🗂️</div>' +
        '<p>' + (Store.getAll().length ? '当前筛选下没有任务' : '还没有任务，先添加一条吧') + '</p>';
      ul.appendChild(li);
      return;
    }
    list.forEach((t) => ul.appendChild(renderTask(t)));
  }

  /* ============ 主渲染入口 ============ */

  function render() {
    renderStats();
    renderList();
    $('#footerInfo').textContent =
      '共 ' + Store.getAll().length + ' 条任务 · 本地存储 · 刷新不丢失';
  }

  /* ============ 事件绑定 ============ */

  function bindEvents() {
    // 添加任务
    $('#addBtn').addEventListener('click', addTask);
    $('#taskInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

    // 搜索
    $('#searchInput').addEventListener('input', (e) => {
      state.search = e.target.value;
      render();
    });

    // 状态筛选 Tab
    $('#filterTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.ftab');
      if (!btn) return;
      document.querySelectorAll('.ftab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      render();
    });

    // 分类筛选 Chips
    $('#tagChips').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      state.tag = chip.dataset.tag;
      render();
    });

    // 排序
    $('#sortSel').addEventListener('change', (e) => { state.sort = e.target.value; render(); });

    // 批量
    $('#completeAllBtn').addEventListener('click', () => {
      Store.setAllCompleted(true);
      toast('已全部标记完成', 'success');
      render();
    });
    $('#clearDoneBtn').addEventListener('click', () => {
      const n = Store.clearCompleted();
      toast(n ? '已清除 ' + n + ' 条已完成任务' : '没有已完成任务', n ? 'success' : 'info');
      render();
    });
    $('#undoBtn').addEventListener('click', () => {
      if (Store.undoDelete()) { toast('已撤销删除', 'success'); render(); }
      else toast('没有可撤销的操作', 'info');
    });

    // 导出
    $('#exportBtn').addEventListener('click', () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taskflow-backup-' + Utils.todayStr() + '.json';
      a.click();
      URL.revokeObjectURL(url);
      toast('已导出备份文件', 'success');
    });

    // 导入
    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (Store.importJSON(reader.result)) { toast('导入成功', 'success'); render(); }
        else toast('文件格式不正确', 'danger');
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // 主题切换
    $('#themeBtn').addEventListener('click', () => {
      const next = document.body.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(next);
      Store.setTheme(next);
    });
  }

  function addTask() {
    const text = $('#taskInput').value.trim();
    if (!text) { toast('请输入任务内容', 'danger'); return; }

    const task = makeTask({
      text: text,
      priority: $('#prioritySel').value,
      tag: $('#tagSel').value,
      dueDate: $('#dueDate').value || null,
      note: $('#noteInput').value.trim()
    });
    Store.add(task);
    toast('已添加任务', 'success');
    $('#taskInput').value = '';
    $('#noteInput').value = '';
    $('#dueDate').value = '';
    render();
  }

  /* ============ 主题 ============ */

  function applyTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
    $('#themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  /* ============ 启动 ============ */

  function init() {
    Store.load();
    seedData();
    applyTheme(Store.getTheme());
    bindEvents();
    render();
  }

  return { init: init };
})();

// 页面就绪后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.App.init);
} else {
  App.App.init();
}
