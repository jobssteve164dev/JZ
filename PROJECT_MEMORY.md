# PROJECT_MEMORY.md

This file stores stable project facts future agents should reuse. Do not paste run logs, prompts, terminal output, or one-off debugging notes here.

## Project Identity

- Name: JZ
- Type: Research / experiment
- Users: 准备吴江科目三 C2 自动挡考试的学员。
- Current stage: 三条路线、灯光与手机安装已实现并通过本地验收；发布状态以 Cloudflare 为准。

## Stable Decisions

- 用户明确选择 C2；每条模拟路线 3000m，15分钟为参考而非超时淘汰。
- 路线来源为 input 中一/九/十号线三图；十号线手写标注优先。第四张灯光图标题为观山，保留来源而不称吴江官方题库。
- 手机需要可安装、全屏横屏和触摸驾驶；不支持强制锁屏的平台引导用户横放。
- 单练灯光为十九条乱序；每条路线前从情景口令中随机抽五条且不重复，三种模式均如此。仿真灯杆旋钮、推拉杆身和独立双闪开关直接改变灯光状态，自动判题。
- 旋钮触摸、鼠标与键盘均采用上下切换；练习不限作答时间，模拟口令播完后五秒判题；判题后至少等待五秒才播下一题。
- 三维车灯与驾驶状态同步：前后及侧面转向灯、双闪、示廓/尾灯、远近光及脚刹灯。驾驶工具栏的灯光入口复用同一仿真灯杆，照明状态独立于起步前题库成绩。
- 三图逐段车道定义与独立核对记录见 docs/LANE_ALIGNMENT.md；道路标线与判定共用尺寸，检查实际车道、压线、隔离带、变道目标及超车回位，不能用贴合参考轨迹代替车道验收。
- 跟随学习通过原有物理驾驶控制沿路线自动行驶，播报所有考点和操作提示（包括学校与公交站），不记录模拟考试分数。

## Architecture Boundaries

- Three.js + Vite，车辆物理与评分、路线、灯光、3D场景、界面分离；Cloudflare Workers Assets，无数据库和登录。
- 只上传 dist；受控复用已授权 Cloudflare 部署凭据，不复制到公开仓库。

## Verification

- Default CI: `.github/workflows/ci.yml`
- Default security checks: `.github/workflows/security.yml`

## Handoff Notes

- 项目规则与原图保持；不修改 SoloMap 路线图和环节状态。
