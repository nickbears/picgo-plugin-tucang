'use strict'

// 本地 mock 测试：不依赖真实图仓 Token，验证插件注册、联动配置与上传流程逻辑。
const plugin = require('./src/index.js')

function makeCtx({ token, folderMap, folder, simulateResponse }) {
  const holder = { registered: null }
  const ctx = {
    helper: {
      uploader: {
        register(id, u) {
          holder.registered = { ...u, name: id }
        },
      },
    },
    getConfig: () => (token === undefined ? null : { token, folderMap, folder }),
    input: [{ buffer: Buffer.from('fake-image-bytes'), fileName: 'test.png' }],
    output: [],
    Request: {
      request: async (opt) => {
        // 读取 form-data 内容，检查字段
        let bodyStr = ''
        if (opt.body && typeof opt.body.getBuffer === 'function') {
          bodyStr = opt.body.getBuffer().toString()
        } else if (opt.body && typeof opt.body[Symbol.asyncIterator] === 'function') {
          const chunks = []
          for await (const c of opt.body) chunks.push(c)
          bodyStr = Buffer.concat(chunks).toString()
        }
        console.log('  [mock] POST', opt.url)
        console.log('  [mock] form contains token:', bodyStr.includes('name="token"'))
        console.log('  [mock] form contains folderId:', bodyStr.includes('name="folderId"'))
        if (simulateResponse === 'success') {
          return { data: { code: '200', msg: '请求成功', data: { url: 'https://img.tucang.cc/api/image/show/abc123', md5: 'abc123' }, success: true } }
        }
        return { data: { code: '1001', msg: '请登录', data: null, success: false } }
      },
    },
  }
  return { holder, ctx }
}

async function runHandle(holder, ctx) {
  await holder.registered.handle.call(holder.registered, ctx)
}

async function main() {
  // 0. parseFolders 单元验证
  console.log('== 单元：parseFolders ==')
  const parsed = plugin.parseFolders('博客图片=123\n生活相册=456\n\n4274\n空行下一行')
  console.log('  parsed:', JSON.stringify(parsed))
  const m1 = parsed.find((x) => x.name === '博客图片' && x.value === '123')
  const m2 = parsed.find((x) => x.name === '生活相册' && x.value === '456')
  const m3 = parsed.find((x) => x.name === '4274' && x.value === '4274')
  if (parsed.length === 4 && m1 && m2 && m3 && parsed[3].value === '空行下一行') {
    console.log('  PASS: 解析正确（名称=ID 与纯 ID 行均接收，空行过滤）')
  } else {
    console.log('  FAIL: 解析结果不符')
    process.exitCode = 1
  }

  // 1. 联动配置字段验证
  console.log('== 单元：联动配置字段 ==')
  const dummy = makeCtx({ token: 't', simulateResponse: 'success' })
  const mod = plugin(dummy.ctx)
  mod.register()
  const fields = dummy.holder.registered.config()
  const folderField = fields.find((f) => f.name === 'folder')
  const mapField = fields.find((f) => f.name === 'folderMap')
  console.log('  folder type:', folderField && folderField.type, '| dependsOn:', JSON.stringify(folderField && folderField.dependsOn))
  const choices = folderField.choices({ folderMap: '博客图片=123\n生活相册=456' })
  console.log('  choices:', JSON.stringify(choices))
  const def = folderField.default({ folderMap: '博客图片=123\n生活相册=456' })
  console.log('  default:', JSON.stringify(def))
  const emptyChoices = folderField.choices({})
  console.log('  empty choices:', JSON.stringify(emptyChoices))
  if (folderField.type === 'list' && choices.length === 2 && choices[0].name === '博客图片' && choices[0].value === '123' && def === '123' && emptyChoices.length === 0 && mapField.type === 'editor') {
    console.log('  PASS: 下拉联动正确（选项来自映射、默认选第一个、空映射为空）')
  } else {
    console.log('  FAIL: 联动配置不符')
    process.exitCode = 1
  }

  // 2. 上传到指定文件夹（folder 下拉选中 456）
  console.log('== 场景2：选择文件夹 生活相册(456) 上传 ==')
  const b = makeCtx({ token: 'fake-token', folderMap: '博客图片=123\n生活相册=456', folder: '456', simulateResponse: 'success' })
  const modB = plugin(b.ctx)
  modB.register()
  await runHandle(b.holder, b.ctx)
  console.log('  output:', JSON.stringify(b.ctx.output))
  if (b.ctx.output.length === 1 && b.ctx.output[0].imgUrl === 'https://img.tucang.cc/api/image/show/abc123') {
    console.log('  PASS: 上传成功且输出 imgUrl 正确')
  } else {
    console.log('  FAIL: 输出不符')
    process.exitCode = 1
  }

  // 3. 未选文件夹（folder 为空）→ 不传 folderId
  console.log('== 场景3：未选择文件夹，上传根目录 ==')
  const c = makeCtx({ token: 'fake-token', folderMap: '', folder: '', simulateResponse: 'success' })
  const modC = plugin(c.ctx)
  modC.register()
  await runHandle(c.holder, c.ctx)
  if (c.ctx.output.length === 1) {
    console.log('  PASS: 根目录上传成功')
  } else {
    console.log('  FAIL: 输出不符')
    process.exitCode = 1
  }

  // 4. 接口失败
  console.log('== 场景4：接口返回失败 ==')
  const d = makeCtx({ token: 'fake-token', folderMap: 'a=1', folder: '1', simulateResponse: 'fail' })
  const modD = plugin(d.ctx)
  modD.register()
  try {
    await runHandle(d.holder, d.ctx)
    console.log('  FAIL: 应当抛出错误')
    process.exitCode = 1
  } catch (e) {
    console.log('  PASS: 正确抛出 ->', e.message)
  }

  // 5. 未配置 token
  console.log('== 场景5：未配置 token ==')
  const e = makeCtx({ token: undefined, simulateResponse: 'success' })
  const modE = plugin(e.ctx)
  modE.register()
  try {
    await runHandle(e.holder, e.ctx)
    console.log('  FAIL: 应当抛出错误')
    process.exitCode = 1
  } catch (err) {
    console.log('  PASS: 正确抛出 ->', err.message)
  }
}

main().catch((err) => {
  console.error('  UNEXPECTED:', err)
  process.exitCode = 1
})
