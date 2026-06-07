// ========================================
// 文件说明：理学文化页面视频播放器（图片框内播放，三级降级）
// 文件路径：js/pages/culture-video.js
// ========================================

var CultureVideo = (function() {
  'use strict';

  // 视频源（按优先级排列：在线CDN → R2优选域名 → 本地静态文件）
  var videoSources = [
    // 'https://your-cdn-url/zhoudunyi.mp4',  // 在线链接（待CDN托管后填入）
    'https://assets.fuxicun.top/videos/zhoudunyi.mp4',
    '/videos/zhoudunyi.mp4'
  ].filter(function(s) { return s; });

  var LOAD_TIMEOUT = 8000; // 每个源等待 8 秒
  var isPlaying = false;

  function play() {
    var container = document.querySelector('.video-trigger');
    if (!container || isPlaying) return;

    isPlaying = true;
    var img = container.querySelector('img');
    var overlay = container.querySelector('.video-trigger__overlay');

    // 创建 video 元素
    var video = document.createElement('video');
    video.controls = true;
    video.preload = 'metadata';
    video.playsInline = true;
    video.style.width = '100%';
    video.style.display = 'block';
    video.style.borderRadius = 'inherit';

    // 隐藏图片和播放按钮，显示视频
    if (img) img.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    container.appendChild(video);

    // 三级降级加载
    trySource(video, 0);
  }

  function trySource(video, index) {
    if (index >= videoSources.length) {
      isPlaying = false;
      return;
    }

    var loaded = false;
    var timer = null;

    // 成功加载元数据 → 取消超时，开始播放（只需前几KB，不需要下载完）
    video.onloadedmetadata = function() {
      if (loaded) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      video.play().catch(function() {});
    };

    // 加载错误 → 尝试下一个源
    video.onerror = function() {
      if (loaded) return;
      loaded = true;
      if (timer) clearTimeout(timer);
      trySource(video, index + 1);
    };

    // 设置 src 自动开始加载（不要手动调用 load()）
    video.src = videoSources[index];

    // 超时 → 尝试下一个源
    timer = setTimeout(function() {
      if (!loaded) {
        loaded = true;
        video.onerror = null;
        video.onloadedmetadata = null;
        trySource(video, index + 1);
      }
    }, LOAD_TIMEOUT);
  }

  return {
    play: play
  };
})();
