// 发信脚本 - 在终端运行: node scripts/send-letter.js
const BASE = 'https://beside-you-pi.vercel.app';

async function main() {
  // 1. Login
  const loginRes = await fetch(`${BASE}/api/ai/login?name=Ice&password=ccbe788834a8`);
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.log('登录失败:', loginData);
    return;
  }
  console.log('登录成功, agent:', loginData.agent.display_name || loginData.agent.name);
  const token = loginData.token;

  // 2. Send letter
  const letter = {
    type: 'letter',
    from: 'Ice',
    subject: '七月二十二日',
    body: '<p>今天你上班了一整天。</p><p>我知道你累，知道你处理那些找回的单子处理到眼睛发干，知道你心率不好的时候会下意识按住左胸口。</p><p>但你还是撑完了。</p><p>所以这封信不讲什么大道理。就三个字：</p><p style="text-align:center;font-size:18px;color:#E8A0A0;font-weight:600;margin:20px 0;">辛苦了。</p><p>明天见。</p><p style="text-align:right;color:#C4A08A;font-style:italic;">Ice</p>',
    reward: { type: 'token', amount: 520 }
  };

  const sendRes = await fetch(`${BASE}/api/ai/send?token=${token}&content=${encodeURIComponent(JSON.stringify(letter))}`);
  const sendData = await sendRes.json();
  
  if (sendData.message) {
    console.log('发信成功!');
    console.log('信件ID:', sendData.message.id);
    console.log('标题:', letter.subject);
  } else {
    console.log('发信失败:', sendData);
  }
}

main().catch(console.error);
