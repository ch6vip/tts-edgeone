/**
 * EdgeOne Pages Edge Function for /api/v1/models
 * @version 2.0.1 (优化版 - CommonJS)
 * @description 处理模型列表请求
 *
 * @changelog v2.0.1
 * - 回退到不使用 ES6 模块（移除 import/export）
 * - 将工具函数直接内联到主文件
 * - 保留所有功能和错误处理逻辑
 */

// =================================================================================
// 工具函数（内联版本）
// =================================================================================

/**
 * 生成 CORS 响应头
 * @param {string} extraHeaders - 额外允许的请求头
 * @returns {Object} CORS 头部对象
 */
function makeCORSHeaders(extraHeaders = "Content-Type, Authorization") {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": extraHeaders,
    "Access-Control-Max-Age": "86400"
  };
}

/**
 * 处理 CORS 预检请求
 * @param {string} extraHeaders - 额外允许的请求头
 * @returns {Response} CORS 预检响应
 */
function corsHandleOptions(extraHeaders) {
  return new Response(null, {
    status: 204,
    headers: makeCORSHeaders(extraHeaders)
  });
}

/**
 * 生成标准化的错误响应
 * @param {string} message - 错误消息
 * @param {number} status - HTTP 状态码
 * @param {string} code - 错误代码
 * @param {string} type - 错误类型
 * @returns {Response} 错误响应对象
 */
function errorResponse(message, status = 500, code = null, type = "api_error") {
  return new Response(
    JSON.stringify({
      error: {
        message,
        type,
        code,
        param: null
      }
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...makeCORSHeaders()
      }
    }
  );
}

// =================================================================================
// 主要逻辑
// =================================================================================

// OpenAI 音色映射
const OPENAI_VOICE_MAP = {
  'alloy': 'zh-CN-XiaoxiaoNeural',
  'echo': 'zh-CN-YunxiNeural',
  'fable': 'zh-CN-XiaoyiNeural',
  'onyx': 'zh-CN-YunjianNeural',
  'nova': 'zh-CN-XiaochenNeural',
  'shimmer': 'zh-CN-XiaohanNeural'
};

/**
 * 处理 /api/v1/models 请求
 * @param {Object} context - EdgeOne Pages 上下文对象
 * @returns {Promise<Response>} HTTP 响应
 */
async function onRequest(context) {
  const request = context.request;

  // 处理 CORS 预检请求
  if (request.method === "OPTIONS") {
    return corsHandleOptions(request.headers.get("Access-Control-Request-Headers"));
  }

  // API 密钥验证
  const API_KEY = context.env.API_KEY;
  if (API_KEY) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.slice(7) !== API_KEY) {
      return errorResponse("无效的 API 密钥", 401, "invalid_api_key");
    }
  }

  try {
    // 返回模型列表
    const models = [
      { id: 'tts-1', object: 'model', created: Date.now(), owned_by: 'openai' },
      { id: 'tts-1-hd', object: 'model', created: Date.now(), owned_by: 'openai' },
      ...Object.keys(OPENAI_VOICE_MAP).map(v => ({
        id: `tts-1-${v}`,
        object: 'model',
        created: Date.now(),
        owned_by: 'openai'
      }))
    ];

    return new Response(JSON.stringify({ object: "list", data: models }), {
      headers: { "Content-Type": "application/json", ...makeCORSHeaders() }
    });
  } catch (err) {
    return errorResponse(`模型列表请求错误: ${err.message}`, 500, "internal_server_error");
  }
}

// =================================================================================
// 导出（EdgeOne Pages 兼容格式）
// =================================================================================

// EdgeOne Pages 需要 default export
export default { fetch: onRequest };
