# 更新日志

本文件记录版本之间的变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增

- 顶部导航下拉菜单新增「彬冷的心」入口，点开是一张固定照片，进入即播放《777 WOES》（MULA SAKEE）并单曲循环，点击任意处返回。

## [0.2.0] - 2026-11-24

这一版集中在**首屏速度、请求次数和移动端兼容**，界面结构没有改动。

### 性能

- **只读接口内存缓存**：`/personalized`、`/song/detail`、`/song/url`、`/lyric`、`/playlist/detail` 等 15 个接口接入内存缓存（30 秒 ~ 30 分钟），任何写操作成功后整体失效。
- **缓存命中率修复**：缓存键不再包含 `timestamp` 这类每次都变的参数；带 `timestamp` 的请求视为“强制刷新”（不读缓存但写回）。歌单详情此前每次进入都重拉约 950KB，现在 60 秒内复用。
- **发现页真正受益**：补上 `/top/playlist` 白名单（此前只写了 `/toplist`，发现页从未命中过缓存）。
- **歌词请求去重**：播放器与歌词页并发调用时只发一次 `/lyric`（原来发两次）。
- **恢复按路由拆包**：移除 `LimitChunkCountPlugin({ maxChunks: 3 })`，首屏只加载 `vendor + index`，其余页面按需加载。
- **歌词页按需加载**：改为首次点开才挂载，并从首屏预取中排除；没打开过歌词时不再下载/执行这 33KB。
- **播放地址并行获取**：`/song/detail` 与 `/song/url` 并行发起（实测相差 2–13ms），下一首预取同样并行。
- **PWA 运行时缓存**：封面图 CacheFirst（600 条 / 30 天），字体 CacheFirst（30 条 / 365 天）。
- **滚动性能**：滚动条位置计算合并到 `requestAnimationFrame`，值未变化不触发重渲染。
- **播放进度落盘**：`localStorage` 从每秒写改为每 5 秒写一次，并在 `pagehide` 时补写。
- **资源提示**：`public/index.html` 增加 7 条网易云 CDN 的 `dns-prefetch`；字体只保留 woff2。

### 修复

- 首页 `show` 初始改为 `true` 后，加载进度条条件恒为假，请求较慢时没有任何加载反馈。
- 设置页“清除歌曲缓存”未清理新增的接口内存缓存，清完后仍可能读到最长 30 分钟的旧数据。
- 点赞/取消点赞是 GET 请求，走不到“非 GET 清空缓存”的规则，现在显式失效。
- `dailyRecommendPlaylist` 把整个参数对象嵌套进了 `params` 字段。
- `likelist` 的 `uid` 被序列化成了 `{"uid":...}` 字符串。
- 歌词页重复的 `height: 100dvh` 声明。

### 兼容性

- 移动端 / Safari：补充 `-webkit-backdrop-filter`、`100dvh`、`-webkit-text-size-adjust`、`-webkit-tap-highlight-color`、`touch-action`，并尊重 `prefers-reduced-motion`。
- 构建目标：`browserslist` 由 `> 1% / last 2 versions` 收窄为 Chrome/Edge 最近两版、Safari 最近三版、iOS ≥ 15。

### 已知取舍

- 歌单详情、首页等数据在 60 秒内可能来自缓存；点赞等写操作会立即清空缓存。
- 首次打开歌词页需要一次加载（本地约 100–300ms），之后不再等待。
- 弱网下首屏更快，代价是首次开歌词稍慢。

[0.2.0]: https://github.com/ggl3322/YesPlayMusic/compare/v0.1.1...v0.2.0
