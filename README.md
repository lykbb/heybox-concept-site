# 小黑盒桌面宣传站（概念样稿）

原生 HTML、CSS、JavaScript 制作的五段式单页展示。打开 `index.html` 即可预览；如需检验浏览器视频加载和滚动行为，可在本目录启动本地静态服务器：

```sh
python3 -m http.server 8765
```

然后访问 `http://localhost:8765/`。页面以桌面端为主，社区构图和联系方式仍为首版占位内容。修改首屏视频时，将新文件放入 `assets/` 并更新 `index.html` 中 `<video>` 的路径。

视觉参考：[KPR](https://www.kprverse.com/) 的超大粗字与错位排版。首屏标题优先调用本机已安装的「优设标题黑」，其他设备会使用系统粗体回退；未将字体文件打包进网站。第三段的图标散开与逐行文字参考用户提供的 [Mobbin](https://mobbin.com/) 页面截图；第二段与第三段之间采用约 800ms 的双向整屏切换。切屏时图标错开散布四周，四行文案在约 1.5 秒内自动依次出现；之后图标独立缓慢漂浮，离开该段即暂停，并兼容系统“减少动态效果”设置。

首屏「玩家主场」参照用户提供的 FoldText 与 TrueFocus 效果，用原生 CSS 和 JavaScript 实现两组词依次折叠入场，之后自动聚焦、四角框移动和鼠标悬停切换；「玩家」使用绿色强调，「主场」使用暖白色。系统开启“减少动态效果”时停用入场动画和自动切换。未引入 React、Vue、GSAP 或动画依赖。优设官方的[字体授权说明](https://www.uisdc.com/font-empower)将网页字体文件嵌入列为单独的授权场景，正式上线前如需向所有访客提供这款字体，应先确认相应授权。

## 素材与内容说明

- `assets/hero-temp.mp4`：临时视频，来自 [Pixabay / spacetrip](https://pixabay.com/videos/videogame-space-science-fiction-154881/)，按 [Pixabay Content License](https://pixabay.com/service/license-summary/) 用于概念样稿；后续替换为用户录屏。
- `assets/game-logos/`：第三段现用的 15 张游戏原图直接取自 Steam 官方素材服务器，其中 5 张为社区 App Icon，10 张为带背景的 Library 封面；此前的透明字标仍保留在目录内。对应 Steam 商店游戏为 [Counter-Strike 2](https://store.steampowered.com/app/730/)、[Dota 2](https://store.steampowered.com/app/570/)、[艾尔登法环](https://store.steampowered.com/app/1245620/)、[博德之门 3](https://store.steampowered.com/app/1086940/)、[星露谷物语](https://store.steampowered.com/app/413150/)、[幻兽帕鲁](https://store.steampowered.com/app/1623730/)、[Apex 英雄](https://store.steampowered.com/app/1172470/)、[绝地求生](https://store.steampowered.com/app/578080/)、[赛博朋克 2077](https://store.steampowered.com/app/1091500/)、[哈迪斯](https://store.steampowered.com/app/1145360/)、[泰拉瑞亚](https://store.steampowered.com/app/105600/)、[空洞骑士](https://store.steampowered.com/app/367520/)、[Among Us](https://store.steampowered.com/app/945360/)、[Warframe](https://store.steampowered.com/app/230410/)、[无人深空](https://store.steampowered.com/app/275850/)。这些图像只表示游戏，不表示小黑盒提供其 MOD 下载或管理。
- `assets/palworld.jpg`、`assets/isaac.jpg`、`assets/spiderman.jpg`：原 MOD 卡片的 Steam 商店封面素材，移除卡片后未在页面使用；保留原文件。来源：[幻兽帕鲁](https://store.steampowered.com/app/1623730/)、[以撒的结合：重生](https://store.steampowered.com/app/250900/)、[漫威蜘蛛侠：重制版](https://store.steampowered.com/app/1817070/)。
- 游戏数据、加速和商城画面是网页绘制的概念示意，不是小黑盒真实界面，也不表示实时战绩、网络性能或价格。
- 这是非官方作品集概念样稿。产品能力与获取入口应以[小黑盒官网](https://xiaoheihe.cn/)为准。
