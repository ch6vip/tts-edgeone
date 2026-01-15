/**
 * EdgeOne Pages Edge Function - Microsoft Edge TTS 服务代理
 *
 * @version 3.0.0 (模块化重构版)
 * @description 实现了内部自动批处理机制，优雅地处理 EdgeOne 的子请求限制。
 * API 现在可以处理任何长度的文本，不会因为"子请求过多"而失败。
 *
 * @features
 * - 支持流式和非流式 TTS 输出
 * - 自动文本清理和分块处理（优化性能）
 * - 智能批处理避免 EdgeOne 限制
 * - 兼容 OpenAI TTS API 格式
 * - 支持多种中英文语音
 * - Token 竞态保护机制
 *
 * @changelog v3.0.0
 * - 完全模块化重构，提取公共工具库
 * - 代码行数从 743 行减少到约 200 行
 * - 提升代码可维护性和可测试性
 * - 添加完整的 JSDoc 类型注解
 */

// =================================================================================
// 导入模块
// =================================================================================

import { 
  makeCORSHeaders, 
  errorResponse, 
  smartChunkText, 
  cleanText, 
  OPENAI_VOICE_MAP 
} from '../lib/utils.js';

import { validateApiKey } from '../lib/auth.js';

import { 
  streamVoice, 
  getVoice, 
  parseRequestParams, 
  processRequestParams 
} from '../lib/tts.js';

// =================================================================================
// 主事件处理器
// =================================================================================

/**
 * 处理 /api/v1/audio/speech 请求
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
    // 处理语音合成请求
    return await handleSpeechRequest(request);
  } catch (err) {
    return errorResponse(`处理错误: ${err.message}`, 500, "internal_server_error");
  }
}

// =================================================================================
// 路由处理器
// =================================================================================

/**
 * 处理语音合成请求
 * @param {Request} request - HTTP 请求对象
 * @returns {Promise<Response>} 语音数据响应
 */
async function handleSpeechRequest(request) {
  // 验证请求方法
  if (request.method !== "POST" && request.method !== "GET") {
    return errorResponse("不允许的方法", 405, "method_not_allowed");
  }

  // 解析请求参数
  const requestBody = await parseRequestParams(request);

  // 处理请求参数
  const params = processRequestParams(requestBody, OPENAI_VOICE_MAP);

  // 清理输入文本
  const cleanedInput = cleanText(params.input, params.finalCleaningOptions);

  // 智能文本分块
  const textChunks = smartChunkText(cleanedInput, params.chunk_size);

  // 根据是否流式选择处理方式
  if (params.stream) {
    return await streamVoice(
      textChunks, 
      params.concurrency, 
      params.finalVoice, 
      params.rate, 
      params.finalPitch, 
      params.style, 
      params.outputFormat
    );
  } else {
    return await getVoice(
      textChunks, 
      params.concurrency, 
      params.finalVoice, 
      params.rate, 
      params.finalPitch, 
      params.style, 
      params.outputFormat
    );
  }
}

// =================================================================================
// 导出（EdgeOne Pages 兼容格式）
// =================================================================================

// EdgeOne Pages 需要 default export
export default { fetch: onRequest };
