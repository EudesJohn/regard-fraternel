// Debug : comportement réel — SW, main.js chargé, redirection #/
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage() {
  const res = await fetch('http://localhost:9222/json/list');
  const pages = await res.json();
  return pages.find((p) => p.type === 'page');
}

async function run() {
  const page = await getPage();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };
  await new Promise((resolve) => (ws.onopen = resolve));
  await send('Page.enable');
  await send('Runtime.enable');

  // État actuel
  let res = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      url: location.href,
      swRegistrations: (navigator.serviceWorker ? 'SW API dispo' : 'pas de SW API'),
      scripts: [...document.scripts].map(s => s.src).filter(s => s.includes('index-'))
    })`,
    returnByValue: true,
  });
  console.log('État actuel :', res.result.value);

  // Vérifier le contrôle du SW
  res = await send('Runtime.evaluate', {
    expression: `navigator.serviceWorker.getRegistrations().then(regs => JSON.stringify(regs.map(r => ({ scope: r.scope, active: r.active?.scriptURL || null }))))`,
    returnByValue: true,
    awaitPromise: true,
  });
  console.log('Service Workers :', res.result.value);

  // Test : charger l'ancien lien #/ depuis la page d'accueil (hash change = pas de reload → pas de redirection possible)
  await send('Page.navigate', { url: 'https://regard-fraternel.vercel.app/' });
  await sleep(3500);
  res = await send('Runtime.evaluate', {
    expression: `location.href = 'https://regard-fraternel.vercel.app/#/gouvernance'; 'set'`,
    returnByValue: true,
  });
  await sleep(3000);
  res = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ url: location.href, content: document.querySelector('#app')?.textContent?.slice(0, 80) || 'vide' })`,
    returnByValue: true,
  });
  console.log('Après #/gouvernance :', res.result.value);

  // Le bundle sert-il le code de redirection ? (vérifier le hash du JS chargé)
  res = await send('Runtime.evaluate', {
    expression: `JSON.stringify([...document.scripts].map(s => s.src).filter(s => s.includes('index-')))`,
    returnByValue: true,
  });
  console.log('Bundle chargé :', res.result.value);

  ws.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
