'use strict'

const fs = require('fs')
const FormData = require('form-data')

const API_UPLOAD = 'https://api.tucang.cc/api/v1/upload'

function getBuffer(file) {
  if (file.buffer) return file.buffer
  if (file.path) return fs.readFileSync(file.path)
  throw new Error('无法读取图片文件（缺少 buffer/path）')
}

function getFileName(file) {
  return file.fileName || file.name || file.path || 'image.png'
}

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
    const uploader = {
      name: 'tucang',
      title: '图仓',
      config: [
        {
          name: 'token',
          type: 'input',
          alias: 'Token',
          default: '',
          required: true,
          message: '图仓 Token（图仓官网登录后：我的 → 设置 → Token）',
        },
        {
          name: 'folderId',
          type: 'input',
          alias: '文件夹ID',
          default: '',
          required: false,
          message: '图仓文件夹 ID（留空上传根目录）',
        },
      ],
      async handle(ctx) {
        const config = ctx.getConfig('picBed.tucang')
        if (!config || !config.token) {
          throw new Error('请先在图仓插件设置中填写 Token')
        }
        const folderId = (config.folderId || '').toString()
        for (const file of ctx.input) {
          ctx.output.push(await uploadOne(ctx, file, config.token, folderId))
        }
      },
    }
    ctx.helper.uploader.register(uploader)
  }
  return { register }
}
