import router from '@/router';
import { doLogout, getCookie } from '@/utils/auth';
import axios from 'axios';

let baseURL = '';
// Web 和 Electron 跑在不同端口避免同时启动时冲突
if (process.env.IS_ELECTRON) {
  if (process.env.NODE_ENV === 'production') {
    baseURL = process.env.VUE_APP_ELECTRON_API_URL;
  } else {
    baseURL = process.env.VUE_APP_ELECTRON_API_URL_DEV;
  }
} else {
  baseURL = process.env.VUE_APP_NETEASE_API_URL;
}

const service = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
});

/**
 * 只读接口的短期内存缓存。
 *
 * 目的：页面之间来回切换（发现 → 歌单 → 发现）、keep-alive 页面重新激活时，
 * 不再重复请求同样的数据，直接复用上次结果。
 *
 * 安全性：
 * - 只对白名单里的 GET 生效，写接口一律不走缓存
 * - 任何一次写操作（非 GET）成功后整体失效，避免"点了喜欢列表还是旧的"
 * - 缓存键包含完整 params（含 cookie / realIP），不会串号
 */
const cacheRules = [
  // [接口前缀, 缓存有效期 ms]
  ['/personalized', 30 * 1000],
  ['/recommend/songs', 30 * 1000],
  ['/toplist', 5 * 60 * 1000],
  ['/album/new', 10 * 60 * 1000],
  ['/playlist/detail', 60 * 1000],
  ['/song/detail', 10 * 60 * 1000],
  ['/lyric', 30 * 60 * 1000],
  ['/search', 60 * 1000],
  ['/cloudsearch', 60 * 1000],
  ['/user/playlist', 60 * 1000],
  ['/artists', 5 * 60 * 1000],
  ['/artist/detail', 5 * 60 * 1000],
  ['/mv/detail', 5 * 60 * 1000],
  ['/song/url', 60 * 1000],
];

const memoryCache = new Map();
const CACHE_MAX_ENTRIES = 200;

function matchRule(url = '') {
  return cacheRules.find(([prefix]) => url.startsWith(prefix));
}

function isCacheable(config) {
  if (String(config.method || 'get').toLowerCase() !== 'get') return false;
  return Boolean(matchRule(config.url));
}

function cacheKeyOf(config) {
  const params = config.params || {};
  const parts = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`);
  return `${config.url}?${parts.join('&')}`;
}

function makeResponse(data, config) {
  return {
    data,
    status: 200,
    statusText: 'OK (cache)',
    headers: {},
    config,
    request: {},
  };
}

function dropOverflowEntries() {
  if (memoryCache.size <= CACHE_MAX_ENTRIES) return;
  const overflow = memoryCache.size - CACHE_MAX_ENTRIES;
  let index = 0;
  for (const key of memoryCache.keys()) {
    if (index++ >= overflow) break;
    memoryCache.delete(key);
  }
}

function clearCache() {
  memoryCache.clear();
}

service.clearCache = clearCache;

service.interceptors.request.use(function (config) {
  if (!config.params) config.params = {};
  if (baseURL.length) {
    if (
      baseURL[0] !== '/' &&
      !process.env.IS_ELECTRON &&
      getCookie('MUSIC_U') !== null
    ) {
      config.params.cookie = `MUSIC_U=${getCookie('MUSIC_U')};`;
    }
  } else {
    console.error("You must set up the baseURL in the service's config");
  }

  if (!process.env.IS_ELECTRON && !config.url.includes('/login')) {
    config.params.realIP = '211.161.244.70';
  }

  // Force real_ip
  const enableRealIP = JSON.parse(
    localStorage.getItem('settings')
  ).enableRealIP;
  const realIP = JSON.parse(localStorage.getItem('settings')).realIP;
  if (process.env.VUE_APP_REAL_IP) {
    config.params.realIP = process.env.VUE_APP_REAL_IP;
  } else if (enableRealIP) {
    config.params.realIP = realIP;
  }

  const proxy = JSON.parse(localStorage.getItem('settings')).proxyConfig;
  if (['HTTP', 'HTTPS'].includes(proxy.protocol)) {
    config.params.proxy = `${proxy.protocol}://${proxy.server}:${proxy.port}`;
  }

  if (isCacheable(config)) {
    const key = cacheKeyOf(config);
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.ts < matchRule(config.url)[1]) {
      // 命中缓存：直接把上次的结果当作响应返回，不发网络请求
      config.__fromCache = true;
      config.adapter = () => Promise.resolve(makeResponse(cached.data, config));
    }
  }

  return config;
});

service.interceptors.response.use(
  response => {
    const res = response.data;
    const config = response.config || {};

    if (isCacheable(config) && !config.__fromCache) {
      memoryCache.set(cacheKeyOf(config), { data: res, ts: Date.now() });
      dropOverflowEntries();
    }

    // 任何写操作都会让只读缓存整体失效
    if (String(config.method || 'get').toLowerCase() !== 'get') {
      clearCache();
    }

    return res;
  },
  async error => {
    /** @type {import('axios').AxiosResponse | null} */
    let response;
    let data;

    if (error === 'TypeError: baseURL is undefined') {
      response = error;
      data = error;
      console.error("You must set up the baseURL in the service's config");
    } else if (error.response) {
      response = error.response;
      data = response.data;
    }

    // GET 请求在网络层直接失败时（无响应）快速重试一次，
    // 缓解移动网络切换、休眠唤醒后首次请求的偶发失败
    const retryable =
      error &&
      error.config &&
      !error.response &&
      String(error.config.method || 'get').toLowerCase() === 'get' &&
      !error.config.__retried;
    if (retryable) {
      await new Promise(resolve => setTimeout(resolve, 350));
      return service({ ...error.config, __retried: true });
    }

    if (
      response &&
      typeof data === 'object' &&
      data.code === 301 &&
      data.msg === '需要登录'
    ) {
      console.warn('Token has expired. Logout now!');

      // 登出帳戶
      doLogout();
      clearCache();

      // 導向登入頁面
      if (process.env.IS_ELECTRON === true) {
        router.push({ name: 'loginAccount' });
      } else {
        router.push({ name: 'login' });
      }
    }

    return Promise.resolve(undefined);
  }
);

export default service;
