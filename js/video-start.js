/*
 * Shared background-video starter for the landing and menu pages.
 *
 * Usage: <video data-bg-video ...> plus <script src=".../js/video-start.js"></script>
 * at the end of <body>.
 *
 * - Forces muted / inline / loop so iOS Safari allows autoplay.
 * - Tries muted autoplay. If play() rejects, or the video is still not
 *   playing after 1.5 s (iOS Low Power Mode), shows a small "Tap to play"
 *   button. Any tap on the page also starts the video.
 * - Resumes the video when the page comes back (bfcache, app switch).
 *
 * <video data-bg-video="manual"> is only prepared, not started; the page
 * starts it itself with BgVideo.play(video) from a tap (used by index.html).
 */
(function () {
  "use strict";

  var START_TIMEOUT_MS = 1500;

  function prepare(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("loop", "");
    video.setAttribute("preload", "auto");
  }

  function isPlaying(video) {
    return !video.paused && !video.ended && video.readyState > 2;
  }

  // Never throws; resolves true if playback started.
  function play(video) {
    try {
      var p = video.play();
      if (p && typeof p.then === "function") {
        return p.then(function () { return true; }, function () { return false; });
      }
    } catch (e) {
      return Promise.resolve(false);
    }
    return Promise.resolve(!video.paused);
  }

  var styleAdded = false;
  function addStyle() {
    if (styleAdded) return;
    styleAdded = true;
    var css =
      ".bgv-tap{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));" +
      "transform:translateX(-50%);z-index:10000;padding:12px 22px;border:none;border-radius:24px;" +
      "background:rgba(0,0,0,.8);color:#fff;font:600 16px/1.2 Arial,sans-serif;cursor:pointer;" +
      "-webkit-tap-highlight-color:transparent}";
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function autoStart(video) {
    prepare(video);
    var button = null;

    function hideButton() {
      if (button) {
        button.remove();
        button = null;
      }
    }

    function showButton() {
      if (button || isPlaying(video)) return;
      addStyle();
      button = document.createElement("button");
      button.type = "button";
      button.className = "bgv-tap";
      button.textContent = "Tap to play";
      button.addEventListener("click", function (e) {
        e.stopPropagation();
        play(video);
        hideButton();
      });
      document.body.appendChild(button);
    }

    function tryStart() {
      if (isPlaying(video)) return;
      play(video).then(function (ok) {
        if (!ok) showButton();
      });
    }

    video.addEventListener("playing", hideButton);

    // Any tap on the page also starts the video (does not block navigation).
    ["touchstart", "pointerdown", "click"].forEach(function (ev) {
      document.addEventListener(ev, function () {
        if (!isPlaying(video)) play(video);
      }, { passive: true, capture: true });
    });

    // Resume after back/forward cache or returning to the tab.
    window.addEventListener("pageshow", tryStart);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) tryStart();
    });

    tryStart();
    setTimeout(function () {
      if (!isPlaying(video)) showButton();
    }, START_TIMEOUT_MS);
  }

  window.BgVideo = { prepare: prepare, play: play, autoStart: autoStart };

  var videos = document.querySelectorAll("video[data-bg-video]");
  for (var i = 0; i < videos.length; i++) {
    if (videos[i].getAttribute("data-bg-video") === "manual") {
      prepare(videos[i]);
    } else {
      autoStart(videos[i]);
    }
  }
})();
