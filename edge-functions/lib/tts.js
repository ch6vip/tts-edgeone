/**
 * EdgeOne Pages TTS - 核心模块
 * @version 1.0.0
 * @description 处理 TTS 语音生成的核心逻辑
 */

import { makeCORSHeaders, errorResponse, getSsml, DEFAULT_CONFIG } from './utils.js';
import { getEndpoint } from './auth.js';

// =================================================================================
// 流式语音生成
// =================================================================================

/**
 * 流式语音生成
 * @param {string[]} textChunks - 文本块数组
 * @param {number} concurrency - 并发数
 * @param {string} voiceName - 语音名称
 * @param {string} rate - 语速
 * @param {string} pitch - 音调
 * @param {string} style - 语音风格
 * @param {string} outputFormat - 输出格式
 * @returns {Promise<Response>} 流式音频响应
 */
export async function streamVoice(textChunks, concurrency, voiceName, rate, pitch, style, outputFormat) {
  const { readable, writable } = new TransformStream();
  
  try {
    // 等待流式管道完成以便捕获错误
    await pipeChunksToStream(writable.getWriter(), textChunks, concurrency, voiceName, rate, pitch, style, outputFormat);
    return new Response(readable, {
      headers: { "Content-Type": "audio/mpeg", ...makeCORSHeaders() }
    });
  } catch (error) {
    return errorResponse(`流式 TTS 失败: ${error.message}`, 500, "tts_generation_error");
  }
}

/**
 * 将文本块流式传输到响应流
 * @param {WritableStreamDefaultWriter} writer - 写入器
 * @param {string[]} chunks - 文本块
 * @param {number} concurrency - 并发数
 * @param {string} voiceName - 语音名称
 * @param {string} rate - 语速
 * @param {string} pitch - 音调
 * @param {string} style - 语音风格
 * @param {string} outputFormat - 输出格式
 */
async function pipeChunksToStream(writer, chunks, concurrency, voiceName, rate, pitch, style, outputFormat) {
  try {
    // 动态计算最优并发数
    const optimalConcurrency = Math.min(
      concurrency,
      chunks.length,
      Math.max(5, Math.ceil(chunks.length / 3)) // 至少分 3 批，最少并发 5
    );

    // 分批处理文本块以避免超出 EdgeOne 子请求限制
    for (let i = 0; i < chunks.length; i += optimalConcurrency) {
      const batch = chunks.slice(i, i + optimalConcurrency);
      const audioPromises = batch.map(chunk => 
        getAudioChunk(chunk, voiceName, rate, pitch, style, outputFormat)
      );

      // 仅等待当前批次完成
      const audioBlobs = await Promise.all(audioPromises);

      // 优化：并行转换 ArrayBuffer，减少等待时间
      const bufferPromises = audioBlobs.map(blob => blob.arrayBuffer());
      const buffers = await Promise.all(bufferPromises);

      // 将音频数据写入流
      for (const buffer of buffers) {
        writer.write(new Uint8Array(buffer));
      }
    }
  } catch (error) {
    writer.abort(error);
    throw new Error(`流式处理失败: ${error.message}`);
  } finally {
    writer.close();
  }
}

// =================================================================================
// 非流式语音生成
// =================================================================================

/**
 * 非流式语音生成
 * @param {string[]} textChunks - 文本块数组
 * @param {number} concurrency - 并发数
 * @param {string} voiceName - 语音名称
 * @param {string} rate - 语速
 * @param {string} pitch - 音调
 * @param {string} style - 语音风格
 * @param {string} outputFormat - 输出格式
 * @returns {Promise<Response>} 完整音频响应
 */
export async function getVoice(textChunks, concurrency, voiceName, rate, pitch, style, outputFormat) {
  const allAudioBlobs = [];
  
  try {
    // 动态计算最优并发数
    const optimalConcurrency = Math.min(
      concurrency,
      textChunks.length,
      Math.max(5, Math.ceil(textChunks.length / 3)) // 至少分 3 批，最少并发 5
    );

    // 非流式模式也使用批处理
    for (let i = 0; i < textChunks.length; i += optimalConcurrency) {
      const batch = textChunks.slice(i, i + optimalConcurrency);
      const audioPromises = batch.map(chunk => 
        getAudioChunk(chunk, voiceName, rate, pitch, style, outputFormat)
      );

      // 等待当前批次并收集结果
      const audioBlobs = await Promise.all(audioPromises);
      allAudioBlobs.push(...audioBlobs);
    }

    // 合并所有音频数据
    const concatenatedAudio = new Blob(allAudioBlobs, { type: 'audio/mpeg' });
    return new Response(concatenatedAudio, {
      headers: { "Content-Type": "audio/mpeg", ...makeCORSHeaders() }
    });
  } catch (error) {
    return errorResponse(`非流式 TTS 失败: ${error.message}`, 500, "tts_generation_error");
  }
}

// =================================================================================
// 单个音频块获取
// =================================================================================

/**
 * 获取单个文本块的音频数据
 * @param {string} text - 文本内容
 * @param {string} voiceName - 语音名称
 * @param {string} rate - 语速
 * @param {string} pitch - 音调
 * @param {string} style - 语音风格
 * @param {string} outputFormat - 输出格式
 * @returns {Promise<Blob>} 音频 Blob
 */
async function getAudioChunk(text, voiceName, rate, pitch, style, outputFormat) {
  const endpoint = await getEndpoint();
  const url = `https://${endpoint.r}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const ssml = getSsml(text, voiceName, rate, pitch, style);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": endpoint.t,
      "Content-Type": "application/ssml+xml",
      "User-Agent": "okhttp/4.5.0",
      "X-Microsoft-OutputFormat": outputFormat
    },
    body: ssml
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge TTS API 错误: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.blob();
}

// =================================================================================
// 请求参数处理
// =================================================================================

/**
 * 解析请求参数
 * @param {Request} request - HTTP 请求对象
 * @returns {Promise<Object>} 解析后的请求参数
 */
export async function parseRequestParams(request) {
  let requestBody = {};

  // 处理 GET 请求参数
  if (request.method === "GET") {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    requestBody = {
      input: params.get("input") || params.get("t"), // 兼容 t 参数
      voice: params.get("voice") || params.get("v"), // 兼容 v 参数
      model: params.get("model") || "tts-1",
      speed: parseFloat(params.get("speed") || params.get("r") || "1.0"),
      pitch: parseFloat(params.get("pitch") || params.get("p") || "1.0"),
      style: params.get("style") || params.get("s") || "general",
      stream: params.get("stream") === "true",
    };
  } else {
    // 处理 POST 请求
    try {
      requestBody = await request.json();
    } catch (err) {
      throw new Error(`JSON 解析错误: ${err.message}`);
    }
  }

  return requestBody;
}

/**
 * 验证和处理请求参数
 * @param {Object} requestBody - 请求体
 * @param {Object} OPENAI_VOICE_MAP - OpenAI 语音映射
 * @returns {Object} 处理后的参数
 */
export function processRequestParams(requestBody, OPENAI_VOICE_MAP) {
  const {
    model = "tts-1",
    input,
    voice = "shimmer",
    speed = 1.0,
    pitch = 1.0,
    style = "general",
    stream = false,
    concurrency = DEFAULT_CONFIG.CONCURRENCY,
    chunk_size = DEFAULT_CONFIG.CHUNK_SIZE,
    cleaning_options = {}
  } = requestBody;

  if (!input) {
    throw new Error("'input' 是必需参数");
  }

  // 合并默认清理选项
  const finalCleaningOptions = {
    remove_markdown: true,
    remove_emoji: true,
    remove_urls: true,
    remove_line_breaks: true,
    remove_citation_numbers: true,
    custom_keywords: "",
    ...cleaning_options
  };

  // 语音映射处理
  const modelVoice = !voice ? OPENAI_VOICE_MAP[model.replace('tts-1-', '')] : null;
  const finalVoice = modelVoice || voice;

  if (!finalVoice) {
    throw new Error(`无效的语音模型 - model: ${model}, voice: ${voice}`);
  }

  // 参数转换为 Microsoft TTS 格式
  const rate = ((speed - 1) * 100).toFixed(0);
  const finalPitch = ((pitch - 1) * 100).toFixed(0);
  const outputFormat = DEFAULT_CONFIG.OUTPUT_FORMAT;

  return {
    input,
    finalVoice,
    rate,
    finalPitch,
    style,
    outputFormat,
    stream,
    concurrency,
    chunk_size,
    finalCleaningOptions
  };
}
