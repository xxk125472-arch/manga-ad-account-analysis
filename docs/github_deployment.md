# GitHub 上传与 Pages 部署说明

本文假设你已经拥有 GitHub 账号，并在本机安装 Git。仓库内的工作流会自动测试并构建 `web/`。

## 一、上传仓库

1. 登录 GitHub，点击右上角 `+` → `New repository`。
2. 仓库名建议：`manga-ad-account-analysis`；可见性选择 Public；不要勾选自动创建 README、`.gitignore` 或 License。
3. 在项目根目录打开终端。交付 ZIP 不包含 `.git` 历史，首次先初始化，再检查状态：

```bash
git init
git status
git branch --show-current
```

如果你是通过 `git clone` 获得项目，已有 `.git`，可跳过 `git init`。

4. 如果当前分支不是 `main`，执行：

```bash
git branch -M main
```

5. 提交并关联远端（把 `<你的用户名>` 替换为真实 GitHub 用户名）：

```bash
git add .
git commit -m "feat: publish manga ad account analysis portfolio"
git remote add origin https://github.com/<你的用户名>/manga-ad-account-analysis.git
git push -u origin main
```

若已经存在 `origin`，用 `git remote -v` 检查，不要重复添加；需要改地址时使用 `git remote set-url origin ...`。

## 二、启用 GitHub Pages

1. 进入仓库 `Settings` → 左侧 `Pages`。
2. `Build and deployment` 的 Source 选择 **GitHub Actions**。
3. 进入 `Actions`，打开 `Deploy dashboard to GitHub Pages`，确认 build 与 deploy 两个任务为绿色。
4. 部署地址通常为：

```text
https://<你的用户名>.github.io/manga-ad-account-analysis/
```

首次部署可能需要数分钟。此项目的 Vite `base` 为相对路径，因此仓库子路径下的 JS、字体与 JSON 均可加载。

## 三、部署前本地检查

```bash
cd web
npm ci
npm test
npm run build
npm run preview
```

如果本地正常但线上空白：

1. 打开浏览器开发者工具 → Network，检查 `dashboard.json` 是否为 200。
2. 确认 `web/public/data/dashboard.json` 已提交。
3. 确认 Pages Source 为 GitHub Actions，不是 `/docs` 分支模式。
4. 在 Actions 日志中检查 Node 安装、测试和构建步骤。
5. 清除浏览器缓存或用隐私窗口重新打开。

## 四、更新数据后的发布流程

```bash
python scripts/run_pipeline.py
python scripts/build_notebooks.py
python scripts/execute_notebooks.py
PYTHONPATH=src python -m unittest discover -s tests -v
cd web && npm test && npm run build && cd ..
git add data/processed web/public/data images notebooks outputs
git commit -m "data: refresh anonymized analysis outputs"
git push
```

推送到 `main` 后会自动重新部署。不要提交原始未脱敏数据、`.env`、口令、Token、客户字段或本机绝对路径。

## 五、在简历中引用

建议同时放两个链接：GitHub 仓库用于展示方法与代码，Pages 地址用于快速浏览结果。简历措辞应是“搭建/设计/实现个人分析项目”，不要写成“公司上线平台”或声称未经验证的 ROI 提升。
