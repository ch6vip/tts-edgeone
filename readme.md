# 高性能 Edge TTS EdgeOne Pages 代理

这是一个部署在 EdgeOne Pages 上的高性能文本转语音（TTS）代理服务。它巧妙地将微软 Edge 强大且自然的语音合成服务，封装成了一个兼容 OpenAI API 格式的接口。这使得开发者可以无缝地将各种现有应用对接到这个免费、高质量的 TTS 服务上。

项目包含两个核心部分：

1. `edge-functions/index.js`: 部署在 EdgeOne Pages 上的核心服务脚本（Edge Functions）
2. `index.html`: 一个功能完备的网页，用于方便地测试和调用服务

---

## ✨ 功能亮点

- **🚀 OpenAI 兼容**: 完全模拟 OpenAI 的 `/v1/audio/speech` 接口，可被官方的 OpenAI SDK 或任何现有工具直接调用
- **🗣️ 高质量音色**: 利用微软 Edge TTS 提供的多种自然、流畅的神经网络语音
- **📡 STREAMING**: 支持**流式**和**标准**（非流式）两种响应模式，流式响应可极大降低长文本的首次播放延迟
- **🧠 智能文本清理**: 内置强大的"文本清理流水线"，可自动处理从 PDF 或网页复制的杂乱文本
- **🎛️ 灵活的参数配置**: 支持通过 API 请求动态调整所有核心参数
- **🌐 零依赖部署**: 脚本完全自包含，无需配置 KV、队列等任何外部服务
- **💻 便捷的测试工具**: 提供一个功能丰富的 `index.html`，让用户无需编写任何代码即可测试所有功能

---

## 🚀 部署指南

### 准备工作

- 一个 EdgeOne Pages 账户（完全免费）
- Git 仓库（GitHub、GitLab 等）

### 步骤一：准备代码

1. 将本项目的代码上传到你的 Git 仓库
2. 确保项目结构如下：
   ```
   your-repo/
   ├── edge-functions/
   │   └── index.js          # Edge Functions 代码
   ├── index.html            # 前端页面
   └── README.md     # 说明文档
   ```

### 步骤二：创建 EdgeOne Pages 项目

1. 登录到 EdgeOne Pages 控制台：https://pages.edgeone.ai/document/importing-a-git-repository
2. 点击 **创建项目**
3. 选择 **从 Git 仓库导入**
4. 连接你的 Git 账户并选择包含代码的仓库
5. 配置构建设置：
   - **构建命令**: 留空（因为是静态文件）
   - **输出目录**: 留空或填写 `.`
   - **根目录**: 留空

### 步骤三：配置环境变量

1. 在项目设置中，找到 **环境变量** 部分
2. 添加以下环境变量：
   - **变量名**: `API_KEY`
   - **变量值**: `hello`（或设置你自己的密钥）
   - **环境**: 选择 `Production`

### 步骤四：部署

1. 点击 **部署** 按钮
2. 等待部署完成
3. 部署成功后，你会得到一个访问 URL，需要绑定自定义域名

### 步骤五：测试

1. 访问你的 EdgeOne Pages URL
2. 在页面的"API 配置"部分，填入：
   - **API Base URL**: 你的 EdgeOne Pages URL
   - **API Key**: `hello`（或你设置的密钥）
3. 现在可以开始测试 TTS 功能了！

---

## 🛠️ API 使用指南

### 端点

`POST https://<你的域名>/api/v1/audio/speech`

### 认证

使用 `Bearer Token` 认证方式。将您的 API Key 放在 `Authorization` 请求头中。

`Authorization: Bearer YOUR_API_KEY`

### 请求体参数 (`JSON`)

| 参数 (Parameter)   | 类型 (Type) | 默认值 (Default)         | 描述 (Description)                                                |
| ------------------ | ----------- | ------------------------ | ----------------------------------------------------------------- |
| `model`            | `string`    | `"tts-1"`                | 模型 ID。支持 `tts-1`, `tts-1-hd`，或映射的音色如 `tts-1-alloy`。 |
| `input`            | `string`    | **必需**                 | 需要转换为语音的文本。**支持任意长度**。                          |
| `voice`            | `string`    | `"zh-CN-XiaoxiaoNeural"` | 直接指定微软的音色名称。当 `model` 参数未被映射时生效。           |
| `speed`            | `number`    | `1.0`                    | 语速。范围从 0.25 到 2.0。                                        |
| `pitch`            | `number`    | `1.0`                    | 音调。                                                            |
| `stream`           | `boolean`   | `false`                  | 是否使用流式响应。设为 `true` 可极大降低长文本的首次延迟。        |
| `concurrency`      | `number`    | `10`                     | 并发请求数。控制同时向微软服务器发送多少个文本块请求。            |
| `chunk_size`       | `number`    | `300`                    | 文本分块大小（字符数）。                                          |
| `cleaning_options` | `object`    | `{...}`                  | 一个包含文本清理开关的对象。                                      |

### cURL 示例

#### 1. 标准请求

```bash
curl --location 'https://<你的域名>/api/v1/audio/speech' \
--header 'Authorization: Bearer hello' \
--header 'Content-Type: application/json' \
--data '{
    "model": "tts-1-alloy",
    "input": "你好，这是一个标准的语音合成请求。"
}' \
--output standard.mp3
```

#### 2. 流式请求 (用于长文本)

```bash
curl --location 'https://<你的域名>/api/v1/audio/speech' \
--header 'Authorization: Bearer hello' \
--header 'Content-Type: application/json' \
--data '{
    "model": "tts-1-nova",
    "input": "这是一个流式请求的示例，对于较长的文本，你能更快地听到声音的开头部分。",
    "stream": true
}' \
--output streaming.mp3
```

---

## 📁 项目结构说明

- **`edge-functions/api/v1/audio/speech.js`**: 核心 TTS API 处理逻辑
- **`edge-functions/api/v1/models.js`**: 模型列表 API 端点
- **`index.html`**: 前端测试页面，提供可视化界面来测试 API 功能
- **`README.md`**: EdgeOne Pages 部署说明文档

### 📂 完整文件结构

```
edgetts-edgeone-pages/
├── edge-functions/
│   └── api/
│       └── v1/
│           ├── models.js           # GET /api/v1/models
│           └── audio/
│               └── speech.js       # POST /api/v1/audio/speech
├── index.html                      # 前端测试页面
├── README-EdgeOne.md              # 详细说明文档
└── deploy.md                      # 快速部署指南
```

---

## ⚠️ 重要限制

- **字符数限制**: 单次请求的文本长度建议不超过 **12 万字符**
- **并发限制**: 默认并发数为 10，可根据需要调整
- **CPU 时间**: EdgeOne Pages Edge Functions 单次执行限制为 200ms CPU 时间

---

## 🆘 故障排除

### 1. 部署失败

- 检查 Git 仓库是否包含正确的文件结构
- 确保 `edge-functions/index.js` 文件存在且语法正确

### 2. API 调用失败

- 检查环境变量 `API_KEY` 是否正确设置
- 确认请求头中的 Authorization 格式正确

### 3. 音频生成失败

- 检查输入文本是否过长
- 尝试减少并发数或分块大小
