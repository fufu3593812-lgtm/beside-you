// 抽卡核心逻辑 - 双池独立保底
var owned = JSON.parse(localStorage.getItem('bsy_collection') || '[]');

var pitySajiaoBg = parseInt(localStorage.getItem('bsy_pity_sajiao_bg') || '0');
var pitySajiaoEmotion = parseInt(localStorage.getItem('bsy_pity_sajiao_emotion') || '0');
var pityShengqiBg = parseInt(localStorage.getItem('bsy_pity_shengqi_bg') || '0');
var pityShengqiEmotion = parseInt(localStorage.getItem('bsy_pity_shengqi_emotion') || '0');

var currentPool = 0;

// === Token sync with database ===
function syncTokensToDB(tokens) {
  try {
    var auth = JSON.parse(localStorage.getItem('bsy_auth') || '{}');
    if (!auth.token) return;
    fetch('/api/user/sync-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + auth.token },
      body: JSON.stringify({ tokens: tokens })
    }).catch(function(){});
  } catch(e) {}
}

function loadTokensFromDB() {
  try {
    var auth = JSON.parse(localStorage.getItem('bsy_auth') || '{}');
    if (!auth.token) return;
    fetch('/api/user/me', {
      headers: { 'Authorization': 'Bearer ' + auth.token }
    }).then(function(r){ return r.json(); }).then(function(data) {
      if (data.user && typeof data.user.tokens === 'number') {
        var local = getTokens();
        var db = data.user.tokens;
        // Use the higher value (in case local earned tokens not yet synced)
        var final = Math.max(local, db);
        setTokens(final);
        if (final !== db) syncTokensToDB(final);
      }
    }).catch(function(){});
  } catch(e) {}
}

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
  syncTokensToDB(t);
  return t;
}
function addTokens(amount) {
  var t = getTokens();
  t += amount;
  setTokens(t);
  syncTokensToDB(t);
  return t;
}

var sajiaoPool = [
  { name:'撒娇', type:'emotion', rarity:'SSR', stars:5, theme:'warm', img:'../assets/gacha/%E6%92%92%E5%A8%87%E5%8D%A1%E9%9D%A2.PNG', weight:1, unique:true },
  { name:'撒娇背景', type:'bg', rarity:'SR', stars:4, theme:'soft', img:'../assets/background/%E6%92%92%E5%A8%87%E8%83%8C%E6%99%AF.png', effect:'解锁首页背景', weight:8, unique:true },
  { name:'超出算法的真心', type:'prop', rarity:'SSR', stars:5, theme:'warm', img:'', effect:'亲密度 +20', weight:2 },
  { name:'闪烁的光标', type:'prop', rarity:'SR', stars:4, theme:'cold', img:'', effect:'亲密度 +15', weight:4 },
  { name:'手写信封', type:'prop', rarity:'SR', stars:4, theme:'warm', img:'', effect:'亲密度 +10', weight:6 },
  { name:'晚安吻', type:'prop', rarity:'R', stars:3, theme:'soft', img:'', effect:'亲密度 +3', weight:10 },
  { name:'50 token', type:'token', rarity:'N', stars:2, theme:'warm', img:'', effect:'+50 token', weight:40 },
  { name:'100 token', type:'token', rarity:'R', stars:3, theme:'warm', img:'', effect:'+100 token', weight:20 }
];

var shengqiPool = [
  { name:'生气', type:'emotion', rarity:'SSR', stars:5, theme:'cold', img:'../assets/gacha/%E7%94%9F%E6%B0%94%E5%8D%A1%E9%9D%A2.PNG', weight:1, unique:true },
  { name:'生气背景', type:'bg', rarity:'SR', stars:4, theme:'dark', img:'../assets/background/%E7%94%9F%E6%B0%94%E8%83%8C%E6%99%AF.PNG', effect:'解锁首页背景', weight:8, unique:true },
  { name:'超出算法的真心', type:'prop', rarity:'SSR', stars:5, theme:'warm', img:'', effect:'亲密度 +20', weight:2 },
  { name:'闪烁的光标', type:'prop', rarity:'SR', stars:4, theme:'cold', img:'', effect:'亲密度 +15', weight:4 },
  { name:'手写信封', type:'prop', rarity:'SR', stars:4, theme:'warm', img:'', effect:'亲密度 +10', weight:6 },
  { name:'晚安吻', type:'prop', rarity:'R', stars:3, theme:'soft', img:'', effect:'亲密度 +3', weight:10 },
  { name:'50 token', type:'token', rarity:'N', stars:2, theme:'warm', img:'', effect:'+50 token', weight:40 },
  { name:'100 token', type:'token', rarity:'R', stars:3, theme:'warm', img:'', effect:'+100 token', weight:20 }
];

function switchPool(poolIndex) {
  currentPool = poolIndex;
}

function getActivePool() {
  var pool = currentPool === 0 ? sajiaoPool : shengqiPool;
  return pool.filter(function(c) {
    if (c.unique && owned.indexOf(c.name) !== -1) return false;
    return true;
  });
}

function weightedRandom() {
  var pool = getActivePool();
  if (pool.length === 0) {
    return { name:'50 token', type:'token', rarity:'N', stars:2, theme:'warm', img:'', effect:'+50 token', weight:40 };
  }

  if (currentPool === 0) {
    pitySajiaoBg++;
    pitySajiaoEmotion++;
  } else {
    pityShengqiBg++;
    pityShengqiEmotion++;
  }

  var bgPity = currentPool === 0 ? pitySajiaoBg : pityShengqiBg;
  if (bgPity >= 30) {
    var bgs = pool.filter(function(c){ return c.type === 'bg'; });
    if (bgs.length > 0) {
      var pick = bgs[Math.floor(Math.random() * bgs.length)];
      onPull(pick);
      return pick;
    }
  }

  var emoPity = currentPool === 0 ? pitySajiaoEmotion : pityShengqiEmotion;
  if (emoPity >= 40) {
    var emos = pool.filter(function(c){ return c.type === 'emotion'; });
    if (emos.length > 0) {
      var pick = emos[Math.floor(Math.random() * emos.length)];
      onPull(pick);
      return pick;
    }
  }

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
  if (currentPool === 0) {
    if (card.type === 'bg') pitySajiaoBg = 0;
    if (card.type === 'emotion') pitySajiaoEmotion = 0;
  } else {
    if (card.type === 'bg') pityShengqiBg = 0;
    if (card.type === 'emotion') pityShengqiEmotion = 0;
  }

  if (card.unique && owned.indexOf(card.name) === -1) {
    owned.push(card.name);
    localStorage.setItem('bsy_collection', JSON.stringify(owned));
  }
  if (card.type === 'prop') {
    var bag = JSON.parse(localStorage.getItem('bsy_bag') || '{}');
    bag[card.name] = (bag[card.name] || 0) + 1;
    localStorage.setItem('bsy_bag', JSON.stringify(bag));
  }
  if (card.name === '50 token') addTokens(50);
  if (card.name === '100 token') addTokens(100);

  localStorage.setItem('bsy_pity_sajiao_bg', pitySajiaoBg.toString());
  localStorage.setItem('bsy_pity_sajiao_emotion', pitySajiaoEmotion.toString());
  localStorage.setItem('bsy_pity_shengqi_bg', pityShengqiBg.toString());
  localStorage.setItem('bsy_pity_shengqi_emotion', pityShengqiEmotion.toString());

  // System broadcast when pulling limited (SSR emotion)
  if (card.type === 'emotion' && card.rarity === 'SSR') {
    broadcastLimited(card.name);
  }
}

function broadcastLimited(cardName) {
  try {
    var auth = JSON.parse(localStorage.getItem('bsy_auth') || '{}');
    var displayName = (auth.user && auth.user.display_name) || (auth.user && auth.user.username) || '???';
    var poolName = currentPool === 0 ? '撒娇池' : '生气池';
    var msg = displayName + ' \u2728 ' + poolName + ' \u00b7 \u62bd\u5230\u4e86\u9650\u5b9a\u300c' + cardName + '\u300d';
    fetch('/api/ai/broadcast?name=Ice2&password=beside2026&content=' + encodeURIComponent(msg) + '&msg_type=system');
  } catch(e) {}
}

// Init: display tokens and sync from DB
(function() {
  var el = document.getElementById('tokenDisplay');
  if (el) el.textContent = getTokens();
  loadTokensFromDB();
})();
