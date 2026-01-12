export default {
  async fetch(request) {
    try {
      // 创建新的URL，将请求转发到阿里云服务器
      const url = new URL(request.url);
      url.hostname = '121.41.228.247';
      url.port = '8001';
      url.protocol = 'http';

      // 复制请求头，但移除host头（让服务器知道原始请求）
      const headers = new Headers(request.headers);
      headers.set('X-Forwarded-Host', request.headers.get('host') || '');
      headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || '');

      // 创建新请求
      const newRequest = new Request(url, {
        method: request.method,
        headers: headers,
        body: request.body
      });

      // 发送请求到后端API服务器
      const response = await fetch(newRequest);

      // 创建响应，添加CORS头
      const newResponse = new Response(response.body, response);

      // 添加必要的CORS头
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return newResponse;

    } catch (error) {
      // 错误处理
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};