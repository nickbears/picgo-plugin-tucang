# picgo-plugin-tucang

PicGo 上传插件：图仓（[tucang.cc](https://tucang.cc)）免费图床。

## 接口依据

依据图仓官方 API 文档（[语雀：图仓API接口文档](https://www.yuque.com/lazydoc/qlg37h/oyc0e8y8z99yi0m9)）：

- 上传：`POST https://api.tucang.cc/api/v1/upload`（multipart/form-data）
  - 参数：`token`（必填）、`file`（或 `url`）、`referer`、`type`、`folderId`
  - 成功返回：`{ "code": "200", "data": { "url": "https://img.tucang.cc/...", "md5": "..." }, "success": true }`

## 安装

### 方式一：命令行 PicGo（picgo-cli）

```bash
cd 你的项目目录
npm install ./picgo-plugin-tucang
```

### 方式二：PicGo 桌面版

1. 打开 PicGo → 设置 → 插件设置 → 安装插件。
2. 输入插件名 `picgo-plugin-tucang`（发布到 npm 后可用）；
   本地未发布时，可把 `picgo-plugin-tucang` 整个文件夹放入 PicGo 插件目录后重启。

## 配置

安装后在 PicGo 图床设置中选择「图仓」，有两个配置项：

| 配置项 | 类型 | 必填 | 说明 |
|---|---|---|---|
| Token | input | 是 | 图仓 Token。登录 tucang.cc → 我的 → 设置 → Token 获取 |
| 文件夹ID | input | 否 | 图仓文件夹 ID，填写后图片上传到该文件夹；留空上传根目录 |

文件夹 ID 获取：登录 tucang.cc → 图片管理 → 进入文件夹后查看对应的数字 ID。

## 使用

在 PicGo 上传区选择「图仓」图床，拖入或选择图片即可上传，上传成功后自动复制返回的图片直链。

## 说明

- 图仓官方建议对接方做好健壮性：若图仓服务不稳定导致上传失败，建议本地先保留原图，必要时自行重试或降级。
- 本插件当前仅实现「上传」能力；如需「删除图片」（`POST /api/v1/deleteImage`），可作为后续版本补充。
