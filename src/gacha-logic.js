// 抽卡核心逻辑 - 去重 + 保底 + 扣token
// 已获得的唯一卡片（从 localStorage 读取）
var owned = JSON.parse(localStorage.getItem('bsy_collection') || '[]');
// 保底计数器
var pityBg = parseInt(localStorage.getItem('bsy_pity_bg') || '0');
var pityEmotion = parseInt(localStorage.getItem('bsy_pity_emotion') || '0');

// Token 管理
function getTokens() {
  return parseInt(localStorage.getItem('bsy_tokens') || '1600');
}
function setTokens(n) {
  localStorage.setItem('bsy_tokens', n.toString());
  var el = document.getElementById('tokenDisplay');
  if (el) el.textContent = n;
}
function canAfford(cost) {
  return getTokens() >= cost;
}
function spendTokens(cost) {
  var t = getTokens();
  t -= cost;
  setTokens(t);
  return t;
}
function addTokens(amount) {
  var t = getTokens();
  t += amount;
  setTokens(t);
  return t;
}

// 全量池子定义
var fullPool = [
  { name:'撒娇', type:'emotion', rarity:'SSR', stars:5, theme:'warm', img:'../assets/gacha/%E6%92%92%E5%A8%87%E5%8D%A1%E9%9D%A2.PNG', weight:2, unique:true },
  { name:'生气', type:'emotion', rarity:'SSR', stars:5, theme:'cold', img:'../assets/gacha/%E7%94%9F%E6%B0%94%E5%8D%A1%E9%9D%A2.PNG', weight:2, unique:true },
  { name:'撒娇背景', type:'bg', rarity:'SR', stars:4, theme:'soft', img:'../assets/background/%E6%92%92%E5%A8%87%E8%83%8C%E6%99%AF.jpg', effect:'解锁首页背景', weight:4, unique:true },
  { name:'生气背景', type:'bg', rarity:'SR', stars:4, theme:'dark', img:'../assets/background/%E7%94%9F%E6%B0%94%E8%83%8C%E6%99%AF.PNG', effect:'解锁首页背景', weight:4, unique:true },
  { name:'超出算法的真心', type:'prop', rarity:'SSR', stars:5, theme:'warm', img:'', effect:'亲密度 +20', weight:3 },
  { name:'闪烁的光标', type:'prop', rarity:'SR', stars:4, theme:'cold', img:'', effect:'亲密度 +15', weight:10 },
  { name:'手写信封', type:'prop', rarity:'SR', stars:4, theme:'warm', img:'', effect:'亲密度 +10', weight:15 },
  { name:'晚安吻', type:'prop', rarity:'R', stars:3, theme:'soft', img:'', effect:'亲密度 +3', weight:30 },
  { name:'50 token', type:'token', rarity:'N', stars:2, theme:'warm', img:'', effect:'+50 token', weight:35 },
  { name:'100 token', type:'token', rarity:'R', stars:3, theme:'warm', img:'', effect:'+100 token', weight:20 }
];

// 生成当前有效池子（移除已获得的唯一卡）
function getActivePool() {
  return fullPool.filter(function(c) {
    if (c.unique && owned.indexOf(c.name) !== -1) return false;
    return true;
  });
}

function weightedRandom() {
  var pool = getActivePool();
  if (pool.length === 0) return fullPool[fullPool.length - 1];
  // 保底检查
  pityBg++; pityEmotion++;
  // 30抽背景保底
  if (pityBg >= 30) {
    var bgs = pool.filter(function(c){ return c.type === 'bg'; });
    if (bgs.length > 0) {
      var pick = bgs[Math.floor(Math.random() * bgs.length)];
      onPull(pick);
      return pick;
    }
  }
  // 40抽情绪保底
  if (pityEmotion >= 40) {
    var emos = pool.filter(function(c){ return c.type === 'emotion'; });
    if (emos.length > 0) {
      var pick = emos[Math.floor(Math.random() * emos.length)];
      onPull(pick);
      return pick;
    }
  }
  // 正常权重抽取
  var total = 0;
  for (var i = 0; i < pool.length; i++) total += pool[i].weight;
  var r = Math.random() * total;
  for (var i = 0; i < pool.length; i++) {
    r -= pool[i].weight;
    if (r <= 0) { onPull(pool[i]); return pool[i]; }
  }
  onPull(pool[pool.length - 1]);
  return pool[pool.length - 1];
}

function onPull(card) {
  // 重置保底计数器
  if (card.type === 'bg') pityBg = 0;
  if (card.type === 'emotion') pityEmotion = 0;
  // 唯一卡记录到已获得
  if (card.unique && owned.indexOf(card.name) === -1) {
    owned.push(card.name);
    localStorage.setItem('bsy_collection', JSON.stringify(owned));
  }
  // token卡直接加回余额
  if (card.name === '50 token') addTokens(50);
  if (card.name === '100 token') addTokens(100);
  // 保存保底计数
  localStorage.setItem('bsy_pity_bg', pityBg.toString());
  localStorage.setItem('bsy_pity_emotion', pityEmotion.toString());
}

// 页面加载时同步token显示
(function() {
  var el = document.getElementById('tokenDisplay');
  if (el) el.textContent = getTokens();
})();