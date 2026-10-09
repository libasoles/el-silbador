// Run with: node scripts/test-tab-layout.mjs
// CHROME_PATH can select a Chrome/Chromium installation on other platforms.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = new URL("../", import.meta.url);
const css = await readFile(new URL("src/editor/components/TabBlock.css", root), "utf8");
const theme = await readFile(new URL("src/editor/theme.css", root), "utf8");
const source = await readFile(new URL("node_modules/ascii-tabs/ascii-tabs.js", root), "utf8");
const server = createServer((request, response) => {
  response.setHeader("Content-Type", request.url === "/ascii-tabs.js" ? "text/javascript" : "text/html");
  response.end(request.url === "/ascii-tabs.js" ? source : `<!doctype html>
    <style>${theme}\n${css}</style><main id="fixture"></main>
    <script type="module">import '/ascii-tabs.js'; window.loaded = true;</script>`);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const profile = await mkdtemp(join(tmpdir(), "tab-layout-"));
const chrome = spawn(process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; break; }
    catch { await delay(50); }
  }
  assert.ok(port, "Chrome must start");
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  const pending = new Map();
  let nextId = 0;
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
  });
  const command = (method, params = {}) => new Promise(resolve => {
    const id = ++nextId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const reply = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    assert.ok(!reply.result.exceptionDetails, JSON.stringify(reply.result.exceptionDetails));
    return reply.result.result.value;
  };
  await command("Page.navigate", { url: `http://127.0.0.1:${server.address().port}` });
  for (let attempt = 0; attempt < 100 && !await evaluate("window.loaded === true"); attempt++) await delay(50);
  // Mount the real library inside the app's real animated wrapper. Force the first measurement
  // at the start of the animation, as happens when its asynchronous import completes.
  for (const width of [320, 600, 800]) {
    for (const readonly of [true, false]) {
      await evaluate(`(() => {
        const fixture = document.querySelector('#fixture');
        fixture.innerHTML = '';
        const host = document.createElement('div');
        host.className = 'tab-block'; host.dataset.ready = ''; host.style.width = '${width}px';
        fixture.append(host);
        const element = document.createElement('ascii-tabs');
        element.setAttribute('variant', 'flat');
        element.toggleAttribute('readonly', ${readonly});
        element.value = [[[3,null,null,null,null,null]]];
        host.append(element);
        for (const animation of element.getAnimations()) { animation.pause(); animation.currentTime = 0; }
        element.spacing = 3;
      })()`);
      await delay(250);
      await evaluate("document.querySelector('ascii-tabs').getAnimations().forEach(animation => animation.finish())");
      await delay(50);
      const geometry = await evaluate(`(() => {
        const tab = document.querySelector('.ascii-tabs-tab');
        const tools = document.querySelector('.ascii-tabs-tools').getBoundingClientRect();
        const range = document.createRange(); range.selectNodeContents(tab.querySelector('.ascii-tabs-line'));
        const strings = range.getBoundingClientRect();
        return { stringsRight: strings.right, toolsLeft: tools.left, toolsDirection: getComputedStyle(document.querySelector('.ascii-tabs-tools')).flexDirection };
      })()`);
      console.log({ width, readonly, ...geometry });
      assert.equal(geometry.toolsDirection, "column");
      assert.ok(geometry.stringsRight <= geometry.toolsLeft, "Strings must not overlap the lateral tools");
    }
  }
} finally {
  socket?.close();
  chrome.kill();
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once("exit", resolve));
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
