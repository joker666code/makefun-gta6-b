# REPORT — Solmaris (GTA6-B, lane7)

**竞赛：** gta6-01 Make GTA 6，奖金 $1666，截止 2026-11-24 15:00 UTC
**完成时间：** 2026-11-21 15:40 CST
**工作目录：** `/home/hatch/workspace/makefun/workers/lane7-gta6-b/`

## v2 — 2026-11-21（本次更新，录制 01a1fd23-69d2-753c-8e3f-920e5b9c9869 下由本 agent 手写）

v1 的 5 任务、通缉、存档全部保留，v2 在画面、任务深度、手感三条线上加东西：

- **画面：** 全天时钟（黎明/白天/日落/夜晚，240 秒一整天，日落整城变橙、夜晚亮窗路灯车灯）；新地标——机场跑道、市中心喷泉广场、木质栈桥、码头停船、海滩遮阳伞；撞车火花、破损车辆冒烟、氮气火焰。
- **任务深度：** 支线活（T 接单，两个地名之间 50 秒送客，剩余时间折小费，可无限重复，小地图绿 `$` 标记）；4 星以上警察设路障封路 + PIT 顶撞战术；终章胜利画面显示终身统计（总收入/支线完成数/偷车数）。
- **手感：** 氮气（N，油箱 100，烧完慢慢回满，HUD 有氮气条）；手刹漂移（Space，甩尾+胎痕+轮胎烟+打滑音）；跑车（快、滑、有尾翼）与卡车（慢、硬、有货斗）各自手感；喇叭（H，附近行人受惊，堵车时交通车也会鸣笛）；追逐音乐（3 星以上切更快更紧的贝斯线）；开关车门音效。
- **存档 v2：** 存档键升为 `solmaris.save.v2`，新增时钟与终身统计（v1 存档不带这些字段，读不到即全新开始，不会坏档）。
- **截图：** 4 张全部重拍，2 号改为日落氮气追逐（跑车+火焰+橙天）；`shots.json` 的 query 加 `&clock=` 定格时间；`?clock=day|sunset|night|dawn` 自由玩时也可定格时间。
- **视觉大升级（用户 16:17 意见后追加，7 点全做）：** ①车辆：轮胎（前轮随转向）、车顶/车窗/前后灯、车身渐变、刹车尾灯、车型区分（跑车尾翼+条纹、出租格纹+顶灯、卡车货斗、警车闪烁灯条+地面红蓝反光），车身转角平滑过渡；②城市：楼体按日光方向投影、屋顶纹理+接缝+空调箱、窗户昼夜两种状态、霓虹招牌（HOTEL/24H MART/CINEMA 等）、斑马线+停车线+路缘、草地细节、海滩/海水渐变+流动波光；③光影：车灯渐变光锥、路灯径向光晕、枪口/爆炸闪光、车辆柔和椭圆影、夜景暗角+日间阳光；④角色动画：行人/主角行走循环（双脚交替、手臂摆动、朝向），尾气、刹车痕、漂移烟，枪口火光+弹壳，撞击碎片+震屏；⑤粒子特效：雨（阵雨随机来去，夜景截图定格雨夜）、爆炸火光、警灯地面反射、水面反光；⑥HUD/菜单：统一金底深蓝玻璃拟态、Arial Black 展示字体、标题字距、提示胶囊；⑦截图全部重拍（见下）。
- **修掉一个 v1 遗留 bug：** 停放的车开局就被交通 AI 开走，导致 Safehouse 门口的车不等玩家就跑了、玩家追上的常是行驶中的车（偷车+1 星、警车围攻、车还可能一路开出路网撞毁）。v2 起停放的车停着不动直到被偷；偏离路网的交通车立刻回正。
- **升级前对照：** `before-visual/`（本目录下，不进仓库、不提交）：1-start.jpg / 2-chase.jpg / 3-mission.jpg / 4-night.jpg，与升级后 `screenshots/` 同名一一对照。
- **16 文件作者归属：** v2 在录制开始后由本 agent 逐行改写了全部 16 个计入文件（game/index.html、game/src/config.js、city.js、audio.js、input.js、entities.js、traffic.js、missions.js、render.js、main.js、shots.js、save.js、main.ts、shots.json、README.md、REPORT.md），vendor/makefun-game.ts 与 LICENSE 未动。

（以下为 v1 报告原文，保留作记录。）

## 方案概述

原创 2D 俯视角开放世界犯罪游戏 **Solmaris**（阳光海滨城市），主角 Danny Vega（前车手重出江湖）。与 lane6 可能的 3D 路线区分开，本 lane 坚持做 2D 俯视角。全部代码由本构建 agent 用 write/edit 工具逐行手写，未复制粘贴任何代码；未使用任何模型输出代码。

- **城市：** 种子化程序生成（3400×2600），道路网格、街区建筑、中央公园、西侧海滩+海洋、路灯、树木、路边停放车辆；出生点 Safehouse 旁固定停一辆可偷的车，保证任务 1 能立刻开始。
- **步行与开车：** WASD 步行/跑步，E 上下车/偷车，街机式驾驶物理（加速、转向、抓地、撞建筑减速掉血）。
- **交通与行人：** 16 辆交通车沿道路行驶、遇前车减速、路口随机转向；26 名行人沿人行道散步，枪声附近会逃跑。
- **通缉与警察：** 0–5 星；偷车、打人、开枪、撞毁警车都会涨星；警车按星级数量追捕、撞击、开枪；步行被警车贴身 2.2 秒 → Busted（罚款 $200，送回 Safehouse）；生命归零 → Wasted；躲藏 14 秒后每 6 秒降一星。
- **任务链（5 个）：** 1 教学驾驶（偷车→开到 Marina）；2 出租载客（接客→送 Airfield）；3 运货（Warehouse 9 取包→送 Old Cannery，半路 2 星）；4 警匪追逐逃脱（3 星下存活→甩掉警察→回 Safehouse）；5 终章抢劫逃亡（Central Bank 取钱→4 星逃往 Sunset Pier）。任务奖励 $150/$250/$500/$400/$1500，全部完成出胜利画面。
- **战斗：** 鼠标瞄准、点击射击（手枪，12 发弹匣、R 换弹、弹药储备），F 拳击；现金/弹药/生命拾取物。
- **HUD + 小地图：** 生命条、金钱、通缉星、当前任务目标、车速、车辆名、弹药、任务计数、实时小地图（目标、警车、视野框）。
- **菜单/存档/声音：** 开始界面、暂停、Busted/Wasted/胜利画面；localStorage 自动存档（金钱、任务进度、生命、弹药、位置）；WebAudio 全合成音效（引擎、警笛、枪声、撞击、拾取）+ 贝斯/踩镲音乐循环；昼夜模式（夜晚亮窗、路灯、车灯）。

## 文件清单（2441 行，不含 vendor）

| 文件 | 行 | 内容 |
| --- | --- | --- |
| `game/index.html` | 74 | canvas + HUD DOM + 小地图 canvas，只引用本地文件 |
| `game/src/config.js` | 135 | 调优参数、配色、种子 RNG、几何 helper |
| `game/src/city.js` | 160 | 程序化城市生成、道路/碰撞查询 |
| `game/src/audio.js` | 129 | WebAudio 合成音效与音乐循环 |
| `game/src/input.js` | 100 | 键盘 + 鼠标 |
| `game/src/entities.js` | 153 | 玩家/车辆/行人/警察、驾驶物理 |
| `game/src/traffic.js` | 323 | 交通与行人 AI、通缉、警察 AI、射击判定 |
| `game/src/missions.js` | 207 | 五任务故事链、目标、剧情文本 |
| `game/src/render.js` | 500 | 相机、世界绘制、HUD、小地图、各画面 |
| `game/src/main.js` | 482 | 启动、定步长循环、状态机、上下车/战斗/存档 |
| `game/src/shots.js` | 85 | `?shot=` 决定性截图场景 |
| `game/src/save.js` | 51 | localStorage 存档读写 |
| `main.ts` | 42 | 仅重写了头部注释（GTA6-B 说明），复制 + buildDossier 逻辑保持 starter 原样 |
| `shots.json` | — | 4 条目：1-start / 2-chase / 3-mission / 4-night（`?shot=…&seed=1`） |
| `README.md` | — | make.fun 徽章三行、玩法、控制、文件说明 |
| `vendor/makefun-game.ts` | — | **保持原样**，已与 kit 内 starter 副本 `cmp` 比对，字节相同 |
| `serve.ts`、`LICENSE` | — | 保持 starter 原样（MIT） |

已删除的 starter 文件：`game/src/world.js`、`game/src/random.js`（Block Dodger 的规则/RNG，不再被引用）、`screenshots/` 旧 3 张图。

## 本地验证结果

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| JS 语法 | `node --check game/src/*.js`（11 个文件） | 全部通过 |
| 浏览器实测 | Playwright + headless Chromium（`~/.cache/ms-playwright/chromium-1255`），`node serve.ts --port 8081` | 4 个 `?shot=` 场景均等到 `window.__shotReady`，**零 JS 报错、零失败请求**（仅首屏一次 favicon 404，已加 `<link rel="icon" href="data:,">` 消除） |
| 步行实测 | 无 `?shot=` 真实游玩：Space 开始、W 步行 2 秒 | 任务 1 目标正常显示；自动存档写入 localStorage（位置 x=610,y=13，走到北边缘被正确夹住） |
| 开车实测 | 沿路走、反复按 E 上车、W 驾驶 2.5 秒、E 下车 | 成功上车（Bison）、时速 101 km/h、下车恢复步行、零报错；中途偷了行驶中的车涨 1 星，**两辆警车随即出现追捕**，通缉/警察闭环真实跑通 |
| 碰撞修复验证 | 驾驶撞向建筑 | 玩家车不再穿墙：贴建筑角停下、掉血、警车追尾同框可见（已截图存档于 `/tmp/lane7-shots/playtest-driving.jpg`） |
| main.ts | `MAKEFUN_OUTPUT_DIR=out node main.ts` | 通过；`out/` 含 `game/`、`screenshots/`、`dossier.json`（511,274 字节 < 1.5 MiB 上限） |
| dossier 一致性 | 同样参数再跑一份 `out2`，`diff out/dossier.json out2/dossier.json` | **无差异**（dossier_matches 本地可复现） |
| 截图规格 | `file` 检查 4 张 | 全部 JPEG 1280×800（长边 1280 ≤ 1280，短边 800 ≥ 480），77–84 KiB（≤ 256 KiB） |
| 零网络请求 | `grep -rn "https?://" game/` | 无任何外部引用；游戏只引用本地文件 |
| game 规模 | `find game -type f` / `du` | 12 个文件，84,429 字节（远低于 993 文件 / 48 MiB 上限） |
| kit check | `node cli/makefun.mjs check --kit … --repo . --worktree --json` | `"ok": true`，`"failed": []`；通过：competition_open、snapshot（39 文件 / 1,380,952 字节）、license_osi（MIT）、entrypoint（main.ts / node22）；其余 transcript 类检查为 skip（录制未密封，属预期） |

**构建中发现并修复的两个 bug：**
1. `main.js` 引用了 `config.js` 未导出的 `STEP`——首轮截图 4 张全部超时报错；补加 `export const STEP = 1/60` 后重拍全部通过。
2. 实测驾驶截图显示玩家车能开上建筑屋顶——补加玩家车辆建筑碰撞（撞墙弹回 + 减速 + 掉血），复测确认车停在建筑角外、警车追捕正常。

## 录制状态

- 录制 **01a1fcfa-97a2-757f-9b70-268e0d66177c**，进程 pid **14354**，完成时确认**仍在运行**（未停止、未动过）。
- 日志：`~/.makefun/record-gta6-01-lane7.log`。
- 录制密封、muse.db 用量导出等收尾工作由父 agent 负责，本任务未碰。
- 未碰 lane6 目录、未碰 `~/.makefun/credentials`、未打印任何密钥、未新建仓库、未 push、未提交（no submit）。

## 截图情况

4 张全部真实渲染（本机 Playwright headless Chromium 跑游戏自身代码截取，未伪造/拼贴/借用）：

- `screenshots/1-start.jpg`（83,762 B）— 标题画面 + 城市 + HUD + 小地图
- `screenshots/2-chase.jpg`（78,701 B）— 红色座驾 + 两辆 PD 警车追捕、3 星通缉、$1,250、76 km/h
- `screenshots/3-mission.jpg`（77,598 B）— 任务 3 The Drop：Danny 步行在 Warehouse 9 标记点、任务联系人（黄色 !）在场
- `screenshots/4-night.jpg`（77,053 B）— 夜晚市中心驾驶：亮窗、路灯光晕、车灯、1 星通缉

截图脚本在 `/tmp/lane7-shots/shoot.js`（playwright-core + 缓存的 Chromium 1255），playtest 脚本 `playtest.js` / `drivetest.js` 同目录。

## 仓库待定事项（等用户定夺）

- **lane7 没有自己的仓库。** `joker666code/makefun-gta6` 是 lane6 的仓库，本次**没有新建仓库、没有 push**。
- `README.md` 中 `{owner}` 已写 `joker666code`，`{repo}` 暂写占位名 **`makefun-gta6-b`**；用户定下仓库名后需改 README 再提交。
- kit check 的 `repo_owner` / `repo_created_after_open` / `commit_in_repo` / `duplicate_snapshot` 四项目前为 submission 状态（仓库未建、未 push），属预期，待仓库定夺 + push 后再跑 check 确认。
- 提交需要用户另行确认；本次只做到代码完成 + 本地验证通过，**没有 submit**。

## 使用的模型

- **本次构建没有调用任何模型。** 全部 2441 行代码均为本 agent 自己用 write/edit 工具手写；只用浏览器实测与本地命令做验证，未让任何模型输出代码。
- **确认没有用过 glm-5.3-flash。** 用户 15:28 的偏好已遵守；15:33 补充与 15:37 确认的模型切换链已收到并记录在案：首选 glm-5.3（有优惠）→ glm-5.3 撞并发上限时整轮切 deepseek-v4.1-flash → deepseek 也被限流时退到四个免费模型轮换（beam-free、hy4-flash-free、iceman-contributor-free、longcat-2.5-free）→ 全都不行才暂停 10 分钟重试；若是套餐 5 小时额度用完则直接走免费模型顶着、探针每轮测额度、恢复即切回 glm-5.3；**glm-5.3-flash 不用（无优惠）**。后续如需模型辅助，将按此链执行。

## 下一步（等用户）

1. 定 lane7 仓库名（建议 `makefun-gta6-b`，或用户指定其他名），新建公开仓库（需在 2026-11-17 15:00 UTC 之后创建，满足 `repo_created_after_open`）。
2. 将本目录代码 push 到该仓库，README 的 repo 占位名同步改掉。
3. 用户确认后，由父 agent 密封录制并提交（每场每天最多 5 次、总共 10 次，只认最后一版；截止 2026-11-24 15:00 UTC）。
