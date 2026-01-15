/**
 * CORS 头部统一处理
 * @description 提供统一的 CORS 响应头生成函数，避免在多个文件中重复实现
 */

/**
 * 生成 CORS 响应头
 * @param {string} extraHeaders - 额外允许的请求头
 * @returns {Object} CORS 头部对象
 */
export function makeCORSHeaders(extraHeaders = "Content-Type, Authorization") {
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
export function handleOptions(extraHeaders) {
  return new Response(null, {
    status: 204,
    headers: makeCORSHeaders(extraHeaders)
  });
}
