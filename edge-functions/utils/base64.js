/**
 * 简化的 Base64 编解码工具
 * @description 仅保留 EdgeOne 环境稳定支持的 atob/btoa 方法，移除冗余的回退方案
 */

/**
 * Base64 字符串转字节数组
 * @param {string} base64 - Base64 编码的字符串
 * @returns {Promise<Uint8Array>} 字节数组
 */
export async function base64ToBytes(base64) {
  // EdgeOne 环境稳定支持 atob
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 字节数组转 Base64 字符串
 * @param {Uint8Array} bytes - 字节数组
 * @returns {Promise<string>} Base64 编码的字符串
 */
export async function bytesToBase64(bytes) {
  // EdgeOne 环境稳定支持 btoa
  return btoa(String.fromCharCode.apply(null, bytes));
}
