require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const db = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const gachaRoutes = require('./routes/gacha');

async function start() {
  // 插件
  await fastify.register(cors, {
    origin: ['https://besideyou.top', 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  });

  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production'
  });

  // 鉴权装饰器
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: '未登录或登录已过期' });
    }
  });

  // 初始化数据库
  await db.init();

  // 路由
  fastify.register(authRoutes, { prefix: '/api/auth' });
  fastify.register(userRoutes, { prefix: '/api/user' });
  fastify.register(gachaRoutes, { prefix: '/api/gacha' });

  // 健康检查
  fastify.get('/api/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  // 启动
  const port = process.env.PORT || 3001;
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`Server running on port ${port}`);
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
