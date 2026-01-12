// Cloudflare Pages Middleware - API路由处理
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 如果是API请求，代理到后端
  if (url.pathname.startsWith('/api/')) {
    try {
      // 移除开头的 /api/ 前缀
      const apiPath = url.pathname.substring(5); // 移除 '/api/'
      const targetUrl = `http://121.41.228.247:8001/api/${apiPath}${url.search}`;

      console.log('API Proxy:', {
        original: url.pathname,
        apiPath: apiPath,
        target: targetUrl
      });

      // 创建代理请求
      const headers = new Headers(request.headers);

      // 设置代理头
      headers.set('Host', '121.41.228.247');
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '127.0.0.1');
      headers.set('X-Forwarded-Proto', 'https');

      // 移除Cloudflare特定头
      ['cf-ray', 'cf-visitor', 'cf-ew-status', 'cf-cache-status'].forEach(header => {
        headers.delete(header);
      });

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers,
        body: request.body
      });

      // 发送请求到后端
      const response = await fetch(proxyRequest);

      // 创建响应
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // 添加CORS头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return newResponse;

    } catch (error) {
      console.error('API proxy error:', error);
      return new Response(JSON.stringify({
        error: 'API proxy error',
        details: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // 其他请求正常处理
  return next();
}
