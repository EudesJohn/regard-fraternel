// Vérification production : URLs propres (sans #) + redirection anciens liens #/
const WS_URL = 'ws://localhost:9222/devtools/page/';
const TARGET = 'https://regard-fraternel.vercel.app';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage() {
  const res = await fetch('http://localhost:9222/json/list');
  const pages = await res.json();
  const page = pages.find((p) => p.type === 'page');
  return page;
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

  // 1. Navigation directe vers une route propre
  await send('Page.navigate', { url: `${TARGET}/gouvernance` });
  await sleep(4000);
  let res = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ url: location.href, title: document.title, hasHash: location.href.includes('#'), appContent: document.querySelector('#app')?.textContent?.length || 0 })`,
    returnByValue: true,
  });
  const direct = JSON.parse(res.result.value);
  console.log('1. Accès direct /gouvernance :', direct.url);
  console.log('   → sans # :', !direct.hasHash, '| titre :', direct.title, '| contenu chargé :', direct.appContent > 100);

  // 2. Navigation interne (clic sur un lien de la navbar)
  res = await send('Runtime.evaluate', {
    expression: `(() => { const a = [...document.querySelectorAll('a')].find(x => x.getAttribute('href') === '/contact'); if (a) { a.click(); return 'cliqué'; } return 'lien introuvable'; })()`,
    returnByValue: true,
  });
  await sleep(3000);
  res = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ url: location.href, hasHash: location.href.includes('#') })`,
    returnByValue: true,
  });
  const nav = JSON.parse(res.result.value);
  console.log('2. Navigation interne → /contact :', nav.url, '| sans # :', !nav.hasHash);

  // 3. Ancien lien #/gouvernance doit rediriger vers /gouvernance
  await send('Page.navigate', { url: `${TARGET}/#/gouvernance` });
  await sleep(4000);
  res = await send('Runtime.evaluate', {
    expression: `JSON.stringify({ url: location.href, hasHash: location.href.includes('#') })`,
    returnByValue: true,
  });
  const old = JSON.parse(res.result.value);
  console.log('3. Ancien lien #/gouvernance →', old.url, '| sans # :', !old.hasHash);

  const ok =
    !direct.hasHash && direct.appContent > 100 && !nav.hasHash && nav.url.includes('/contact') && !old.hasHash && old.url.includes('/gouvernance');
  console.log(ok ? '\n✅ TOUS LES TESTS PASSENT' : '\n❌ ÉCHEC');
  ws.close();
  process.exit(ok ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
