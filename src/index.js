'use strict'

const fs = require('fs')
const FormData = require('form-data')

const API_UPLOAD = 'https://api.tucang.cc/api/v1/upload'

/**
 * 解析"文件夹映射"文本：每行一个 "名称=ID"，或直接写一个纯 ID。
 * 例如：
 *   博客图片=123
 *   生活相册=456
 *   789        ← 纯 ID 行，下拉显示名与 ID 相同
 */
function parseFolders(text) {
  if (!text) return []
  const list = []
  for (const line of String(text).split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    const idx = t.lastIndexOf('=')
    if (idx > 0 && idx < t.length - 1) {
      const name = t.slice(0, idx).trim()
      const value = t.slice(idx + 1).trim()
      if (name && value) list.push({ name, value })
    } else {
      // 纯 ID 行：整行即文件夹 ID，下拉显示名与 ID 相同
      list.push({ name: t, value: t })
    }
  }
  return list
}

/**
 * 从 PicGo 输入项中取出图片 Buffer。
 * PicGo 2.x 的输入项为 { buffer, fileName, ... }，
 * path transformer 下为 { path, fileName, ... }，这里做兼容。
 */
function getBuffer(file) {
  if (!file) throw new Error('上传项为空')
  if (file.buffer) return file.buffer
  const p = file.path || file.filePath || (typeof file === 'string' ? file : '')
  if (p) return fs.readFileSync(p)
  const keys = typeof file === 'object' ? Object.keys(file).join(',') : typeof file
  throw new Error(`无法读取图片文件（缺少 buffer/path），字段：${keys}`)
}

function getFileName(file) {
  return file.fileName || file.name || file.path || 'image.png'
}

/**
 * 上传单张图片到图仓。
 * 接口：POST https://api.tucang.cc/api/v1/upload（multipart/form-data）
 * 成功返回：{ code:"200", msg:"请求成功", data:{ url, md5 }, success:true }
 */
async function uploadOne(ctx, file, token, folderId) {
  const form = new FormData()
  form.append('token', token)
  form.append('file', getBuffer(file), getFileName(file))
  if (folderId) form.append('folderId', String(folderId))

  const resp = await ctx.Request.request({
    method: 'POST',
    url: API_UPLOAD,
    headers: form.getHeaders(),
    body: form,
  })

  // 兼容 axios 风格的 response（resp.data 为响应体）
  const body = resp && resp.data ? resp.data : resp

  if (body && body.code === '200' && body.data && body.data.url) {
    return {
      fileName: getFileName(file),
      imgUrl: body.data.url,
      md5: body.data.md5,
    }
  }

  const msg = (body && body.msg) || JSON.stringify(body)
  throw new Error(`图仓上传失败：${msg}`)
}

module.exports = (ctx) => {
  const register = () => {
    // PicGo 3.x：helper.uploader.register(id, { name, handle, config })
    // （2.x 的单参数写法 register(uploaderObj) 在 3.x 会因缺 handle 抛错，导致插件被移除）
    ctx.helper.uploader.register('tucang', {
      get name() {
        return '图仓'
      },
      config: () => [
        {
          name: 'token',
          type: 'password',
          alias: 'Token',
          default: '',
          required: true,
          message: '图仓 Token（图仓官网登录后：我的 → 设置 → Token）',
        },
        {
          name: 'folderMap',
          type: 'editor',
          alias: '文件夹映射',
          default: '',
          required: false,
          message: '每行一个：文件夹名=文件夹ID，或直接写文件夹ID',
          tips: '每行一个"名称=ID"，或直接写文件夹ID，例如：\n博客图片=123\n456\n\n- 文件夹ID 可在图仓【图片管理】中查看\n- 修改名称即可重命名下拉选项\n- 留空则上传到根目录',
        },
        {
          name: 'folder',
          type: 'list',
          alias: '上传文件夹',
          dependsOn: ['folderMap'],
          choices: (answers) => parseFolders(answers.folderMap),
          default: (answers) => {
            const list = parseFolders(answers.folderMap)
            return list.length ? list[0].value : ''
          },
          required: false,
          message: '选择要上传到的文件夹（留空上传根目录）',
        },
      ],
      async handle(ctx) {
        const config = ctx.getConfig('picBed.tucang')
        if (!config || !config.token) {
          throw new Error('请先在图仓插件设置中填写 Token')
        }
        // 优先使用下拉选择的 folder；兼容旧版本的 folderId 输入
        const folderId = (config.folder || config.folderId || '').toString()
        for (const file of ctx.input) {
          ctx.output.push(await uploadOne(ctx, file, config.token, folderId))
        }
      },
    })
  }
  return { register }
}

// 供测试使用
module.exports.parseFolders = parseFolders
