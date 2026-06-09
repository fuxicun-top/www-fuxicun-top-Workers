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
   * 操作类型中文映射
   */
  var ACTION_MAP = {
    'article_create': { text: '创建文章', class: 'create' },
    'article_update': { text: '更新文章', class: 'update' },
    'article_delete': { text: '删除文章', class: 'delete' },
    'article_status_change': { text: '文章状态变更', class: 'status' },
    'comment_status_change': { text: '评论审核', class: 'status' },
    'comment_delete': { text: '删除评论', class: 'delete' },
    'media_delete': { text: '删除媒体', class: 'delete' },
    'media_upload': { text: '上传媒体', class: 'create' },
    'user_delete': { text: '删除用户', class: 'delete' },
    'user_create': { text: '创建用户', class: 'create' },
    'user_update': { text: '更新用户', class: 'update' },
    'config_update': { text: '更新设置', class: 'update' },
    'banner_create': { text: '创建轮播图', class: 'create' },
    'banner_update': { text: '更新轮播图', class: 'update' },
    'banner_delete': { text: '删除轮播图', class: 'delete' },
    'category_create': { text: '创建分类', class: 'create' },
    'category_update': { text: '更新分类', class: 'update' },
    'category_delete': { text: '删除分类', class: 'delete' },
    'nav_create': { text: '创建导航', class: 'create' },
    'nav_update': { text: '更新导航', class: 'update' },
    'nav_delete': { text: '删除导航', class: 'delete' },
    'page_create': { text: '创建页面', class: 'create' },
    'page_update': { text: '更新页面', class: 'update' },
    'page_delete': { text: '删除页面', class: 'delete' },
    'database_reset': { text: '重置数据库', class: 'delete' },
    'database_clear': { text: '清空数据库', class: 'delete' }
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
  }

  /**
   * 绑定筛选事件
   */
  function bindEvents() {
    document.getElementById('filter-action').addEventListener('change', function() {
      currentAction = this.value;
      currentPage = 1;
      loadLogs();
    });
  }

  /**
   * 加载操作日志列表
   * 调用 GET /admin/logs 接口
   */
  async function loadLogs() {
    var tbody = document.getElementById('logs-tbody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">加载中...</td></tr>';

    try {
      var params = { page: currentPage, pageSize: 20 };
      if (currentAction) params.action = currentAction;

      var result = await API.get('/admin/logs', params);
      if (result.success) {
        renderLogs(result.data.list);
        renderPagination(result.data.total, result.data.page, result.data.pageSize);
      } else {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">加载失败</td></tr>';
      }
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#c62828;">加载失败: ' + e.message + '</td></tr>';
    }
  }

  /**
   * 渲染日志表格
   * @param {Array} logs - 日志数据数组
   */
  function renderLogs(logs) {
    var tbody = document.getElementById('logs-tbody');

    if (!logs || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;">暂无操作日志</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(function(log) {
      // 操作类型标签
      var actionInfo = ACTION_MAP[log.action] || { text: log.action, class: 'status' };
      var actionTag = '<span class="log-action-tag log-action-tag--' + actionInfo.class + '">' + actionInfo.text + '</span>';

      // 目标类型
      var targetType = TARGET_MAP[log.target_type] || log.target_type || '-';

      // 详情截取
      var detail = Utils.escapeHtml(log.detail || '-');
      var detailShort = detail.length > 80 ? detail.substring(0, 80) + '...' : detail;

      return '<tr>' +
        '<td>' + log.id + '</td>' +
        '<td>' + actionTag + '</td>' +
        '<td>' + Utils.escapeHtml(log.username || '系统') + '</td>' +
        '<td>' + targetType + '</td>' +
        '<td>' + (log.target_id || '-') + '</td>' +
        '<td class="log-detail-cell" title="' + detail + '">' + detailShort + '</td>' +
        '<td>' + Utils.formatDateTime(log.created_at) + '</td>' +
      '</tr>';
    }).join('');
  }

  /**
   * 渲染分页
   * @param {number} total - 总记录数
   * @param {number} page - 当前页码
   * @param {number} pageSize - 每页数量
   */
  function renderPagination(total, page, pageSize) {
    var totalPages = Math.ceil(total / pageSize);
    document.getElementById('pagination-info').textContent = '共 ' + total + ' 条日志';
    Pagination.render('pagination', page, totalPages, 'LogsPage.goToPage');
  }

  /**
   * 跳转到指定页
   * @param {number} page - 页码
   */
  function goToPage(page) {
    currentPage = page;
    loadLogs();
  }

  // 暴露全局方法
  window.LogsPage = {
    goToPage: goToPage
  };

  document.addEventListener('DOMContentLoaded', init);
})();
