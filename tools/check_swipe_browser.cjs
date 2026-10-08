"use strict";
// Exercise the actual rendered UI and native touch input, not a fake DOM.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "apps", "miniapp");
const runName = process.argv[2] || "current";
const galleryOnly=process.argv[3]==="gallery-only";
if (!/^[a-z0-9-]+$/i.test(runName)) throw new Error("Use a simple run name.");
const output = path.join(root, "outputs", "visual-qa", runName);
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const file = path.resolve(source, "." + (relative.endsWith("/") ? relative + "index.html" : relative));
    if (!file.startsWith(source + path.sep) || file.includes(path.sep + ".openai" + path.sep)) {
      res.writeHead(403).end(); return;
    }
    const bytes = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
let browser;
const results = [];
const failures = [];
async function measure(page) {
  return page.evaluate(() => {
    const box = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const front = document.querySelector(".swipe-card--front");
    return { front: box(".swipe-card--front"), deck: box("#cards"), actions: box("#swipe-actions"),
      name: front?.querySelector(".person-name")?.textContent,
      opacity: front && getComputedStyle(front).opacity,
      transform: front && getComputedStyle(front).transform,
      disabled: document.querySelector("#like").disabled,
      scrollY, viewport: { width: innerWidth, height: innerHeight }, status: document.querySelector("#status").textContent };
  });
}
async function touch(cdp, type, x, y) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" || type === "touchCancel" ? [] : [{ x, y, id: 1 }] });
}
async function tap(cdp,box){
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await touch(cdp,"touchStart",x,y);
  await touch(cdp,"touchEnd",x,y);
}
async function settleViewport(page,viewport){
  await page.waitForFunction(({height})=>{
    const actual=window.visualViewport?.height || innerHeight;
    const top=screen.getBoundingClientRect().top+scrollY;
    return Math.abs(actual-height)<1 && !viewportUpdatePending && Math.abs(parseFloat(screen.style.getPropertyValue("--swipe-height"))-Math.min(800,Math.max(360,height-top-8)))<1;
  },viewport);
}
async function drag(cdp, box, delta, release = true) {
  const x = box.x + box.width * .45, y = box.y + box.height * .38;
  await touch(cdp, "touchStart", x, y);
  for (let step = 1; step <= 8; step++) {
    await touch(cdp, "touchMove", x + delta * step / 8, y);
    await new Promise(resolve => setTimeout(resolve, 18));
  }
  if (release) await touch(cdp, "touchEnd", x + delta, y);
  return { x: x + delta, y };
}
async function frames(page) {
  await page.evaluate(() => {
      const samples=[];
      window.__swipeFrames = samples;
    const start = performance.now();
    function sample(time) {
      const deck = document.querySelector("#cards").getBoundingClientRect();
      const cards = [...document.querySelectorAll(".swipe-card")].map(card => {
        const rect = card.getBoundingClientRect(), style = getComputedStyle(card);
        return { id: card.dataset.personId, cls: card.className, x: rect.x, y: rect.y, width: rect.width,
          height: rect.height, opacity: +style.opacity, transform: style.transform };
      });
      samples.push({ time: time - start, deck: { y: deck.y, height: deck.height }, cards });
      if (time - start < 1100) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
}
async function save(page, name) {
  await page.screenshot({ path: path.join(output, name + ".png") });
}
function assertContinuous(trace,id){
  assert.ok(trace.filter(frame=>frame.cards.some(card=>card.id===id)).length>3,"Missing animation frames for the next card");
  let previous;
  for(const frame of trace){
    const next=frame.cards.find(card=>card.id===id);
    if(next && previous){
      const scale=16.7/Math.max(1,frame.time-previous.time);
      assert.ok(Math.abs(next.width-previous.card.width)*scale < 6,"Next card width jumps between rendered frames");
      assert.ok(Math.abs(next.opacity-previous.card.opacity)*scale < .2,"Next card opacity jumps between rendered frames");
    }
    if(next)previous={time:frame.time,card:next};
  }
}
async function check(name, work) {
  try { await work(); results.push(name); console.log("PASS " + name); }
  catch (error) { failures.push({ name, error: error.message }); console.error("FAIL " + name + ": " + error.message); }
}
(async () => {
  await fs.mkdir(output, { recursive: true });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  for (const viewport of (galleryOnly?[]:[{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 430, height: 932 }])) {
    const label = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true,
      recordVideo: { dir: output, size: viewport } });
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await page.goto(base + "/demo.html#people");
    await page.evaluate(() => {
      window.__gestureEvents = [];
      for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture", "click", "resize", "blur"]) {
        window.addEventListener(type, event => window.__gestureEvents.push({ type, x: event.clientX, y: event.clientY,
          pointerType: event.pointerType, target: event.target?.className, drag: drag && { horizontal: drag.horizontal, dx: drag.dx },
          deciding, time: performance.now() }), true);
      }
    });
    await page.waitForFunction(() => !document.querySelector(".swipe-portrait").classList.contains("no-photo"));
    await save(page, label + "-idle");
    const idle = await measure(page);
    await check(label + " portrait is taller than it is wide",async()=>{
      const photo=await page.locator(".swipe-card--front .swipe-portrait").boundingBox();
      assert.ok(photo.height>=photo.width,`Portrait still landscape: ${photo.width}x${photo.height}`);
    });
    await check(label + " reactions are accessible icons without visible labels",async()=>{
      for(const [id,name] of [["like",/Лайк/],["dislike",/Дизлайк/]]){
        const button=page.locator("#"+id);
        assert.match(await button.getAttribute("aria-label"),name);
        assert.equal((await button.innerText()).trim(),"","Reaction still has a visible text label");
        assert.equal(await button.locator("svg").count(),1,"Missing vector icon");
        const box=await button.boundingBox();
        assert.ok(box.width>=44 && box.height>=44,"Touch target below 44px");
      }
      assert.equal(await page.locator(".swipe-hint").count(),0,"Old swipe instruction remains");
      const colours=await page.evaluate(()=>{
        const style=id=>{const s=getComputedStyle(document.querySelector(id));return{colour:s.color,background:s.backgroundColor,border:s.borderColor};};
        return{like:style("#like"),dislike:style("#dislike")};
      });
      assert.equal(colours.like.background,colours.dislike.background,"Reaction backgrounds differ");
      assert.equal(colours.like.border,colours.dislike.border,"Reaction borders differ");
      const red=colours.dislike.colour.match(/\d+/g).map(Number),green=colours.like.colour.match(/\d+/g).map(Number);
      assert.ok(red[0]>red[1]+80 && red[0]>red[2]+80,"Cross is not red");
      assert.ok(green[1]>green[0]+80 && green[1]>green[2],"Heart is not green");
    });
    await check(label + " long name and 400-character description fit the screen",async()=>{
      await page.evaluate(()=>{
        window.__originalPerson={...people[0]};
        people[0].name="Александра-Екатерина Великая";
        people[0].description=("Люблю прогулки, кино и разговоры до утра. ").repeat(12).slice(0,400);
        people[1].description=("Обожаю путешествия и музыку. ").repeat(20).slice(0,400);
        likes.add(people[0].id);
        cards.replaceChildren();renderCards();
      });
      const layout=await page.evaluate(()=>{
        const card=document.querySelector(".swipe-card--front");
        const rect=node=>{const b=node.getBoundingClientRect();return{x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
        const description=card.querySelector(".description"), name=card.querySelector(".person-name"), style=getComputedStyle(description);
        return{card:rect(card),description:rect(description),name:rect(name),actions:rect(document.querySelector("#swipe-actions")),tabs:rect(document.querySelector(".tabs")),lineHeight:parseFloat(style.lineHeight),overflow:style.overflowY,bodyWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,accessible:card.getAttribute("aria-label")};
      });
      for(const field of [layout.name,layout.description]){
        assert.ok(field.y>=layout.card.y && field.bottom<=layout.card.bottom+1,"Text crosses card bounds");
        assert.ok(field.x>=layout.card.x && field.right<=layout.card.right+1,"Text crosses card horizontally");
      }
      assert.ok(layout.description.height<=layout.lineHeight*3+1,"Description exceeds three visible lines");
      assert.ok(!["auto","scroll"].includes(layout.overflow),"Description creates a nested scroller");
      assert.ok(layout.tabs.bottom<=layout.viewportHeight+1,"Navigation requires scrolling");
      assert.ok(layout.actions.bottom<=layout.viewportHeight+1,"Reactions require scrolling");
      assert.ok(layout.bodyWidth<=layout.viewportWidth,"Layout overflows horizontally");
      assert.ok(layout.accessible.length>400,"Screen reader loses the full description");
      assert.match(await page.locator(".swipe-card--front .swipe-previous").innerText(),/лайк/i);
      await save(page,label+"-long-text");
    });
    await check(label + " keyboard can reach details only for the active guest",async()=>{
      const backControls=await page.locator('.swipe-card[aria-hidden="true"] .guest-info').evaluateAll(buttons=>buttons.map(button=>({disabled:button.disabled,tabIndex:button.tabIndex})));
      assert.ok(backControls.every(button=>button.disabled || button.tabIndex<0),"A hidden next card info button is focusable");
      await page.locator(".swipe-card--front").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(()=>document.activeElement.closest(".swipe-card")?.dataset.personId),"7");
      assert.equal(await page.evaluate(()=>document.activeElement.classList.contains("guest-info")),true);
      await save(page,label+"-keyboard-focus");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(()=>document.activeElement.id),"dislike","Tab enters another guest's hidden card");
    });
    await check(label + " full biography opens by touch and preserves the card",async()=>{
      const before=await measure(page);
      await page.locator(".swipe-card--front .guest-info").waitFor({state:"visible"});
      await tap(cdp,await page.locator(".swipe-card--front .guest-info").boundingBox());
      const dialog=page.locator("#guest-details");
      await dialog.waitFor({state:"visible"});
      assert.equal(await dialog.locator("#guest-details-name").textContent(),"Александра-Екатерина Великая");
      assert.equal(await dialog.locator("#guest-details-description").textContent(),await page.evaluate(()=>people[0].description));
      const textLayout=await dialog.locator("#guest-details-description").evaluate(node=>({height:node.clientHeight,scroll:node.scrollHeight}));
      assert.ok(textLayout.scroll<=textLayout.height+1,"Full biography remains clamped inside the dialog");
      await save(page,label+"-full-bio");
      const endPosition=()=>dialog.locator("#guest-details-description").evaluate(node=>{
        let scroller=node.parentElement;
        while(scroller && !(scroller.scrollHeight>scroller.clientHeight+1 && /auto|scroll/.test(getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
        const visible=(scroller || document.querySelector("#guest-details")).getBoundingClientRect();
        const range=document.createRange();range.selectNodeContents(node);range.setStart(node.firstChild,Math.max(0,node.textContent.length-2));
        const end=range.getBoundingClientRect();return{bottom:end.bottom,limit:Math.min(innerHeight,visible.bottom),box:{x:visible.x,y:visible.y,width:visible.width,height:visible.height}};
      });
      for(let scroll=0;scroll<5;scroll++){
        const end=await endPosition();if(end.bottom<=end.limit+1)break;
        const x=end.box.x+end.box.width*.5,y=Math.min(end.limit-30,end.box.y+end.box.height*.8);
        await touch(cdp,"touchStart",x,y);
        for(let step=1;step<=8;step++){await touch(cdp,"touchMove",x,y-180*step/8);await page.waitForTimeout(20);}
        await touch(cdp,"touchEnd");await page.waitForTimeout(200);
      }
      const end=await endPosition();assert.ok(end.bottom<=end.limit+1,"Last biography characters cannot be reached by touch");
      const closeBox=await page.locator("#guest-details-close").boundingBox();
      const hit=await page.evaluate(box=>({at:document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.outerHTML,scroll:document.querySelector("#guest-details").scrollTop}),closeBox);
      await tap(cdp,closeBox);
      await page.waitForTimeout(50);
      await save(page,label+"-after-close");
      await fs.writeFile(path.join(output,label+"-close-touch.json"),JSON.stringify({box:closeBox,hit,open:await dialog.isVisible(),events:await page.evaluate(()=>window.__gestureEvents)},null,2));
      assert.equal(await dialog.isVisible(),false);
      const after=await measure(page);
      assert.equal(after.name,before.name);assert.equal(after.status,before.status);
      assert.ok(Math.abs(after.front.x-before.front.x)<1,"Info tap starts a swipe");
      assert.equal(await page.evaluate(()=>document.activeElement.classList.contains("guest-info")),true,"Focus not returned to info button");
    });
    if(viewport.width===320){
      await check(label + " closing details during momentum needs only one tap",async()=>{
        for(let trial=0;trial<5;trial++){
          await tap(cdp,await page.locator(".swipe-card--front .guest-info").boundingBox());
          await page.locator("#guest-details").waitFor({state:"visible"});
          const content=await page.locator(".guest-dialog-content").boundingBox();
          const x=content.x+content.width*.5,y=content.y+content.height*.8;
          await touch(cdp,"touchStart",x,y);
          for(let step=1;step<=4;step++){await touch(cdp,"touchMove",x,y-150*step/4);await page.waitForTimeout(18);}
          await touch(cdp,"touchEnd");
          await tap(cdp,await page.locator("#guest-details-close").boundingBox());
          await page.locator("#guest-details").waitFor({state:"hidden",timeout:750});
          assert.equal((await measure(page)).name,"Александра-Екатерина Великая");
        }
      });
    }
    await page.evaluate(()=>{if(guestDetails.open)guestDetails.close();Object.assign(people[0],window.__originalPerson);likes.delete(people[0].id);cards.replaceChildren();renderCards();});
    await check(label + " bottom profile and renamed dating tab work without a duplicate",async()=>{
      assert.equal(await page.locator('.bar [data-open="profile"]').count(),0,"Duplicate header profile remains");
      const profile=page.getByRole("button",{name:"Профиль",exact:true});
      assert.equal(await profile.count(),1,"Profile must be present only once");
      await profile.click();
      assert.equal(await page.locator("#profile-panel").isVisible(),true);
      assert.match(await page.locator("#demo-mockup-caption").innerText(),/D04/);
      assert.equal((await page.locator('[data-tab="people"]').textContent()).trim(),"Знакомства");
      await page.locator('[data-tab="people"]').click();
      assert.equal((await measure(page)).name,"Аня");
    });
    await page.evaluate(()=>{if(currentPanel!=="people")showPanel("people");});
    await frames(page);
    await page.locator("#like").click();
    const timeline = [];
    for (const delay of [0, 45, 60, 75, 150]) {
      await page.waitForTimeout(delay);
      timeline.push(await measure(page));
      await save(page, `${label}-like-${timeline.length}`);
    }
    await page.waitForTimeout(750);
    const trace = await page.evaluate(() => window.__swipeFrames);
    await fs.writeFile(path.join(output, label + "-like-frames.json"), JSON.stringify({ idle, timeline, frames: trace }, null, 2));
    await check(label + " stable card size after reaction", async () => {
      const next = await measure(page);
      assert.equal(next.name, "Миша");
      assert.ok(Math.abs(next.deck.height - idle.deck.height) < 1, `Deck changed ${idle.deck.height} -> ${next.deck.height}`);
      assert.ok(Math.abs(next.deck.y - idle.deck.y) < 1, "Deck moved vertically");
    });
    await check(label + " next card promotion is continuous", async () => {
      assertContinuous(trace,"12");
    });
    await check(label + " controls visible", async () => {
      assert.ok(idle.actions.y + idle.actions.height <= viewport.height, `Buttons extend to ${idle.actions.y + idle.actions.height}px beyond ${viewport.height}px viewport`);
    });
    await check(label + " native right swipe advances once", async () => {
      const current = await measure(page);
      await frames(page);
      const end=await drag(cdp,current.front,current.front.width*.28+2,false);
      await save(page,label+"-touch-held");
      await touch(cdp,"touchEnd",end.x,end.y);
      await page.waitForTimeout(550);
      assert.equal((await measure(page)).name, "Саша");
      assert.match((await measure(page)).status, /Лайк: Миша/);
    });
    const nativeTrace=await page.evaluate(()=>window.__swipeFrames);
    await fs.writeFile(path.join(output,label+"-native-frames.json"),JSON.stringify(nativeTrace,null,2));
    await check(label+" native swipe promotion is continuous",async()=>assertContinuous(nativeTrace,"19"));
    await fs.writeFile(path.join(output, label + "-touch-events.json"), JSON.stringify(await page.evaluate(() => window.__gestureEvents), null, 2));
    await check(label + " native short swipe restores card", async () => {
      const current = await measure(page);
      await drag(cdp, current.front, -25);
      await page.waitForTimeout(400);
      const next = await measure(page);
      assert.equal(next.name, current.name);
      assert.ok(Math.abs(next.front.x - current.front.x) < 1, "Card did not return");
    });
    await check(label + " native left swipe ends deck", async () => {
      await drag(cdp, (await measure(page)).front, -135);
      await page.waitForTimeout(450);
      assert.equal(await page.locator(".swipe-empty").count(), 1);
      assert.match((await measure(page)).status, /Дизлайк: Саша/);
    });
    await save(page, label + "-empty");
    await check(label + " repeat and swipe from description", async () => {
      await page.getByRole("button", { name: "Посмотреть ещё раз" }).click();
      assert.equal((await measure(page)).name, "Аня");
      const body=await page.locator(".swipe-card--front .card-body").boundingBox();
      const width=(await measure(page)).front.width;
      await drag(cdp, { ...body, width }, -(Math.min(110,Math.max(64,width*.28))+8));
      await page.waitForTimeout(550);
      assert.equal((await measure(page)).name, "Миша");
      assert.match((await measure(page)).status, /Дизлайк: Аня/);
    });
    await check(label + " native cancellation restores card", async () => {
      const current=await measure(page);
      await drag(cdp, current.front, 45, false);
      await touch(cdp,"touchCancel");
      await page.waitForTimeout(350);
      const after=await measure(page);
      assert.equal(after.name,current.name);
      assert.equal(after.status,current.status);
      assert.ok(Math.abs(after.front.x-current.front.x)<1);
    });
    await check(label + " vertical touch does not react", async () => {
      const current=await measure(page), x=current.front.x+current.front.width*.5, y=current.front.y+70;
      await touch(cdp,"touchStart",x,y);
      await touch(cdp,"touchMove",x,y-60);
      await touch(cdp,"touchEnd");
      await page.waitForTimeout(350);
      assert.equal((await measure(page)).name,current.name);
      assert.equal((await measure(page)).status,current.status);
      await page.evaluate(()=>scrollTo(0,0));
    });
    if(viewport.width===390){
      await check(label + " viewport height change preserves active gesture", async () => {
        const current=await measure(page);
        const end=await drag(cdp,current.front,50,false);
        const held=await measure(page);
        await page.setViewportSize({width:390,height:780});
        await page.waitForTimeout(50);
        const resized=await measure(page);
        assert.ok(Math.abs(held.front.x-resized.front.x)<1,"Height resize cancelled drag");
        assert.ok(Math.abs(held.deck.height-resized.deck.height)<1,"Height changed during gesture");
        await touch(cdp,"touchMove",end.x+85,end.y);
        await touch(cdp,"touchEnd");
        await page.waitForTimeout(550);
        assert.equal((await measure(page)).name,"Саша");
        assert.ok((await measure(page)).deck.height<held.deck.height,"Deferred viewport height not applied");
        await page.setViewportSize(viewport);
        await settleViewport(page,viewport);
      });
      await check(label + " vertical gesture releases deferred viewport height",async()=>{
        const current=await measure(page),x=current.front.x+current.front.width*.5,y=current.front.y+65;
        await touch(cdp,"touchStart",x,y);
        await page.setViewportSize({width:390,height:760});
        await page.waitForTimeout(50);
        await touch(cdp,"touchMove",x,y-60);
        await touch(cdp,"touchEnd");
        await page.waitForTimeout(350);
        assert.equal((await measure(page)).name,current.name);
        assert.ok((await measure(page)).deck.height<current.deck.height-60,"Cancelled vertical gesture left old viewport height");
        await page.evaluate(()=>scrollTo(0,0));
        await page.setViewportSize(viewport);
        await settleViewport(page,viewport);
      });
    }
    await save(page,label+"-final");
    await check(label + " no browser errors", async () => assert.deepEqual(errors, []));
    await context.tracing.stop({ path: path.join(output, label + "-trace.zip") });
    const video=page.video();
    await context.close();
    await video.saveAs(path.join(output,label+"-swipes.webm"));
    await video.delete();
  }
  if(!galleryOnly){
  const reduced=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
  const reducedPage=await reduced.newPage(), reducedCdp=await reduced.newCDPSession(reducedPage);
  await reducedPage.goto(base+"/demo.html#people");
  await check("reduced motion follows touch without rotation",async()=>{
    const current=await measure(reducedPage);
    await drag(reducedCdp,current.front,60,false);
    const angle=await reducedPage.locator(".swipe-card--front").evaluate(card=>{
      const matrix=new DOMMatrixReadOnly(getComputedStyle(card).transform);return{b:matrix.b,c:matrix.c,x:matrix.e};
    });
    assert.equal(angle.b,0);assert.equal(angle.c,0);assert.ok(angle.x>40);
    await touch(reducedCdp,"touchCancel");
  });
  await check("reduced motion button fades and advances",async()=>{
    await frames(reducedPage);
    await reducedPage.locator("#like").click();
    await reducedPage.waitForTimeout(200);
    assert.equal((await measure(reducedPage)).name,"Миша");
    const settled=await measure(reducedPage);
    assert.ok(Math.abs(settled.front.x-settled.deck.x)<1,"Reduced motion card moved away from its deck");
  });
  await check("reduced motion next card does not scale",async()=>{
    const trace=await reducedPage.evaluate(()=>window.__swipeFrames);
    const widths=trace.flatMap(frame=>frame.cards.filter(card=>card.id==="12").map(card=>card.width));
    assert.ok(widths.length>3,"Missing reduced motion frames");
    assert.ok(Math.max(...widths)-Math.min(...widths)<1,"Next card still scales in reduced motion");
    await fs.writeFile(path.join(output,"reduced-motion-frames.json"),JSON.stringify(trace,null,2));
  });
  await reduced.close();
  }
  if(galleryOnly){
    for(const width of [320,390]){
      const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
      const page=await context.newPage(),errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      for(const [id,step] of [["U01",2],["U36",3],["U41",1],["U43",3],["U44",2],["U27",2]]){
        await page.goto(`${base}/scenarios/#${id}?step=${step}`);
        const phone=page.locator("#scenario-detail .journey-phone").first();
        await phone.waitFor();
        await phone.screenshot({path:path.join(output,`${width}-${id}-${step}.png`)});
        await check(`${width} ${id}.${step} room policy`,async()=>{
          const text=await phone.innerText();
          if(id==="U01" || id==="U36"){
            assert.equal(await phone.locator("input").count(),0,"Base room shows a key field");
            assert.match(text,/базов|Telegram|ключ.*не|без ключ/i);
          }else if(id==="U41"){
            assert.match(await page.locator("#scenario-detail").innerText(),/следующ|дополнительн/i);
            assert.equal(await page.locator("#scope").inputValue(),"archive");
          }else if(id==="U27"){
            assert.doesNotMatch(text,/общий ключ/i);
            assert.match(text,/контакт.*подтвердить|подтвердить.*принадлежит/i);
          }else assert.match(text,/закрыт|блокиров|запрет/i);
          const box=await phone.boundingBox();
          assert.ok(box.width<=width,"Phone wider than viewport");
        });
      }
      await check(`${width} gallery no browser errors`,async()=>assert.deepEqual(errors,[]));
      await context.close();
    }
  }
  await fs.writeFile(path.join(output, "report.json"), JSON.stringify({ browser: browser.version(), results, failures, physicalDevice: false }, null, 2));
  console.log(`Evidence: ${output}`);
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  server.close();
});
