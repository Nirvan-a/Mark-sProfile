/**
 * Cloudflare Worker - API 代理
 * 用于代理后端 API 请求，解决 CORS 问题并隐藏后端真实地址
 * 
 * 部署步骤：
 * 1. 在 Cloudflare Dashboard 进入 Workers & Pages
 * 2. 创建新的 Worker
 * 3. 粘贴此代码
 * 4. 配置环境变量 BACKEND_URL（你的后端服务地址）
 * 5. 配置路由：yourdomain.com/api/* → Worker
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    
    // 只代理 /api 路径的请求
    if (url.pathname.startsWith('/api')) {
      // 从环境变量获取后端地址，如果没有则使用默认值
      // 部署时需要在 Cloudflare Worker 设置中添加环境变量
      const backendUrl = env.BACKEND_URL || 'https://your-backend-url.com'
      
      // 构建目标 URL
      const targetUrl = `${backendUrl}${url.pathname}${url.search}`
      
      // 创建新的请求
      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })
      
      try {
        // 转发请求到后端
        const response = await fetch(newRequest)
        
        // 创建响应，添加 CORS 头
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Max-Age': '86400',
          },
        })
        
        return newResponse
      } catch (error) {
        // 后端请求失败，返回错误
        return new Response(
          JSON.stringify({
            error: 'Backend service unavailable',
            message: error.message,
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
      }
    }
    
    // 非 API 请求直接返回（由 Cloudflare Pages 处理）
    return fetch(request)
  }
}

