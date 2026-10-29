#!/bin/bash
#
# 把本地已完成的同步成果推送到 GitHub。
#
# 前置条件（需要你本人操作，本机没有 GitHub 凭据）：
#   1. 删除旧 fork：https://github.com/timmyz/TrguiNG/settings
#      → Danger Zone → Delete this repository
#   2. 重新 fork：https://github.com/openscopeproject/TrguiNG
#      → 右上角 "Fork" 按钮（这会让 timmyz/TrguiNG 直接挂在根仓库下）
#   3. 配置 git 凭据（任选其一）：
#        - git config --global credential.helper osxkeychain
#          然后推送时输入 GitHub 用户名 + Personal Access Token（需 repo 权限）
#        - 或安装 gh 后执行：gh auth login && gh auth setup-git
#
# 用法：ci/publish.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

REMOTE="${REMOTE:-origin}"
REPO="timmyz/TrguiNG"

echo "==> 目标仓库: ${REMOTE} (${REPO})"

echo "==> 校验远端可达且已重新 fork"
if ! git ls-remote --exit-code "${REMOTE}" HEAD >/dev/null 2>&1; then
    echo "!! 无法访问 ${REMOTE}，请先完成重新 fork 与凭据配置" >&2
    exit 1
fi

echo "==> 当前远端已有的分支:"
git ls-remote --heads "${REMOTE}" | awk '{print "    " $2}' || true

echo "==> 推送 master（跟踪上游 master）"
git push --force "${REMOTE}" master:master

echo "==> 推送 zh（汉化版主分支）"
git push --force "${REMOTE}" zh:zh

echo "==> 推送旧版存档分支（保留汉化版硬编码时代的历史）"
git push --force "${REMOTE}" archive/zh-hardcoded-20240607:archive/zh-hardcoded-20240607

echo "==> 推送 dev（若上游有保留价值）"
git push --force "${REMOTE}" dev:dev 2>/dev/null || echo "    （跳过：本地无 dev 分支）"

echo "==> 完成。推送后的分支："
git ls-remote --heads "${REMOTE}" | awk '{print "    " $2}'

cat <<EOF

后续可选动作：
  1. 在 ${REPO} 仓库设置里把默认分支改为 zh
  2. 把 openscope 作为 upstream 远端加上，便于以后同步：
       git remote add openscope https://github.com/openscopeproject/TrguiNG.git
       git fetch openscope && git merge openscope/master
  3. 把构建好的 zip 发到 jayzcoder/TrguiNG 的 releases（那是汉化版主发布渠道）
EOF
