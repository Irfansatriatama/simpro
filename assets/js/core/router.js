/* global Router */
const Router = (() => {
  const _routes = {};
  let _defaultRoute = null;
  let _notFoundHandler = null;

  function register(hash, handler) {
    _routes[hash] = handler;
  }

  function setDefault(hash) {
    _defaultRoute = hash;
  }

  function setNotFound(handler) {
    _notFoundHandler = handler;
  }

  function navigate(hashPath) {
    window.location.hash = hashPath;
  }

  function getParams() {
    const hash = window.location.hash.replace(/^#/, '');
    const [path, qs] = hash.split('?');
    const params = {};
    if (qs) {
      qs.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
    return { path, params };
  }

  function handle() {
    const { path, params } = getParams();
    const route = path || _defaultRoute;

    if (_routes[route]) {
      _routes[route](params);
    } else if (_notFoundHandler) {
      _notFoundHandler(route, params);
    }
  }

  function init() {
    window.addEventListener('hashchange', handle);
    handle(); // Initial load
  }

  // Helper: build hash URL with params
  function buildUrl(path, params = {}) {
    const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return `#${path}${qs ? '?' + qs : ''}`;
  }

  return { register, setDefault, setNotFound, navigate, getParams, handle, init, buildUrl };
})();
