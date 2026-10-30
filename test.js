'use strict'

// 本地 mock 测试：验证插件注册、配置与上传流程逻辑（v1.0.0）。
const plugin = require('./src/index.js')

function makeCtx({ token, folderId, simulateResponse }) {
  const holder = { registered: null }
  const ctx = {
    helper: {
      uploader: {
        register(u) {
          holder.registered = u
        },
      },
    },
    getConfig: () => (token === undefined ? null : { token, folderId }),
    input: [{ buffer: Buffer.from('fake-image-bytes'), fileName: 'test.png' }],
    output: [],
    Request: {
      request: async (opt) => {
        let bodyStr = ''
        if (opt.body && typeof opt.body.getBuffer === 'function') {
          bodyStr = opt.body.getBuffer().toString()
        }
        console.log('  [mock] POST', opt.url)
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
  // 1. 上传到指定文件夹
  console.log('== 场景1：指定 folderId=456 上传 ==')
  const a = makeCtx({ token: 'fake-token', folderId: '456', simulateResponse: 'success' })
  const modA = plugin(a.ctx)
  modA.register()
  await runHandle(a.holder, a.ctx)
  console.log('  output:', JSON.stringify(a.ctx.output))
  if (a.ctx.output.length === 1 && a.ctx.output[0].imgUrl === 'https://img.tucang.cc/api/image/show/abc123') {
    console.log('  PASS: 上传成功且输出 imgUrl 正确')
  } else {
    console.log('  FAIL: 输出不符')
    process.exitCode = 1
  }

  // 2. 未填 folderId → 根目录
  console.log('== 场景2：未填 folderId，上传根目录 ==')
  const b = makeCtx({ token: 'fake-token', folderId: '', simulateResponse: 'success' })
  const modB = plugin(b.ctx)
  modB.register()
  await runHandle(b.holder, b.ctx)
  if (b.ctx.output.length === 1) {
    console.log('  PASS: 根目录上传成功')
  } else {
    console.log('  FAIL: 输出不符')
    process.exitCode = 1
  }

  // 3. 接口失败
  console.log('== 场景3：接口返回失败 ==')
  const c = makeCtx({ token: 'fake-token', folderId: '1', simulateResponse: 'fail' })
  const modC = plugin(c.ctx)
  modC.register()
  try {
    await runHandle(c.holder, c.ctx)
    console.log('  FAIL: 应当抛出错误')
    process.exitCode = 1
  } catch (e) {
    console.log('  PASS: 正确抛出 ->', e.message)
  }

  // 4. 未配置 token
  console.log('== 场景4：未配置 token ==')
  const d = makeCtx({ token: undefined, simulateResponse: 'success' })
  const modD = plugin(d.ctx)
  modD.register()
  try {
    await runHandle(d.holder, d.ctx)
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
