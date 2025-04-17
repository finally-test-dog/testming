export interface Env {
  BYBIT_API_KEY: string;
  BYBIT_API_SECRET: string;
  WEBHOOK_TOKEN: string;
}

// 订单响应接口
interface OrderResponse {
  retCode: number;
  retMsg: string;
  result?: any;
}

// UTA 仓位信息接口
interface UtaPosition {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: string;
  positionValue: string;
  entryPrice: string;
  liqPrice: string;
  markPrice: string;
  leverage: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
  positionStatus: 'Normal' | 'Liq' | 'Adl';
  autoAddMargin: boolean;
  positionIdx: number;
  tradeMode: 0 | 1; // 0: 逐仓, 1: 全仓
}

interface WebhookPayload {
  event: 'custom' | 'listing' | 'delisting' | 'verify' | 'account' | 'positions';
  data: {
    endpoint?: string;  // Bybit API endpoint
    method?: 'GET' | 'POST';  // HTTP 方法
    params?: Record<string, any>;  // API 参数
    symbol?: string;
    price?: number;
    quantity?: number;
    orderType?: 'Market' | 'Limit';
    token?: string;
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    console.log(`[${requestId}] 收到请求:`, {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
    });

    try {
      // 验证请求方法
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({
          retCode: 405,
          retMsg: 'Method Not Allowed',
          requestId,
          timestamp: new Date().toISOString(),
        }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 解析请求体
      let payload: WebhookPayload;
      try {
        payload = await request.json();
      } catch (e) {
        return new Response(JSON.stringify({
          retCode: 400,
          retMsg: 'Invalid JSON payload'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 验证 Webhook Token
      if (!payload.data.token || payload.data.token !== env.WEBHOOK_TOKEN) {
        return new Response(JSON.stringify({
          retCode: 401,
          retMsg: 'Unauthorized',
          requestId,
          timestamp: new Date().toISOString(),
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 处理不同事件类型
      let result;
      try {
        switch (payload.event) {
          case 'listing':
            result = await handleListing(payload.data, env);
            break;
          case 'delisting':
            result = await handleDelisting(payload.data, env);
            break;
          case 'verify':
            result = await handleVerification(env);
            break;
          case 'account':
            result = await getUtaAccountInfo(env);
            break;
          case 'positions':
            result = await getUtaPositions(env, payload.data.symbol);
            break;
          case 'custom':
            if (!payload.data.endpoint) {
              throw new Error('Endpoint is required for custom API calls');
            }
            result = await handleCustomRequest(payload.data, env);
            break;
          default:
            return new Response(JSON.stringify({
              retCode: 400,
              retMsg: 'Invalid JSON payload',
              requestId,
              timestamp: new Date().toISOString(),
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
        }
      } catch (error) {
        console.error(`[${requestId}] 处理请求时出错:`, error);
        return new Response(JSON.stringify({
          retCode: 500,
          retMsg: error.message,
          requestId,
          timestamp: new Date().toISOString(),
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`[${requestId}] 请求处理完成, 耗时: ${Date.now() - startTime}ms`);
      return new Response(JSON.stringify({
        ...result,
        requestId,
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error(`[${requestId}] 全局捕获异常:`, error);
      return new Response(JSON.stringify({
        retCode: 500,
        retMsg: 'Internal Server Error',
        error: error.message,
        requestId,
        timestamp: new Date().toISOString(),
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};

// 验证函数
async function handleVerification(env: Env): Promise<{
  retCode: number;
  retMsg: string;
  result?: {
    status: string;
    bybitStatus: string;
    workerStatus: string;
    timestamp: string;
  };
}> {
  try {
    // 测试Bybit连接
    const endpoint = 'https://api.bybit.com/v5/market/time';
    const response = await fetch(endpoint);

    // 首先读取响应文本
    const responseText = await response.text();
    console.log('Bybit market time API返回原始响应:', responseText);

    if (!response.ok) {
      return {
        retCode: 500,
        retMsg: 'Bybit API connection failed',
      };
    }

    // 然后解析JSON
    const data = JSON.parse(responseText);
    const bybitStatus = data.retCode === 0 ? 'connected' : 'failed';

    return {
      retCode: 0,
      retMsg: 'OK',
      result: {
        status: 'verified',
        bybitStatus,
        workerStatus: 'running',
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      retCode: 500,
      retMsg: `Verification failed: ${err.message}`,
    };
  }
}

// UTA 账户信息查询
async function getUtaAccountInfo(env: Env): Promise<any> {
  const endpoint = 'https://api.bybit.com/v5/account/wallet-balance';
  const params = {
    accountType: 'UNIFIED',
  };

  console.log('准备请求Bybit账户信息:', { endpoint, params });

  try {
    const response = await bybitApiRequest('GET', endpoint, params, env);
    const responseText = await response.text();
    console.log('Bybit getUtaAccountInfo API返回原始响应:', responseText);

    if (!response.ok) {
      console.error('Bybit API请求失败:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText
      });
      throw new Error(`Failed to fetch account info: ${response.status} ${response.statusText}`);
    }

    const data = JSON.parse(responseText);
    if (data.retCode !== 0) {
      console.error('Bybit API业务错误:', data);
      throw new Error(`Bybit error: ${data.retMsg} (code: ${data.retCode})`);
    }

    console.log('账户信息获取成功:', data);
    return data;
  } catch (error) {
    console.error('获取账户信息时发生异常:', error);
    throw error;
  }
}

// UTA 仓位信息查询
async function getUtaPositions(env: Env, symbol?: string): Promise<any> {
  const endpoint = 'https://api.bybit.com/v5/position/list';
  const params: Record<string, any> = {
    category: 'linear',
    settleCoin: 'USDT'
  };

  if (symbol) {
    params.symbol = symbol;
  }

  const response = await bybitApiRequest('GET', endpoint, params, env);

  if (!response.ok) {
    throw new Error(`Failed to fetch positions: ${response.status}`);
  }

  const data = await response.json();
  console.log('Bybit getUtaPositions API返回原始响应:', data);
  if (data.retCode !== 0) {
    throw new Error(`Bybit error: ${data.retMsg}`);
  }

  // 过滤有效仓位
  if (data.result && data.result.list) {
    data.result.list = data.result.list.filter(
      (pos: any) => parseFloat(pos.size) > 0
    );
  }

  return data;
}

// Bybit API 统一请求方法
async function bybitApiRequest(
  method: 'GET' | 'POST',
  endpoint: string,
  params: Record<string, any>,
  env: Env
): Promise<Response> {
  const timestamp = Date.now().toString();
  const recvWindow = '5000';

  let queryString = '';
  if (method === 'GET') {
    // 按照键名排序参数
    queryString = Object.keys(params)
      .sort()  // 添加排序
      .filter(key => params[key] !== undefined)
      .map(key => `${key}=${params[key]}`)
      .join('&');
  }

  // 打印完整的签名字符串用于调试
  const signatureBase = `${timestamp}${env.BYBIT_API_KEY}${recvWindow}${queryString}`;
  console.log('Signature base string:', signatureBase);

  const signature = await generateSignature(
    params,
    env.BYBIT_API_SECRET,
    timestamp,
    recvWindow,
    method,
    env.BYBIT_API_KEY
  );

  const url = new URL(endpoint);
  if (method === 'GET' && queryString) {
    url.search = queryString;
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-BAPI-API-KEY': env.BYBIT_API_KEY,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-RECV-WINDOW': recvWindow,
    'X-BAPI-SIGN': signature
  };

  const requestOptions: RequestInit = {
    method,
    headers,
  };

  if (method === 'POST') {
    requestOptions.body = JSON.stringify(params);
  }

  return fetch(url.toString(), requestOptions);
}

async function generateSignature(
  params: Record<string, any>,
  apiSecret: string,
  timestamp: string,
  recvWindow: string = '5000',
  method: 'GET' | 'POST' = 'GET',
  apiKey: string
): Promise<string> {
  let signString = `${timestamp}${apiKey}${recvWindow}`;

  if (method === 'GET') {
    // 按照键名排序参数
    const sortedParams = Object.keys(params)
      .sort()  // 添加排序
      .filter(key => params[key] !== undefined)
      .map(key => `${key}=${params[key]}`)
      .join('&');

    if (sortedParams) {
      signString += sortedParams;
    }
  } else {
    signString += JSON.stringify(params);
  }

  console.log('Final signature string:', signString);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signString)
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 处理上架事件的函数
async function handleListing(
  data: WebhookPayload['data'],
  env: Env
): Promise<OrderResponse> {
  if (!data.symbol) {
    throw new Error('Symbol is required for trading');
  }

  return placeOrder({
    symbol: data.symbol,
    side: 'Buy',
    price: data.price,
    quantity: data.quantity || 1, // 默认数量为1
    orderType: data.orderType || (data.price ? 'Limit' : 'Market'),
    env,
  });
}

// 处理下架事件的函数
async function handleDelisting(
  data: WebhookPayload['data'],
  env: Env
): Promise<OrderResponse> {
  if (!data.symbol) {
    throw new Error('Symbol is required for trading');
  }

  return placeOrder({
    symbol: data.symbol,
    side: 'Sell',
    price: data.price,
    quantity: data.quantity || 1, // 默认数量为1
    orderType: data.orderType || (data.price ? 'Limit' : 'Market'),
    env,
  });
}

// 使用Bybit API下单的函数 (更新为v5版本)
async function placeOrder({
  symbol,
  side,
  price,
  quantity,
  orderType,
  env,
}: {
  symbol: string;
  side: 'Buy' | 'Sell';
  price?: number;
  quantity: number;
  orderType: 'Market' | 'Limit';
  env: Env;
}): Promise<OrderResponse> {
  const endpoint = 'https://api.bybit.com/v5/order/create';
  const params: Record<string, any> = {
    category: 'linear',
    symbol,
    side,
    orderType,
    qty: quantity.toString(),
    positionIdx: side === "Buy" ? 1 : 2,
    // timeInForce: 'GTC',
  };

  // 限价单需要价格参数
  if (orderType === 'Limit' && price) {
    params.price = price.toString();
  }

  const response = await bybitApiRequest('POST', endpoint, params, env);
  if (!response.ok) {
    const errorResponse = await response.json();
    throw new Error(`Failed to place order: ${errorResponse.retMsg}`);
  }

  return response.json();
}

// 添加通用请求处理函数
async function handleCustomRequest(
  data: WebhookPayload['data'],
  env: Env
): Promise<any> {
  const { endpoint, method = 'GET', params = {} } = data;

  // 确保endpoint是完整的URL
  const fullEndpoint = endpoint.startsWith('http')
    ? endpoint
    : `https://api.bybit.com${endpoint}`;

  try {
    const response = await bybitApiRequest(
      method as 'GET' | 'POST',
      fullEndpoint,
      params,
      env
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Bybit API error: ${errorData.retMsg}`);
    }
    const result = response.json();
    console.log('Bybit 通用 API返回原始响应:', result);
    return result;
  } catch (error) {
    console.error('Custom request failed:', error);
    throw error;
  }
}