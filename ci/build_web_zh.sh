#!/bin/bash
#
# 构建汉化版 Web 产物，并打包成可直接部署到 TRANSMISSION_WEB_HOME 的 zip。
#
# 产物命名沿用历史发布习惯：trguing-web-<version>-zh.zip
# 解压后目录内必须直接包含 index.html（transmission 要求 index.html 位于
# TRANSMISSION_WEB_HOME 所在目录的第一层）。
#
# 用法：
#   ci/build_web_zh.sh            # 使用 git describe 作为版本号
#   VERSION=1.5.1 ci/build_web_zh.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION="${VERSION:-$(jq -r .version package.json)}"
# 允许调用方直接传入带 -zh 后缀的版本号，避免出现 -zh-zh
case "$VERSION" in
    *-zh) BASE_VERSION="${VERSION%-zh}" ;;
    *)    BASE_VERSION="$VERSION" ;;
esac
ZIPNAME="trguing-web-${BASE_VERSION}-zh.zip"

# 「关于」弹窗显示的版本串。webpack.common.mjs 优先取 TRGUING_VERSION，
# 未设置时才回退到 `git describe`——后者在本地标签不可达时会退化成裸 SHA，
# 对终端用户毫无意义，因此这里显式注入。
# 沿用汉化版历史命名习惯：trguing-web-v<版本>-zh
export TRGUING_VERSION="${TRGUING_VERSION:-trguing-web-v${BASE_VERSION}-zh}"

echo "==> 版本号: ${BASE_VERSION}"
echo "==> 关于弹窗版本串: ${TRGUING_VERSION}"

if [ ! -d node_modules ] || [ ! -d node_modules/.bin ]; then
    echo "==> 安装依赖 (npm ci)"
    npm ci
fi

echo "==> 构建 Web 生产产物"
npx webpack --config webpack.prod.mjs

if [ ! -f dist/index.html ]; then
    echo "!! dist/index.html 不存在，构建可能失败" >&2
    exit 1
fi

echo "==> 打包 ${ZIPNAME}"
cd dist
# 与上游一致：排除 create torrent 独立窗口、source map 和体积巨大的 flag-icons
zip -9 -r "../${ZIPNAME}" ./* -x 'create*' -x '*.map' -x '*flag-icons*'
cd ..

echo "==> 完成: ${ZIPNAME}"
ls -lh "${ZIPNAME}"

cat <<EOF

部署方法（Docker / 裸机通用）：
  1. 解压 ${ZIPNAME} 到目标目录，例如 /config/webui/trguing-zh
  2. 确认 index.html 位于该目录第一层
  3. 设置 transmission 环境变量：
       TRANSMISSION_WEB_HOME=/config/webui/trguing-zh
  4. 重启 transmission 服务
EOF
