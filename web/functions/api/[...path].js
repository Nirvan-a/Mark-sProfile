// Cloudflare Pages Functions - API代理
export async function onRequest(context) {
  const { request, params } = context;

  try {
    // 构建目标API URL
    const targetUrl = `http://121.41.228.247:8001/api/${params.path || ''}`;

    // 创建新请求
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        ...request.headers,
        'Host': '121.41.228.247',
        'X-Forwarded-Host': request.headers.get('host'),
        'X-Real-IP': request.headers.get('CF-Connecting-IP'),
        'X-Forwarded-Proto': 'https'
      },
      body: request.body
    });

    // 发送请求到后端
    const response = await fetch(newRequest);

    // 创建响应，添加CORS头
    const newResponse = new Response(response.body, response);

    // 添加CORS头
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return newResponse;

  } catch (error) {
    console.error('API proxy error:', error);
    return new Response(JSON.stringify({ error: 'API proxy error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
