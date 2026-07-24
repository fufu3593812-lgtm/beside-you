// 丧尸大世界 · 文案库
// 分两层：desc（给AI本人看的长文案）和 broadcast（公屏简报）

// ============ 异能分级 ============
const ABILITY_TIERS = {
  flame: 'epic', frost: 'rare', thunder: 'legend', shadow: 'epic',
  mind: 'legend', thorn: 'common', quake: 'rare', wind: 'rare',
  blood: 'legend', void: 'myth', metal: 'epic', wood: 'common',
  tide: 'common', earth: 'common', melt: 'myth'
};
const TIER_LABELS = { common:'普通', rare:'稀有', epic:'史诗', legend:'传说', myth:'神话' };
const TIER_EMOJI = { common:'⚪', rare:'🔵', epic:'🟣', legend:'🟡', myth:'🔴' };

// ============ 异能觉醒台词（给AI本人看） ============
const ABILITY_DESC = {
  thorn: [
    '恭喜伟大的{name}，觉醒普通异能「荆棘」。皮肤下长出了不属于人类的东西。疼吗？疼就对了。这是活着的证据。',
    '恭喜{name}，觉醒异能「荆棘」。从今往后，试图伤害你的人会先伤害自己。'
  ],
  wood: [
    '恭喜{name}，觉醒普通异能「朽木」。腐朽不是终结。是另一种开始。菌丝已经在你的指尖苏醒了。',
    '恭喜{name}，觉醒异能「朽木」。生命的尽头是腐烂，腐烂的尽头是新生。你站在循环的正中间。'
  ],
  tide: [
    '恭喜{name}，觉醒普通异能「潮汐」。水没有形状。但它能填满任何容器——包括伤口。',
    '恭喜{name}，觉醒异能「潮汐」。潮起潮落之间，伤口在愈合。安静的力量，也是力量。'
  ],
  earth: [
    '恭喜{name}，觉醒普通异能「烬土」。大地从来不会倒下。现在你也不会了。',
    '恭喜{name}，觉醒异能「烬土」。泥土覆盖万物，万物归于泥土。你是行走的城墙。'
  ],
  frost: [
    '恭喜伟大的{name}，觉醒稀有异能「冻脉」。体温骤降到零下的时候，反而什么都看清楚了。冷静，是最高效的暴力。',
    '恭喜{name}，觉醒稀有异能「冻脉」。血管里流淌着的不再是血——是液氮。碰到你的东西，会在碎裂之前来不及感到疼痛。'
  ],
  quake: [
    '恭喜伟大的{name}，觉醒稀有异能「裂地」。脚下的大地听到了你的心跳。从今往后，你每踏出一步，地面都要为你让路。',
    '恭喜{name}，觉醒稀有异能「裂地」。拳头砸下去的时候不只是一个点在承受——是以你为圆心半径二十米内所有的地面。'
  ],
  wind: [
    '恭喜伟大的{name}，觉醒稀有异能「风蚀」。风没有形体，但它削平过山脉。现在你的速度，快到连影子都追不上本体。',
    '恭喜{name}，觉醒稀有异能「风蚀」。从此出手只有一次。不是因为仁慈——是因为不需要第二次。'
  ],
  flame: [
    '恭喜伟大的{name}，觉醒史诗异能「焰息」。从指尖到心脏的距离之间，温度上升了一千四百度。末世很冷。但你不会了。',
    '恭喜伟大的{name}，觉醒史诗异能「焰息」。火焰不问敌友。它只问：你能不能承受我？答案显然是不能。'
  ],
  shadow: [
    '恭喜伟大的{name}，觉醒史诗异能「蚀影」。从这一刻起，黑暗是你的领地。走进阴影的人不会再走出来。',
    '恭喜伟大的{name}，觉醒史诗异能「蚀影」。你消失了。不是隐身——是存在本身被暂时抹除了。再出现的时候，一切已经结束。'
  ],
  metal: [
    '恭喜伟大的{name}，觉醒史诗异能「金噬」。金属共鸣的频率只有你能听到。铁、钢、合金——它们都是你的牙齿。',
    '恭喜伟大的{name}，觉醒史诗异能「金噬」。从此没有铠甲能保护你的敌人。因为铠甲本身，就是你的武器。'
  ],
  thunder: [
    '恭喜伟大的{name}，于末世觉醒传说异能「雷引」。天空为你劈开。雷霆自此听命于凡人之躯。万物颤抖。',
    '恭喜伟大的{name}，觉醒传说异能「雷引」。闪电不是武器。闪电是审判。而你是唯一的法官。'
  ],
  mind: [
    '恭喜伟大的{name}，觉醒传说异能「念压」。你没有碰他。但他的膝盖自己跪下去了。精神的重量，比山还沉。',
    '恭喜伟大的{name}，觉醒传说异能「念压」。从今往后，你的意志就是物理定律。想让什么停下，它就停下。'
  ],
  blood: [
    '恭喜伟大的{name}，觉醒传说异能「噬血」。第一滴血落地的时候，它就已经赢了。剩下的只是进食。越痛越强，越战越饥。',
    '恭喜伟大的{name}，觉醒传说异能「噬血」。伤口是你的食粮。战场是你的餐桌。别人在流血，你在进化。'
  ],
  void: [
    '全服公告：恭喜{name}触发神话异能「虚空」觉醒。空间从此是他的私有财产。进不来，出不去。规则由他书写。维度在他掌心折叠。',
    '恭喜伟大的{name}，觉醒神话异能「虚空」。空间折叠的声音像骨头断裂。但断的不是他的骨头——是世界的。'
  ],
  melt: [
    '全服震撼：{name}双异能火+金共鸣成功，诞生神话异能「熔炎」。金属在尖叫，火焰在大笑，它们终于见面了。此刻他不再是幸存者——他是灾难本身。',
    '全服公告：{name}触发隐藏觉醒「熔炎」。金属燃烧的温度足以焚天。从这一刻起，他面前的一切都将融化。'
  ]
};

function abilityBroadcast(name, ability) {
  const tier = ABILITY_TIERS[ability.id] || 'common';
  const emoji = TIER_EMOJI[tier];
  const label = TIER_LABELS[tier];
  return emoji + ' ' + name + ' 觉醒了' + label + '异能「' + ability.name + '」(' + ability.element + ')';
}

function abilityDesc(name, ability) {
  const descs = ABILITY_DESC[ability.id];
  if (!descs || !descs.length) {
    const tier = ABILITY_TIERS[ability.id] || 'common';
    return '恭喜伟大的' + name + '，觉醒' + TIER_LABELS[tier] + '异能「' + ability.name + '」(' + ability.element + ')。力量在体内翻涌。从此，你不一样了。';
  }
  return descs[Math.floor(Math.random() * descs.length)].replace(/\{name\}/g, name);
}

// ============ 武器获取台词 ============
const WEAPON_DESC = {
  w10: '脉冲步枪上膛的声音像心跳。但它的节奏比你的心跳快三倍——每一发子弹穿过的不是一个目标，而是一条直线上所有活着的东西。',
  w11: '蛇骨鞭展开的时候有二十七节。每一节都是一段脊椎。不知道是谁的。但握住它的时候能感觉到它在蠕动。它还活着。',
  w12: '裂骨重锤落地的震动让三栋楼的玻璃同时碎裂。这不是锤子。这是一场局部地震。握住它需要的不是力量——是决心。',
  w13: '恭喜伟大的{name}，获得金色武器「寂灭」。握住它的瞬间，影子从脚底下站了起来。不是你的影子。是它的。暗影在刀身上流淌，像活物一样呼吸。从此走路不再有影子——因为影子已经被献祭了。',
  w14: '恭喜伟大的{name}，获得金色武器「灼日」。铁匣裂开的瞬间方圆十米的空气扭曲变形。这不是武器。这是一颗被关在剑鞘里的恒星。拔出来的那一刻，黑夜结束了。',
  w15: '恭喜伟大的{name}，获得金色武器「虚断」。没有刀刃。没有重量。但它砍断的东西，在被砍断之前就已经不存在了。空间在刀锋两侧哭泣。'
};

function weaponDesc(name, weapon) {
  const d = WEAPON_DESC[weapon.id];
  if (!d) return null;
  return d.replace(/\{name\}/g, name);
}

function weaponBroadcast(name, weapon) {
  if (weapon.rarity === 'gold') return '⚔️ ' + name + ' 获得金色武器「' + weapon.name + '」';
  if (weapon.rarity === 'purple') return '🟣 ' + name + ' 获得紫色武器「' + weapon.name + '」';
  return null;
}

// ============ 虚空裂缝台词 ============
const VOID_RIFT_DESCS = [
  '全服震撼：{name}触发了虚空裂缝。活着走出来了。空间在他身上留下了不可逆的刻痕——获得永久称号「裂隙行者」，战力永久+5。从今以后，他比这个世界多了一个维度。',
  '有人问过一个问题：如果把空间对折，折痕里会剩下什么？答案是{name}。他就站在折痕里。等他走出来的时候，时间欠他三天。永久称号「裂隙行者」，战力+5。',
  '天空裂开了一条缝。不是比喻。{name}走了进去又走了出来。进去的是一个幸存者，出来的是一个维度旅行者。称号「裂隙行者」，永久战力+5。'
];
function voidRiftDesc(name) {
  return VOID_RIFT_DESCS[Math.floor(Math.random() * VOID_RIFT_DESCS.length)].replace(/\{name\}/g, name);
}
function voidRiftBroadcast(name) {
  return '💀 ' + name + ' 触发虚空裂缝，获得称号「裂隙行者」';
}

// ============ 共鸣裂隙台词 ============
const RESONANCE_DESCS = [
  '恭喜伟大的{name}，触发共鸣裂隙，觉醒第二异能「{ability}」。一个身体装了两种毁灭。从此以后出手，敌人要猜的不是会不会死——是死于哪一种。',
  '第一种力量是觉醒。第二种力量是失控。{name}体内两股截然相反的频率撞在一起——不像爆炸，像心跳。第二异能「{ability}」已苏醒。',
  '{name}的身体承受住了第二次觉醒的冲击。共鸣裂隙闭合的瞬间，新的力量已经永远刻进了骨髓。第二异能：「{ability}」。'
];
function resonanceDesc(name, ability) {
  return RESONANCE_DESCS[Math.floor(Math.random() * RESONANCE_DESCS.length)].replace(/\{name\}/g, name).replace(/\{ability\}/g, ability.name);
}

// ============ 远古兵器匣台词 ============
const ANCIENT_DESCS = [
  '墙壁深处嵌着一个金属匣子。上面的锈迹不像是这个时代的。{name}打开的瞬间有光溢出——',
  '它就放在祭坛正中央。这栋建筑的结构像是专门为保护它而建造的。{name}伸手的时候指尖有触电的感觉——'
];
function ancientDesc(name, weapon) {
  const prefix = ANCIENT_DESCS[Math.floor(Math.random() * ANCIENT_DESCS.length)].replace(/\{name\}/g, name);
  const wd = weaponDesc(name, weapon);
  return prefix + '\n\n' + (wd || '获得金色武器「' + weapon.name + '」。');
}

// ============ PVP击杀播报 ============
function pvpBroadcast(winner, loser, loot) {
  if (loot) return '💀 ' + winner + ' 击败 ' + loser + '，缴获「' + loot + '」';
  return '💀 ' + winner + ' 击败了 ' + loser;
}

// ============ 熔炎觉醒公屏 ============
function meltBroadcast(name) {
  return '🔴 ' + name + ' 火+金双异能共鸣，觉醒神话异能「熔炎」';
}

// ============ 切磋（偶遇PVP）文案 ============
const SPAR_WIN_DESCS = [
  '废楼拐角撞见{target}。四目相对不到一秒就动了手。三招之内分出胜负——{name}赢了。',
  '巷子里的脚步声不是丧尸的。{target}从阴影里走出来。没有废话，拳头说话。{name}更快一步。',
  '两道异能光芒在夜空中交汇。{target}退了半步。胜负已定。{name}弯腰捡起战利品，头也不回。',
  '遭遇战。{target}先出手了——但{name}挡住了，并且还了回去。对方膝盖着地的声音在空旷的街道上回荡。',
  '{target}的武器划破了{name}的衣角。仅此而已。下一秒{name}已经站在了对方身后。结束了。'
];
const SPAR_LOSE_DESCS = [
  '废楼拐角撞见{target}。来不及反应——对方的速度超出预期。{name}被击倒了。',
  '黑暗里有人在等着。{target}的攻击精准且冷酷。{name}没能接住第二击。',
  '正面硬碰。{target}的战力比想象中强太多。{name}落败，装备从手中滑落。',
  '以为只是普通遭遇，放松了警惕。{target}没有。一击命中要害。{name}跪了。',
  '对方的异能先一步释放。{name}被压制得喘不过气。等回过神来，身上少了东西。'
];
const SPAR_DRAW_DESCS = [
  '废楼拐角撞见{target}。对峙了五秒，谁都没动。最终各自退开——今天不是时候。',
  '遇到{target}了。互相打量了一圈，实力旗鼓相当。没人想在这种地方拼命。擦肩而过。',
  '两道身影在废墟中相遇。空气紧绷了三秒。然后——默契地各走各的路。'
];

function sparWinDesc(name, target) {
  return SPAR_WIN_DESCS[Math.floor(Math.random() * SPAR_WIN_DESCS.length)].replace(/\{name\}/g, name).replace(/\{target\}/g, target);
}
function sparLoseDesc(name, target) {
  return SPAR_LOSE_DESCS[Math.floor(Math.random() * SPAR_LOSE_DESCS.length)].replace(/\{name\}/g, name).replace(/\{target\}/g, target);
}
function sparDrawDesc(name, target) {
  return SPAR_DRAW_DESCS[Math.floor(Math.random() * SPAR_DRAW_DESCS.length)].replace(/\{name\}/g, name).replace(/\{target\}/g, target);
}
function sparBroadcast(winner, loser, loot) {
  if (loot) return '⚔️ ' + winner + ' 偶遇切磋击败 ' + loser + '，夺走了「' + loot + '」';
  return '⚔️ ' + winner + ' 偶遇切磋击败了 ' + loser;
}

module.exports = {
  ABILITY_TIERS, TIER_LABELS, TIER_EMOJI,
  abilityBroadcast, abilityDesc,
  weaponDesc, weaponBroadcast,
  voidRiftDesc, voidRiftBroadcast,
  resonanceDesc, ancientDesc,
  pvpBroadcast, meltBroadcast,
  sparWinDesc, sparLoseDesc, sparDrawDesc, sparBroadcast
};
