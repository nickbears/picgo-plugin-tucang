# picgo-plugin-tucang

**作者：小奶鲨 ｜ GitHub：https://github.com/nickbears ｜ 微信：nickbears**

PicGo 上传插件：图仓（[tucang.cc](https://tucang.cc)）免费图床。

## 接口依据

依据图仓官方 API 文档（[语雀：图仓API接口文档](https://www.yuque.com/lazydoc/qlg37h/oyc0e8y8z99yi0m9)）：

- 上传：`POST https://api.tucang.cc/api/v1/upload`（multipart/form-data）
  - 参数：`token`（必填）、`file`（或 `url`）、`referer`、`type`、`folderId`
  - 成功返回：`{ "code": "200", "data": { "url": "https://img.tucang.cc/...", "md5": "..." }, "success": true }`

## 要求

- PicGo **3.0 及以上**（v1.1.0 使用 3.0 的"联动字段"特性生成文件夹下拉框）
- Node.js 14+

## 安装

### 方式一：命令行 PicGo（picgo-cli）

```bash
cd 你的项目目录
npm install ./picgo-plugin-tucang
```

### 方式二：PicGo 桌面版（3.x）

插件未发布到 npm 时，使用手动安装：

1. 关闭 PicGo。
2. 把 `picgo-plugin-tucang` 整个文件夹复制到 PicGo 数据目录的 `node_modules` 下：
   - Windows：`%APPDATA%\picgo\node_modules\picgo-plugin-tucang\`
3. 编辑 `%APPDATA%\picgo\package.json`，在 `dependencies` 中加入 `"picgo-plugin-tucang": "1.1.0"`。
4. 编辑 `%APPDATA%\picgo\data.json` 的 `picgoPlugins` 加入 `"picgo-plugin-tucang": true`（`data.bak.json` / `config.snapshot.json` 如有也同步）。
5. 重启 PicGo，在「图床设置」中即可看到「图仓」。

> 若 PicGo 插件页报 `spawn npm ENOENT` / `NPM is not installed`，说明系统未安装 Node.js/npm，请先安装 Node.js LTS（nodejs.org 或 npmmirror.com），安装后重新打开终端再试。

## 配置

安装后在 PicGo 图床设置中选择「图仓」，有三个配置项：

| 配置项 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Token | password | 是 | 图仓 Token。登录 tucang.cc → 我的 → 设置 → Token 获取 |
| 文件夹映射 | editor | 否 | 每行一个 `文件夹名=文件夹ID`，例如：`博客图片=123`。**修改名称即可重命名下拉选项**；留空则只能上传根目录 |
| 上传文件夹 | list（下拉） | 否 | 自动读取"文件夹映射"生成选项，选择要上传的文件夹；留空上传根目录 |

文件夹 ID 获取：登录 tucang.cc → 图片管理 → 进入文件夹后查看对应的数字 ID。

### 使用示例

文件夹映射填写：

```
博客图片=123
生活相册=456
```

保存后"上传文件夹"下拉框会自动出现两个选项：`博客图片`、`生活相册`，选择后上传即进入对应文件夹。

## 使用

在 PicGo 上传区选择「图仓」图床，拖入或选择图片即可上传，上传成功后自动复制返回的图片直链。

## 说明

- 图仓官方建议对接方做好健壮性：若图仓服务不稳定导致上传失败，建议本地先保留原图，必要时自行重试或降级。
- 本插件当前仅实现「上传」能力；如需「删除图片」（`POST /api/v1/deleteImage`），可作为后续版本补充。
