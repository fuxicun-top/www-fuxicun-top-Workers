// ========================================
// 文件说明：注册页面脚本
// 文件路径：js/pages/register.js
// ========================================

(function() {
  'use strict';

  function init() {
    if (Auth.isLoggedIn()) {
      window.location.href = '/';
      return;
    }

    initTurnstile();

    document.getElementById('register-form').onsubmit = function(e) {
      e.preventDefault();
      handleRegister();
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
        '<button class="turnstile-retry" id="turnstile-retry-btn">重新验证</button>' +
      '</div>';

    // 绑定重试按钮 - 只重新加载 Turnstile，不刷新页面
    document.getElementById('turnstile-retry-btn').onclick = function() {
      container._turnstileInit = false;
      // 移除旧的 cf-turnstile div
      var oldWidget = container.querySelector('.cf-turnstile');
      if (oldWidget) oldWidget.remove();
      // 移除 Turnstile 创建的 iframe
      var iframes = container.querySelectorAll('iframe');
      iframes.forEach(function(f) { f.remove(); });
      // 重新初始化
      initTurnstile();
    };
  }

  async function handleRegister() {
    var form = document.getElementById('register-form');
    var data = Form.getData(form);

    var rules = {
      username: { required: true, minLength: 3, maxLength: 20, message: '用户名长度为3-20个字符' },
      phone: { required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
      password: { required: true, minLength: 8, message: '密码长度不能少于8位' },
      passwordConfirm: { required: true, confirm: 'password', message: '两次密码不一致' }
    };

    var errors = Form.validate(rules, data);

    // 用户名格式校验
    if (data.username && !errors.username) {
      if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
        errors.username = '用户名只能包含字母、数字、连字符和下划线';
      } else if (/^\d{11}$/.test(data.username)) {
        errors.username = '用户名不能为11位纯数字';
      }
    }
    if (!data.agree) {
      errors.agree = '请同意用户协议和隐私政策';
    }
    if (Object.keys(errors).length > 0) {
      Form.showErrors(errors);
      return;
    }

    Form.clearErrors();
    var btn = document.getElementById('btn-register');
    Form.setLoading(btn, true);

    try {
      var postData = {
        username: data.username,
        password: data.password,
        phone: data.phone,
        email: data.email
      };

      // Turnstile token（本地开发环境自动使用测试 token）
      var hostname = window.location.hostname;
      var isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' ||
        /^192\.168\.\d+\.\d+$/.test(hostname) ||
        /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);
      postData.turnstile_token = window._turnstileToken || (isLocalDev ? 'XXXX.DUMMY.TOKEN.XXXX' : null);

      var result = await API.post('/auth/register', postData);

      if (result.success) {
        Storage.set('token', result.data.token);
        Storage.setObject('user', result.data.user);
        Toast.success('注册成功');
        setTimeout(function() {
          window.location.href = '/';
        }, 500);
      } else {
        Toast.error(result.message || '注册失败');
        resetTurnstile();
      }
    } catch (e) {
      Toast.error(e.message || '注册失败');
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
