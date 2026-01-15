/**
 * 错误响应统一处理
 * @description 提供统一的错误响应生成函数，确保 API 错误格式一致
 */

import { makeCORSHeaders } from './cors.js';

/**
 * 生成标准化的错误响应
 * @param {string} message - 错误消息
 * @param {number} status - HTTP 状态码
 * @param {string} code - 错误代码
 * @param {string} type - 错误类型
 * @returns {Response} 错误响应对象
 */
export function errorResponse(message, status = 500, code = null, type = "api_error") {
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
