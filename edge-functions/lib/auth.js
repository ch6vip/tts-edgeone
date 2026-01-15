/**
 * EdgeOne Pages TTS - 认证模块
 * @version 1.0.0
 * @description 处理 API Key 验证和 Microsoft TTS Token 获取
 */

import { base64ToBytes, bytesToBase64 } from './utils.js';

// =================================================================================
// Token 缓存管理
// =================================================================================

/**
 * Token 缓存信息
 * @typedef {Object} TokenInfo
 * @property {Object} endpoint - 端点信息
 * @property {string} token - JWT Token
 * @property {number} expiredAt - 过期时间戳（秒）
 */

/** @type {TokenInfo} */
let tokenInfo = { endpoint: null, token: null, expiredAt: null };

/** @type {boolean} */
let tokenRefreshing = false;

/** @type {Promise<Object>|null} */
let tokenRefreshPromise = null;

// =================================================================================
// API Key 验证
// =================================================================================

/**
 * 验证 API Key
 * @param {Request} request - HTTP 请求对象
 * @param {string} apiKey - 配置的 API Key
 * @returns {boolean} 验证是否通过
 */
export function validateApiKey(request, apiKey) {
  if (!apiKey) return true; // 如果未配置 API Key，则跳过验证

  const url = new URL(request.url);
  
  // 1. 尝试从 Header 获取
  const authHeader = request.headers.get("authorization");
  let providedKey = null;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedKey = authHeader.slice(7);
  } 
  // 2. 如果 Header 没有，尝试从 URL 参数获取
  else {
    providedKey = url.searchParams.get("key") || url.searchParams.get("api_key");
  }

  // 3. 验证密钥
  return providedKey && providedKey === apiKey;
}

// =================================================================================
// Microsoft TTS Token 获取
// =================================================================================

/**
 * 获取 Microsoft TTS 服务端点和 Token
 * @description 优化版本，添加竞态保护，避免并发请求重复刷新 Token
 * @returns {Promise<Object>} 端点信息对象，包含 { r: region, t: token }
 */
export async function getEndpoint() {
  const now = Date.now() / 1000;
  const TOKEN_REFRESH_BEFORE_EXPIRY = 5 * 60; // 提前 5 分钟刷新 Token

  // 检查 Token 是否仍然有效
  if (tokenInfo.token && tokenInfo.expiredAt &&
    now < tokenInfo.expiredAt - TOKEN_REFRESH_BEFORE_EXPIRY) {
    return tokenInfo.endpoint;
  }

  // 竞态保护：如果正在刷新，等待现有刷新完成
  if (tokenRefreshing && tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  // 标记刷新中
  tokenRefreshing = true;

  // 创建刷新 Promise
  tokenRefreshPromise = (async () => {
    try {
      const endpointUrl = "https://dev.microsofttranslator.com/apps/endpoint?api-version=1.0";

      // 生成客户端 ID
      let clientId;
      try {
        clientId = crypto.randomUUID().replace(/-/g, "");
      } catch (e) {
        // 如果 crypto.randomUUID 不可用，使用备用方法
        clientId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }

      // 生成签名
      const signature = await sign(endpointUrl);

      // 请求端点
      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Accept-Language": "zh-Hans",
          "X-ClientVersion": "4.0.530a 5fe1dc6c",
          "X-UserId": "0f04d16a175c411e",
          "X-HomeGeographicRegion": "zh-Hans-CN",
          "X-ClientTraceId": clientId,
          "X-MT-Signature": signature,
          "User-Agent": "okhttp/4.5.0",
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": "0",
          "Accept-Encoding": "gzip"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取端点失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // 解析 JWT Token 获取过期时间
      let decodedJwt;
      try {
        const jwt = data.t.split(".")[1];
        const decoded = atob(jwt);
        decodedJwt = JSON.parse(decoded);
      } catch (e) {
        throw new Error(`JWT 解析失败: ${e.message}`);
      }

      // 更新 Token 缓存
      tokenInfo = {
        endpoint: data,
        token: data.t,
        expiredAt: decodedJwt.exp
      };

      return tokenInfo.endpoint;
    } catch (error) {
      throw new Error(`端点获取失败: ${error.message}`);
    } finally {
      tokenRefreshing = false;
      tokenRefreshPromise = null;
    }
  })();

  return tokenRefreshPromise;
}

/**
 * 生成 Microsoft Translator 签名
 * @param {string} urlStr - 要签名的 URL
 * @returns {Promise<string>} 签名字符串
 */
async function sign(urlStr) {
  const url = urlStr.split("://")[1];
  const encodedUrl = encodeURIComponent(url);

  // 生成 UUID
  let uuidStr;
  try {
    uuidStr = crypto.randomUUID().replace(/-/g, "");
  } catch (e) {
    // 如果 crypto.randomUUID 不可用，使用备用方法
    uuidStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  const formattedDate = (new Date()).toUTCString().replace(/GMT/, "").trim() + " GMT";

  // 构建待签名字符串
  const bytesToSign = `MSTranslatorAndroidApp${encodedUrl}${formattedDate}${uuidStr}`.toLowerCase();

  // 解码密钥并生成 HMAC 签名
  const decode = base64ToBytes("oik6PdDdMnOXemTbwvMn9de/h9lFnfBaCWbGMMZqqoSaQaqUOqjVGm5NqsmjcBI1x+sS9ugjB55HEJWRiFXYFw==");
  const signData = await hmacSha256(decode, bytesToSign);
  const signBase64 = bytesToBase64(signData);

  return `MSTranslatorAndroidApp::${signBase64}::${formattedDate}::${uuidStr}`;
}

/**
 * HMAC-SHA256 签名
 * @param {Uint8Array} key - 密钥
 * @param {string} data - 待签名数据
 * @returns {Promise<Uint8Array>} 签名结果
 */
async function hmacSha256(key, data) {
  // 检查 EdgeOne Pages 环境中的 crypto API
  if (!crypto || !crypto.subtle) {
    throw new Error("crypto.subtle API 不可用，EdgeOne Pages 环境可能不支持此功能");
  }

  try {
    // 确保 key 是 Uint8Array 格式
    const keyBuffer = key instanceof Uint8Array ? key : new Uint8Array(key);

    // 导入密钥
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

    // 确保数据是正确的格式
    const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    // 执行签名
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBuffer);
    return new Uint8Array(signature);
  } catch (e) {
    throw new Error(`HMAC 签名失败: ${e.message} | 详细信息: ${e.stack}`);
  }
}

/**
 * 清除 Token 缓存（用于测试或强制刷新）
 */
export function clearTokenCache() {
  tokenInfo = { endpoint: null, token: null, expiredAt: null };
  tokenRefreshing = false;
  tokenRefreshPromise = null;
}
