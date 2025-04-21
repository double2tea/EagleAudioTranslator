#!/bin/bash

# 创建临时目录
TEMP_DIR="./temp_package"
mkdir -p $TEMP_DIR

# 复制文件到临时目录
cp -r ./assets $TEMP_DIR/
cp -r ./index.html $TEMP_DIR/
cp -r ./manifest.json $TEMP_DIR/
cp -r ./README.md $TEMP_DIR/

# 创建zip文件
cd $TEMP_DIR
zip -r ../EagleAudioTranslator.eagleplugin *
cd ..

# 清理临时目录
rm -rf $TEMP_DIR

echo "插件打包完成: EagleAudioTranslator.eagleplugin"