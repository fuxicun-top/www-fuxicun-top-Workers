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

    // 防止重复初始化
    if (container._turnstileInit) return;
    container._turnstileInit = true;

    // 检测是否为本地开发环境
    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' || hostname === '127.0.0.1' ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

    // 使用隐式渲染：Turnstile 会自动查找 cf-turnstile class 的元素
    // 设置回调函数
    window.turnstileCallback = function(token) {
      window._turnstileToken = token;
    };

    window.turnstileErrorCallback = function() {
      showTurnstileError(container, '人机验证加载失败');
    };

    window.turnstileExpiredCallback = function() {
      window._turnstileToken = null;
      Toast.warning('验证已过期，请重新验证');
    };

    // 等待 Turnstile 脚本加载完成
    function waitForTurnstile() {
      if (window.turnstile) {
        // Turnstile 已加载，它会自动渲染 cf-turnstile 元素
        // 检查是否已经有 token（隐式渲染完成）
        setTimeout(function() {
          var response = container.querySelector('[name="cf-turnstile-response"]');
          if (response && response.value) {
            window._turnstileToken = response.value;
          }
        }, 2000);
      } else if (isLocal) {
        container.style.display = 'none';
      } else {
        // 继续等待
        setTimeout(waitForTurnstile, 200);
      }
    }

    waitForTurnstile();
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
        // 重置失败，清除标记后重新初始化
        container._turnstileInit = false;
        initTurnstile();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
