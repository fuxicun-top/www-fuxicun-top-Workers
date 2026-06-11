// ========================================
// 文件说明：操作日志页面脚本
// 文件路径：js/admin/logs.js
// 功能：查看系统操作日志、按操作类型筛选
// ========================================

(function() {
  'use strict';

  /** @type {number} 当前页码 */
  var currentPage = 1;

  /** @type {string} 当前操作类型筛选 */
  var currentAction = '';

  /**
   * 操作类型配置
   */
  var ACTION_MAP = {
    'article_create': { text: '创建文章', class: 'create', icon: '📝' },
    'article_update': { text: '更新文章', class: 'update', icon: '✏️' },
    'article_delete': { text: '删除文章', class: 'delete', icon: '🗑️' },
    'article_status_change': { text: '文章状态变更', class: 'status', icon: '🔄' },
    'comment_status_change': { text: '评论审核', class: 'status', icon: '💬' },
    'comment_delete': { text: '删除评论', class: 'delete', icon: '🗑️' },
    'media_delete': { text: '删除媒体', class: 'delete', icon: '🗑️' },
    'media_upload': { text: '上传媒体', class: 'create', icon: '📤' },
    'user_delete': { text: '删除用户', class: 'delete', icon: '🗑️' },
    'user_create': { text: '创建用户', class: 'create', icon: '👤' },
    'user_update': { text: '更新用户', class: 'update', icon: '✏️' },
    'config_update': { text: '更新设置', class: 'update', icon: '⚙️' },
    'banner_create': { text: '创建轮播图', class: 'create', icon: '🖼️' },
    'banner_update': { text: '更新轮播图', class: 'update', icon: '✏️' },
    'banner_delete': { text: '删除轮播图', class: 'delete', icon: '🗑️' },
    'category_create': { text: '创建分类', class: 'create', icon: '📁' },
    'category_update': { text: '更新分类', class: 'update', icon: '✏️' },
    'category_delete': { text: '删除分类', class: 'delete', icon: '🗑️' },
    'nav_create': { text: '创建导航', class: 'create', icon: '🧭' },
    'nav_update': { text: '更新导航', class: 'update', icon: '✏️' },
    'nav_delete': { text: '删除导航', class: 'delete', icon: '🗑️' },
    'page_create': { text: '创建页面', class: 'create', icon: '📄' },
    'page_update': { text: '更新页面', class: 'update', icon: '✏️' },
    'page_delete': { text: '删除页面', class: 'delete', icon: '🗑️' },
    'database_reset': { text: '重置数据库', class: 'delete', icon: '⚠️' },
    'database_clear': { text: '清空数据库', class: 'delete', icon: '⚠️' }
  };

  /**
   * 目标类型中文映射
   */
  var TARGET_MAP = {
    'article': '文章',
    'comment': '评论',
    'media': '媒体',
    'user': '用户',
    'config': '设置',
    'banner': '轮播图',
    'category': '分类',
    'nav': '导航',
    'page': '页面',
    'database': '数据库'
  };

  /**
   * 页面初始化入口
   */
  function init() {
    if (!Admin.init()) return;
    loadLogs();
    bindEvents();
    loadStats();
  }

  /**
   * 绑定筛选事件
   */
  function bindEvents() {
    // 筛选标签点击
    document.getElementById('filter-chips').addEventListener('click', function(e) {
      var chip = e.target.closest('.log-chip');
      if (!chip) return;

      // 更新选中状态
      document.querySelectorAll('.log-chip').forEach(function(c) {
        c.classList.remove('active');
      });
      chip.classList.add('active');

      currentAction = chip.dataset.action || '';
      currentPage = 1;
      loadLogs();
    });
  }

  /**
   * 加载统计数据
   */
  async function loadStats() {
    try {
      var result = await API.get('/admin/logs', { pageSize: 1 });
      if (result.success) {
        document.getElementById('stat-total').textContent = result.data.total || 0;
      }
    } catch (e) {
      // 忽略统计加载失败
    }
  }

  /**
   * 加载操作日志列表
   */
  async function loadLogs() {
    var list = document.getElementById('log-list');
    list.innerHTML = '<div class="log-empty"><div class="log-empty__icon">⏳</div><div class="log-empty__text">加载中...</div></div>';

    try {
      var params = { page: currentPage, pageSize: 20 };
      if (currentAction) params.action = currentAction;

      var result = await API.get('/admin/logs', params);
      if (result.success) {
        renderLogs(result.data.list);
        renderPagination(result.data.total, result.data.page, result.data.pageSize);
        document.getElementById('timeline-count').textContent = '共 ' + result.data.total + ' 条';
      } else {
        list.innerHTML = '<div class="log-empty"><div class="log-empty__icon">❌</div><div class="log-empty__text">加载失败</div></div>';
      }
    } catch (e) {
      list.innerHTML = '<div class="log-empty"><div class="log-empty__icon">❌</div><div class="log-empty__text">加载失败: ' + e.message + '</div></div>';
    }
  }

  /**
   * 渲染日志时间线
   */
  function renderLogs(logs) {
    var list = document.getElementById('log-list');

    if (!logs || logs.length === 0) {
      list.innerHTML = '<div class="log-empty"><div class="log-empty__icon">📋</div><div class="log-empty__text">暂无操作日志</div></div>';
      return;
    }

    list.innerHTML = logs.map(function(log, index) {
      var actionInfo = ACTION_MAP[log.action] || { text: log.action, class: 'status', icon: '📝' };
      var targetType = TARGET_MAP[log.target_type] || log.target_type || '';
      var isLast = index === logs.length - 1;

      // 格式化时间
      var time = Utils.formatDateTime(log.created_at);
      var timeAgo = Utils.timeAgo(log.created_at);

      return '<div class="log-item">' +
        '<div class="log-item__timeline">' +
          '<div class="log-item__dot log-item__dot--' + actionInfo.class + '"></div>' +
          (isLast ? '' : '<div class="log-item__line"></div>') +
        '</div>' +
        '<div class="log-item__content">' +
          '<div class="log-item__header">' +
            '<span class="log-item__action log-item__action--' + actionInfo.class + '">' +
              actionInfo.icon + ' ' + actionInfo.text +
            '</span>' +
            '<span class="log-item__user">' + Utils.escapeHtml(log.username || '系统') + '</span>' +
            (targetType ? '<span class="log-item__target">操作了' + targetType + '</span>' : '') +
          '</div>' +
          (log.detail ? '<div class="log-item__detail log-item__detail--' + actionInfo.class + '">' + Utils.escapeHtml(log.detail) + '</div>' : '') +
          '<div class="log-item__meta">' +
            '<span class="log-item__meta-item"><span class="log-item__id">#' + log.id + '</span></span>' +
            '<span class="log-item__meta-item">🕐 ' + time + '</span>' +
            '<span class="log-item__meta-item">' + timeAgo + '</span>' +
            (log.target_id ? '<span class="log-item__meta-item">ID: ' + log.target_id + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /**
   * 渲染分页
   */
  function renderPagination(total, page, pageSize) {
    var totalPages = Math.ceil(total / pageSize);
    document.getElementById('pagination-info').textContent = '第 ' + page + ' / ' + totalPages + ' 页';
    Pagination.render('pagination', page, totalPages, 'LogsPage.goToPage');
  }

  /**
   * 跳转到指定页
   */
  function goToPage(page) {
    currentPage = page;
    loadLogs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 暴露全局方法
  window.LogsPage = {
    goToPage: goToPage
  };

  document.addEventListener('DOMContentLoaded', init);
})();
