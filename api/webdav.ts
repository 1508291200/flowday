/**
 * WebDAV API 代理
 * 
 * Vercel Edge Function，用于在服务端执行 WebDAV 操作
 * 绕过 Vercel 对非标准 HTTP 方法的限制
 */

export const config = {
  runtime: 'edge',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const WEBDAV_BASE = 'https://dav.jianguoyun.com';

type Action = 'test' | 'stat' | 'get' | 'put' | 'mkdir';

interface RequestBody {
  action: Action;
  username: string;
  password: string;
  path?: string;
  data?: string;
}

/**
 * JSON 响应辅助函数
 */
function json(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/**
 * 处理 OPTIONS 预检请求
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export default async function handler(request: Request): Promise<Response> {
  // 处理 CORS 预检
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }
  
  // 只接受 POST 请求
  if (request.method !== 'POST') {
    return json(
      { success: false, error: 'Method not allowed' },
      405
    );
  }
  
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }
  
  const { action, username, password, path = '/', data } = body;
  
  // 验证必填字段
  if (!action || !username || !password) {
    return json({ success: false, error: 'Missing required fields' }, 400);
  }
  
  const auth = 'Basic ' + btoa(`${username}:${password}`);
  const url = `${WEBDAV_BASE}${path}`;
  
  try {
    let result: Response;
    
    switch (action) {
      case 'test':
        result = await fetch(url, {
          method: 'PROPFIND',
          headers: {
            'Authorization': auth,
            'Depth': '0',
            'Content-Type': 'application/xml',
          },
        });
        
        if (result.status === 207 || result.status === 200) {
          return json({ success: true });
        }
        return json({ success: false, error: `HTTP ${result.status}` });
      
      case 'stat': {
        const filePath = path.endsWith('/') ? `${path}flowday.json` : path;
        result = await fetch(`${WEBDAV_BASE}${filePath}`, {
          method: 'PROPFIND',
          headers: {
            'Authorization': auth,
            'Depth': '0',
            'Content-Type': 'application/xml',
          },
        });
        
        if (result.status === 207 || result.status === 200) {
          return json({ success: true, exists: true });
        }
        // 404 或 410 都表示文件不存在
        // 坚果云可能返回 410 (Gone) 表示文件已删除
        if (result.status === 404 || result.status === 410) {
          return json({ success: true, exists: false });
        }
        return json({ success: false, error: `HTTP ${result.status}` });
      }
      
      case 'get': {
        const filePath = path.endsWith('/') ? `${path}flowday.json` : path;
        result = await fetch(`${WEBDAV_BASE}${filePath}`, {
          method: 'GET',
          headers: { 'Authorization': auth },
        });
        
        // 404 或 410 都表示文件不存在
        if (result.status === 404 || result.status === 410) {
          return json({ success: true, data: null });
        }
        if (!result.ok) {
          return json({ success: false, error: `HTTP ${result.status}` });
        }
        
        const content = await result.text();
        return json({ success: true, data: content });
      }
      
      case 'put': {
        const filePath = path.endsWith('/') ? `${path}flowday.json` : path;
        if (!data) {
          return json({ success: false, error: 'Missing data' }, 400);
        }
        
        result = await fetch(`${WEBDAV_BASE}${filePath}`, {
          method: 'PUT',
          headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
          },
          body: data,
        });
        
        if (result.ok || result.status === 201 || result.status === 204) {
          return json({ success: true });
        }
        return json({ success: false, error: `HTTP ${result.status}` });
      }
      
      case 'mkdir': {
        // 先检查目录是否存在
        const checkResult = await fetch(url, {
          method: 'PROPFIND',
          headers: {
            'Authorization': auth,
            'Depth': '0',
            'Content-Type': 'application/xml',
          },
        });
        
        // 目录已存在
        if (checkResult.status === 207 || checkResult.status === 200) {
          return json({ success: true, exists: true });
        }
        
        // 404 或 410 表示目录不存在，需要创建
        // 坚果云可能返回 410 (Gone) 表示目录已删除
        if (checkResult.status !== 404 && checkResult.status !== 410) {
          return json({ success: false, error: `检查目录失败: HTTP ${checkResult.status}` });
        }
        
        // 创建目录
        result = await fetch(url, {
          method: 'MKCOL',
          headers: { 'Authorization': auth },
        });
        
        // 405 means already exists
        if (result.ok || result.status === 201 || result.status === 405) {
          return json({ success: true });
        }
        return json({ success: false, error: `HTTP ${result.status}` });
      }
      
      default:
        return json({ success: false, error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('[WebDAV API] Error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
