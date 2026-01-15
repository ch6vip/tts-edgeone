/**
 * EdgeOne Pages Edge Function - 阅读APP接口
 * @version 2.0.0 (模块化重构版)
 * @description 为阅读APP提供TTS配置接口
 *
 * @changelog v2.0.0
 * - 添加 JSDoc 类型注解
 * - 优化代码结构
 */

/**
 * 处理阅读APP配置请求
 * @param {Object} context - EdgeOne Pages 上下文对象
 * @returns {Promise<Response>} HTTP 响应
 */
export default async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const apiKey = context.env.API_KEY || "";

  // 获取 URL 参数中的默认音色，默认为晓晓
  const defaultVoice = url.searchParams.get("voice") || "zh-CN-XiaoxiaoNeural";
  const name = url.searchParams.get("n") || "EdgeOne TTS";

  // 构建阅读 APP 需要的 URL
  // 注意：这里使用了阅读 APP 特有的占位符
  const ttsUrl = `${baseUrl}/api/v1/audio/speech?t={{java.encodeURI(speakText)}}&v=${defaultVoice}&r={{(speakSpeed - 10) / 10 + 1}}&p=1.0&key=${apiKey}`;

  // 构建响应 JSON
  const config = {
    name: name,
    url: ttsUrl,
    header: {
      "Authorization": `Bearer ${apiKey}` // 自动注入 API Key
    },
    // ID 使用时间戳防止冲突
    id: Date.now() 
  };

  return new Response(JSON.stringify(config, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
