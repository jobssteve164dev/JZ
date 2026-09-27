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

## Architecture Boundaries

- Three.js + Vite，车辆物理与评分、路线、灯光、3D场景、界面分离；Cloudflare Workers Assets，无数据库和登录。
- 只上传 dist；受控复用已授权 Cloudflare 部署凭据，不复制到公开仓库。

## Verification

- Default CI: `.github/workflows/ci.yml`
- Default security checks: `.github/workflows/security.yml`

## Handoff Notes

- 项目规则与原图保持；不修改 SoloMap 路线图和环节状态。
