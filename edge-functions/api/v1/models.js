/**
 * EdgeOne Pages Edge Function for /api/v1/models
 * @version 3.0.0 (模块化重构版)
 * @description 处理模型列表请求
 *
 * @changelog v3.0.0
 * - 使用公共工具库替代内联函数
 * - 代码行数从 132 行减少到约 60 行
 * - 提升代码可维护性
 */

// =================================================================================
// 导入模块
// =================================================================================

import { 
  makeCORSHeaders, 
  errorResponse, 
  OPENAI_VOICE_MAP 
} from '../lib/utils.js';

import { validateApiKey } from '../lib/auth.js';

// =================================================================================
// 主事件处理器
// =================================================================================

/**
 * 处理 /api/v1/models 请求
 * @param {Object} context - EdgeOne Pages 上下文对象
 * @returns {Promise<Response>} HTTP 响应
 */
async function onRequest(context) {
  const request = context.request;

  // 处理 CORS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: makeCORSHeaders(request.headers.get("Access-Control-Request-Headers"))
    });
  }

  // API 密钥验证
  const API_KEY = context.env.API_KEY;
  if (API_KEY && !validateApiKey(request, API_KEY)) {
    return errorResponse("无效的 API 密钥", 401, "invalid_api_key");
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
