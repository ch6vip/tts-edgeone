/**
 * EdgeOne Pages Edge Function for /api/v1/models
 * @version 2.0.0 (优化版)
 * @description 处理模型列表请求，使用公共工具库
 */

// 导入公共工具
import { makeCORSHeaders, handleOptions as corsHandleOptions } from '../../utils/cors.js';
import { errorResponse } from '../../utils/errors.js';

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
export default async function onRequest(context) {
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
