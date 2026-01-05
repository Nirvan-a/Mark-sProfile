#!/usr/bin/env node

/**
 * 工具开发启动器
 * 支持为每个工具启动独立的开发服务器
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createWriteStream } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 单栈架构配置
const services = [
  {
    id: 'frontend',
    name: '前端应用',
    port: 5173,
    type: 'frontend',
    color: '\x1b[36m', // 青色
  },
  {
    id: 'backend',
    name: '后端API',
    port: 8001,
    type: 'backend',
    color: '\x1b[32m', // 绿色
  },
]

// 颜色重置
const RESET = '\x1b[0m'

// 进程存储
const processes = new Map()

function log(message, color = '\x1b[37m') {
  console.log(`${color}[${new Date().toLocaleTimeString()}] ${message}${RESET}`)
}

function startFrontend() {
  const service = services.find(s => s.type === 'frontend')
  if (!service) return

  log(`启动 ${service.name} (端口: ${service.port})`, service.color)

  const viteProcess = spawn('npm', ['run', 'dev'], {
    cwd: join(__dirname, 'web'),
    env: {
      ...process.env,
      PORT: service.port.toString(),
    },
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  })

  processes.set('frontend', viteProcess)

  viteProcess.stdout.on('data', (data) => {
    const output = data.toString()
    if (output.includes('ready in') || output.includes('Local:')) {
      log(`${service.name} 就绪: http://localhost:${service.port}`, service.color)
      log(`📱 工具访问地址:`, '\x1b[37m')
      console.log(`   主页: http://localhost:${service.port}/`)
      console.log(`   智能问数: http://localhost:${service.port}/askdata`)
      console.log(`   智能报告: http://localhost:${service.port}/smartreport`)
      console.log(`   智能点单: http://localhost:${service.port}/smartorder`)
      console.log(`   智能规划: http://localhost:${service.port}/smartplan`)
    }
  })

  viteProcess.stderr.on('data', (data) => {
    log(`${service.name} 错误: ${data}`, '\x1b[31m')
  })

  viteProcess.on('close', (code) => {
    log(`${service.name} 已停止 (退出码: ${code})`, service.color)
    processes.delete('frontend')
  })

  return viteProcess
}

function startBackend() {
  const service = services.find(s => s.type === 'backend')
  if (!service) return

  log(`启动 ${service.name} (端口: ${service.port})`, service.color)

  // 创建日志文件写入流
  const logFile = `/tmp/server_${service.port}.log`
  const logStream = createWriteStream(logFile, { flags: 'a' })
  log(`📝 后端日志将写入: ${logFile}`, '\x1b[37m')

  const backendProcess = spawn('python', ['-m', 'uvicorn', 'app:app', '--reload', '--host', '0.0.0.0', '--port', service.port.toString()], {
    cwd: join(__dirname, 'server'),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
  })

  processes.set('backend', backendProcess)

  backendProcess.stdout.on('data', (data) => {
    const output = data.toString()
    // 写入日志文件
    logStream.write(output)
    // 原有的处理逻辑
    if (output.includes('Application startup complete') || output.includes('Uvicorn running')) {
      log(`${service.name} 就绪: http://localhost:${service.port}`, service.color)
      log(`🔗 API 健康检查: http://localhost:${service.port}/api/health`, '\x1b[37m')
    }
  })

  backendProcess.stderr.on('data', (data) => {
    const output = data.toString()
    // 写入日志文件
    logStream.write(output)
    // 原有的处理逻辑
    log(`${service.name} 错误: ${output}`, '\x1b[31m')
  })

  backendProcess.on('close', (code) => {
    logStream.end()
    log(`${service.name} 已停止 (退出码: ${code})`, service.color)
    processes.delete('backend')
  })

  return backendProcess
}

function startAll() {
  // 先启动后端
  startBackend()
  // 等待后端启动后再启动前端
  setTimeout(() => {
    startFrontend()
  }, 3000)
}

function stopAll() {
  log('正在停止所有服务...', '\x1b[33m')
  for (const [name, process] of processes) {
    log(`终止进程: ${name}`)
    process.kill('SIGTERM')
  }
  processes.clear()
}

// 命令行参数处理
const args = process.argv.slice(2)
const command = args[0]

if (command === 'start' || command === undefined) {
  const target = args[1] || 'all'

  if (target === 'all' || target === undefined) {
    log('🚀 启动单栈开发环境...', '\x1b[36m')
    startAll()
  } else {
    console.log('❌ 单栈模式不支持单独启动工具，请使用 "npm run dev" 启动所有服务')
    process.exit(1)
  }
} else if (command === 'stop') {
  stopAll()
} else if (command === 'list') {
  log('📋 单栈开发环境服务列表:', '\x1b[36m')
  console.log(`${services[0].color}• 前端应用: http://localhost:${services[0].port}${RESET}`)
  console.log(`  ├── 主页: /`)
  console.log(`  ├── 智能问数: /askdata`)
  console.log(`  ├── 智能报告: /smartreport`)
  console.log(`  ├── 智能点单: /smartorder`)
  console.log(`  └── 智能规划: /smartplan`)
  console.log('')
  console.log(`${services[1].color}• 后端API: http://localhost:${services[1].port}${RESET}`)
  console.log(`  ├── 健康检查: /api/health`)
  console.log(`  ├── 智能问数API: /api/askdata/*`)
  console.log(`  ├── 智能报告API: /api/smartreport/*`)
  console.log(`  ├── 智能点单API: /api/smartorder/*`)
  console.log(`  └── 智能规划API: /api/smartplan/*`)
} else {
  console.log('用法:')
  console.log('  node dev-tools.js start     # 启动开发环境')
  console.log('  node dev-tools.js stop      # 停止所有服务')
  console.log('  node dev-tools.js list      # 显示服务列表')
  console.log('')
  console.log('快捷命令:')
  console.log('  npm run dev      # 启动开发环境')
  console.log('  npm run stop     # 停止所有服务')
  console.log('  npm run list     # 显示服务列表')
}

// 监听退出信号
process.on('SIGINT', () => {
  log('收到中断信号，正在停止所有服务...', '\x1b[33m')
  stopAll()
  process.exit(0)
})

process.on('SIGTERM', () => {
  log('收到终止信号，正在停止所有服务...', '\x1b[33m')
  stopAll()
  process.exit(0)
})
