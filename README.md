# DdddToBybitGateway

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://gitlab.com/DdDdCommunity/dddd2bybitgateway)

一个运行在 Cloudflare Workers 上的 Bybit 交易机器人，支持一键部署。

## 功能特点

- 基于 Cloudflare Workers 运行，无需服务器
- 支持 Bybit 交易所 API
- 通过 Webhook 接收交易信号
- 自动化交易执行
- 实时日志记录

## 快速开始

### 方式一：一键部署

1. 点击上方的 "Deploy to Cloudflare Workers" 按钮
2. 登录您的 Cloudflare 账号
3. 在部署界面中设置以下必要的环境变量：
   - `BYBIT_API_KEY`: 您的 Bybit API Key
   - `BYBIT_API_SECRET`: 您的 Bybit API Secret
   - `WEBHOOK_TOKEN`: 用于验证 webhook 请求的安全令牌
4. 点击部署按钮，系统会自动完成配置和部署

### 方式二：手动部署

1. 克隆仓库
```bash
git clone https://gitlab.com/DdDdCommunity/dddd2bybitgateway.git
cd dddd2bybitgateway
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
# 复制配置文件模板
cp wrangler.toml.example wrangler.toml

# 编辑 wrangler.toml，填入您的配置信息：
# - BYBIT_API_KEY: 您的 Bybit API Key
# - BYBIT_API_SECRET: 您的 Bybit API Secret
# - WEBHOOK_TOKEN: 用于验证 webhook 请求的安全令牌
```

4. 部署到 Cloudflare Workers
```bash
npx wrangler deploy
```

## 配置说明

### Bybit API 配置
1. 登录您的 Bybit 账号
2. 前往 API 管理页面创建新的 API Key
3. 确保 API Key 具有适当的交易权限
4. 将 API Key 和 Secret 配置到环境变量中

### Webhook 配置
- Webhook URL 格式：`https://your-worker.workers.dev/webhook`
- 请求需要包含 `X-Webhook-Token` header，值为您配置的 `WEBHOOK_TOKEN`
- 支持的信号格式：
```json
{
  "symbol": "BTCUSDT",
  "side": "Buy",
  "quantity": "0.001",
  "price": "50000"
}
```

## 安全建议

1. 永远不要在代码中直接存储 API 密钥
2. 使用强密码作为 Webhook Token
3. 定期轮换 API 密钥和 Webhook Token
4. 建议在正式环境使用前进行充分测试

## 开发

### 本地测试
```bash
npm run dev
```

### 运行测试
```bash
npm test
```

## 常见问题

1. Q: 部署后收到 401 错误
   A: 检查 Webhook Token 是否正确配置

2. Q: 交易执行失败
   A: 确认 API Key 权限是否正确，资金是否充足

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

MIT License

Copyright (c) 2024 dddd2bybitgateway

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 作者

- 主要维护者：[DdDdCommunity](https://gitlab.com/DdDdCommunity)
- 项目主页：[dddd2bybitgateway](https://gitlab.com/DdDdCommunity/dddd2bybitgateway)

## 更新日志

### [0.3.0] - 2025-04-10
- 初始版本发布
- 支持基本的交易功能
- 添加 Cloudflare Workers 一键部署支持
