// Cloudflare Pages Functions - API代理
export async function onRequest(context) {
  const { request, params, env } = context;

  try {
    // 调试日志
    console.log('Functions request:', {
      url: request.url,
      method: request.method,
      params: params
    });

    // 构建目标API URL
    // params.path 是数组形式，如 ['analyze'] 或 ['health']
    let apiPath;
    if (Array.isArray(params.path)) {
      apiPath = params.path.join('/');
    } else if (params.path) {
      apiPath = params.path;
    } else {
      apiPath = 'health';
    }

    // 确保路径不以 /api/ 开头（避免重复）
    if (apiPath.startsWith('api/')) {
      apiPath = apiPath.substring(4);
    }

    const targetUrl = `http://121.41.228.247:8001/api/${apiPath}`;

    console.log('Proxying to:', targetUrl);

    // 创建新请求头，移除可能导致问题的 Cloudflare 头
    const headers = new Headers();
    for (const [key, value] of request.headers.entries()) {
      // 跳过 Cloudflare 特定的头
      if (!key.startsWith('cf-') && !key.startsWith('CF-')) {
        headers.set(key, value);
      }
    }

    // 设置代理头
    headers.set('Host', '121.41.228.247');
    headers.set('X-Forwarded-Host', new URL(request.url).host);
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '127.0.0.1');
    headers.set('X-Forwarded-Proto', 'https');

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.body
    });

    // 发送请求到后端
    const response = await fetch(newRequest);

    // 创建响应，保留原始响应头
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

    // 添加CORS头（如果后端没有设置）
    if (!newResponse.headers.has('Access-Control-Allow-Origin')) {
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

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
