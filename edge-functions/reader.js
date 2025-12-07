export default async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const apiKey = context.env.API_KEY || ""; // 获取配置的 API Key

  // 获取 URL 参数中的默认音色，默认为晓晓
  const defaultVoice = url.searchParams.get("voice") || "zh-CN-XiaoxiaoNeural";
  const name = url.searchParams.get("n") || "EdgeOne TTS";

  // 构建阅读 APP 需要的 URL
  // 注意：这里使用了阅读 APP 特有的占位符
// 修改点：在 URL 末尾添加了 &key=${apiKey}
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