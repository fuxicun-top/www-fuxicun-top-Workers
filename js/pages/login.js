// ========================================
// 文件说明：登录页面脚本
// 文件路径：js/pages/login.js
// ========================================

(function() {
  'use strict';

  function init() {
    // 已登录则跳转
    if (Auth.isLoggedIn()) {
      var redirect = Utils.getUrlParam('redirect') || '/';
      window.location.href = redirect;
      return;
    }

    // 初始化 Turnstile
    initTurnstile();

    // 绑定表单提交
    document.getElementById('login-form').onsubmit = function(e) {
      e.preventDefault();
      handleLogin();
    };
  }

  function initTurnstile() {
    var container = document.getElementById('turnstile-container');
    if (!container) return;

    // 检测是否为本地开发环境
    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' || hostname === '127.0.0.1' ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

    // 显示加载中提示
    container.innerHTML = '<div class="turnstile-loading">⏳ 人机验证加载中...</div>';

    function renderWidget() {
      if (window.turnstile) {
        try {
          container.innerHTML = ''; // 清空加载提示
          turnstile.render(container, {
            sitekey: CONFIG.TURNSTILE_SITE_KEY,
            callback: function(token) {
              window._turnstileToken = token;
              container.classList.add('turnstile-success');
              container.classList.remove('turnstile-error');
            },
            'error-callback': function() {
              showTurnstileError(container, '人机验证加载失败');
            },
            'expired-callback': function() {
              window._turnstileToken = null;
              Toast.warning('验证已过期，请重新验证');
              resetTurnstile();
            }
          });
        } catch (e) {
          console.warn('Turnstile加载失败:', e);
          if (isLocal) {
            container.style.display = 'none';
          } else {
            showTurnstileError(container, '人机验证加载失败');
          }
        }
      } else if (isLocal) {
        container.style.display = 'none';
      } else {
        showTurnstileError(container, '人机验证脚本加载超时');
      }
    }

    // 等待 Turnstile 脚本加载完成
    if (window.turnstile) {
      renderWidget();
    } else {
      var timer = setInterval(function() {
        if (window.turnstile) {
          clearInterval(timer);
          renderWidget();
        }
      }, 200);
      // 10秒后停止等待
      setTimeout(function() {
        clearInterval(timer);
        if (!window.turnstile) {
          renderWidget(); // 会显示超时错误
        }
      }, 10000);
    }
  }

  // 显示 Turnstile 错误和重试按钮
  function showTurnstileError(container, message) {
    container.innerHTML =
      '<div class="turnstile-error">' +
        '<span class="turnstile-error__icon">⚠️</span>' +
        '<span class="turnstile-error__text">' + message + '</span>' +
        '<button class="turnstile-retry" onclick="location.reload()">点击重试</button>' +
      '</div>';
  }

  async function handleLogin() {
    var form = document.getElementById('login-form');
    var data = Form.getData(form);

    // 验证
    var rules = {
      username: { required: true, message: '请输入用户名或手机号' },
      password: { required: true, message: '请输入密码' }
    };

    var errors = Form.validate(rules, data);
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-login');
    Form.setLoading(btn, true);

    try {
      var postData = {
        username: data.username,
        password: data.password
      };

      // Turnstile token（本地开发环境自动使用测试 token）
      var hostname = window.location.hostname;
      var isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' ||
        /^192\.168\.\d+\.\d+$/.test(hostname) ||
        /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);
      postData.turnstile_token = window._turnstileToken || (isLocalDev ? 'XXXX.DUMMY.TOKEN.XXXX' : null);

      var result = await API.post('/auth/login', postData);

      if (result.success) {
        Storage.set('token', result.data.token);
        Storage.setObject('user', result.data.user);
        Toast.success('登录成功');

        var redirect = Utils.getUrlParam('redirect') || '/';
        setTimeout(function() {
          window.location.href = redirect;
        }, 500);
      } else {
        Toast.error(result.message || '登录失败');
        resetTurnstile();
      }
    } catch (e) {
      Toast.error(e.message || '登录失败');
      resetTurnstile();
    } finally {
      Form.setLoading(btn, false);
    }
  }

  function resetTurnstile() {
    window._turnstileToken = null;
    var container = document.getElementById('turnstile-container');
    if (window.turnstile && container) {
      try {
        turnstile.reset();
        container.classList.remove('turnstile-success', 'turnstile-error');
      } catch (e) {
        // 重置失败，重新渲染
        initTurnstile();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
