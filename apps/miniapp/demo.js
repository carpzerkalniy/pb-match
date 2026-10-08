"use strict";
// Fictional guests and client-only reactions. No API, uploads or contact disclosure.
const people = [
  {id:7,name:"Аня",initials:"А",photoPosition:"0%",description:"Люблю долгие прогулки и разговоры о кино. Сегодня впервые на ПБ."},
  {id:12,name:"Миша",initials:"М",photoPosition:"50%",description:"Зову играть в настолки. Могу рассказать, где в городе лучший кофе."},
  {id:19,name:"Саша",initials:"С",photoPosition:"100%",description:"Собираю плейлисты, хожу в походы и учусь танцевать."}
];
const likes = new Set();
const dislikes = new Set();
const reciprocal = new Set();
let deckIndex = 0;
let photoUrl = null;
let currentPanel = "people";
let drag = null;
let animationTimer = null;
let interactionVersion = 0;
let deciding = false;
let portraitsReady = false;
let portraitsFailed = false;
let viewportUpdatePending = false;
let viewportWidth = window.innerWidth;
const cards = document.querySelector("#cards");
const matches = document.querySelector("#matches");
const status = document.querySelector("#status");
const screen = document.querySelector("main.screen");
const likeButton = document.querySelector("#like");
const dislikeButton = document.querySelector("#dislike");
const guestDetails = document.querySelector("#guest-details");
let guestDetailsReturnFocus = null;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const mockupLabels = {rooms:["D01","Комнаты"],people:["D02","Карточки: свайпы"],matches:["D03","Мэтчи"],profile:["D04","Профиль"]};
function element(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}
function updateViewport(){
  if(drag || deciding){viewportUpdatePending=true;return;}
  viewportUpdatePending=false;
  const viewportHeight=window.visualViewport?.height || window.innerHeight;
  const top=screen.getBoundingClientRect().top+window.scrollY;
  screen.style.setProperty("--swipe-height",`${Math.min(800,Math.max(360,viewportHeight-top-8))}px`);
  requestAnimationFrame(updateGuestDetailsButtons);
}
function updateGuestDetailsButtons(){
  cards.querySelectorAll(".swipe-card").forEach(card=>{
    const button=card.querySelector(".guest-info");
    const name=card.querySelector(".person-name");
    const description=card.querySelector(".description");
    button.hidden=true;
    const clipped=name.scrollHeight>name.clientHeight+1 || description.scrollHeight>description.clientHeight+1;
    button.hidden=!clipped;
  });
}
function openGuestDetails(person,button){
  if(currentPanel!=="people" || deciding || button.closest(".swipe-card")!==frontCard())return;
  cancelInteraction();
  guestDetailsReturnFocus=button;
  document.querySelector("#guest-details-name").textContent=person.name;
  document.querySelector("#guest-details-description").textContent=person.description;
  guestDetails.showModal();
}
function frontCard(){return cards.querySelector(".swipe-card--front");}
function setActionLock(locked){
  const unavailable=locked || deckIndex>=people.length;
  likeButton.disabled=dislikeButton.disabled=unavailable;
}
function releaseDrag(){
  const previous=drag;
  drag=null;
  if(previous?.card.hasPointerCapture?.(previous.pointerId))previous.card.releasePointerCapture(previous.pointerId);
}
function restoreCard(){
  const card=frontCard();
  if(!card)return;
  card.classList.remove("is-dragging","is-leaving");
  card.style.transform="";
  card.style.opacity="";
  card.querySelectorAll(".swipe-stamp").forEach(stamp=>{stamp.style.opacity="0";});
}
function cancelInteraction(){
  const finishDecision=deciding;
  interactionVersion++;
  if(animationTimer!==null)clearTimeout(animationTimer);
  animationTimer=null;
  releaseDrag();
  deciding=false;
  if(finishDecision)renderCards();else restoreCard();
  setActionLock(false);
  if(viewportUpdatePending)updateViewport();
}
function showPanel(panel){
  if(!Object.hasOwn(mockupLabels,panel))return;
  if(guestDetails.open)guestDetails.close();
  cancelInteraction();
  currentPanel=panel;
  const [code,title]=mockupLabels[panel];
  const caption=document.querySelector("#demo-mockup-caption");
  caption.dataset.mockupLabel=`${code} — ${title}`;
  caption.querySelector(".mockup-code").textContent=code;
  caption.querySelector(".mockup-title").textContent=title;
  if(location.hash!=="#"+panel)history.replaceState(null,"","#"+panel);
  for(const name of Object.keys(mockupLabels))document.querySelector("#"+name+"-panel").hidden=name!==panel;
  screen.classList.toggle("swipe-shell",panel==="people");
  document.body.classList.toggle("demo-swiping",panel==="people");
  const activeTab=panel==="rooms"?"people":panel;
  document.querySelectorAll("[data-tab]").forEach(tab=>{
    tab.classList.toggle("on",tab.dataset.tab===activeTab);
    if(tab.dataset.tab===activeTab)tab.setAttribute("aria-current","page");
    else tab.removeAttribute("aria-current");
  });
  status.textContent="";
  document.querySelector("#"+panel+"-title").focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"instant"});
  updateViewport();
}
function applyPortraitState(portrait){
  portrait.classList.toggle("no-photo",portraitsFailed || !portraitsReady);
}
function createCard(person,offset){
  const card=element("article","swipe-card "+(offset?`swipe-card--back${offset===2?"-2":""}`:"swipe-card--front"));
  card.dataset.personId=String(person.id);
  if(offset){card.setAttribute("aria-hidden","true");}
  else{
    card.tabIndex=0;
    card.setAttribute("aria-label",`${person.name}. ${person.description} Свайп вправо или стрелка вправо — лайк, влево — дизлайк.`);
  }
  const portrait=element("div","swipe-portrait");
  portrait.style.setProperty("--portrait-position",person.photoPosition);
  portrait.setAttribute("role","img");
  portrait.setAttribute("aria-label",`Фото вымышленного гостя: ${person.name}`);
  // Crop one atlas column in markup, then cover the card with that portrait.
  // This keeps the face at the top and prevents neighbouring portraits leaking.
  const photo=document.createElementNS("http://www.w3.org/2000/svg","svg");
  photo.classList.add("portrait-image");
  photo.setAttribute("viewBox","0 0 591.333333 887");
  photo.setAttribute("preserveAspectRatio","xMidYMin slice");
  photo.setAttribute("aria-hidden","true");
  const atlas=document.createElementNS("http://www.w3.org/2000/svg","image");
  atlas.setAttribute("href","assets/demo-portraits.png");
  atlas.setAttribute("width","1774");atlas.setAttribute("height","887");
  atlas.setAttribute("x",String(-591.333333*(Number.parseFloat(person.photoPosition)/50)));
  photo.append(atlas);
  portrait.append(photo);
  portrait.append(element("span","initials",person.initials));
  applyPortraitState(portrait);
  const body=element("div","card-body");
  const nameLine=element("div","name-line");
  const info=element("button","guest-info");
  info.type="button";info.hidden=true;info.disabled=offset>0;info.tabIndex=offset?-1:0;
  info.setAttribute("aria-label",`О госте: ${person.name}. Полный текст`);
  info.setAttribute("aria-haspopup","dialog");
  info.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>';
  info.addEventListener("click",event=>{event.stopPropagation();openGuestDetails(person,info);});
  nameLine.append(element("h2","person-name",person.name),info);
  body.append(nameLine,element("p","description",person.description));
  const previous=likes.has(person.id)?"Твой выбор: лайк":dislikes.has(person.id)?"Твой выбор: дизлайк":"";
  body.append(element("span","swipe-previous",previous));
  card.append(element("span","swipe-stamp swipe-stamp--like","ЛАЙК"),element("span","swipe-stamp swipe-stamp--nope","НЕТ"));
  attachGesture(card);
  card.append(portrait,body);
  return card;
}
function renderCards(){
  const existing=new Map([...cards.querySelectorAll(".swipe-card")].map(card=>[Number(card.dataset.personId),card]));
  document.querySelector("#card-progress").textContent=deckIndex<people.length?`${deckIndex+1} / ${people.length}`:"Все просмотрены";
  const remaining=people.slice(deckIndex,deckIndex+3);
  if(!remaining.length){
    const empty=element("div","swipe-empty");
    const repeat=element("button","pill pill--yellow","Посмотреть ещё раз");
    repeat.type="button";
    repeat.addEventListener("click",()=>{
      cancelInteraction();deckIndex=0;renderCards();
      status.textContent="Карточки повторяются. Твои реакции и мэтчи сохранены.";
      frontCard()?.focus({preventScroll:true});
    });
    empty.append(element("span","empty-symbol","✦"),element("h2","","Пока это все"),element("p","","Ты посмотрел всех гостей. Можно вернуться к мэтчам или пройти карточки ещё раз."),repeat);
    cards.replaceChildren(empty);
  }else{
    cards.querySelector(".swipe-empty")?.remove();
    for(const [id,card] of existing)if(!remaining.some(person=>person.id===id))card.remove();
    remaining.forEach((person,offset)=>{
      const card=existing.get(person.id) || createCard(person,offset);
      card.className="swipe-card "+(offset?`swipe-card--back${offset===2?"-2":""}`:"swipe-card--front");
      card.style.transform="";card.style.opacity="";
      card.querySelectorAll(".swipe-stamp").forEach(stamp=>{stamp.style.opacity="0";});
      card.querySelector(".swipe-previous").textContent=likes.has(person.id)?"Твой выбор: лайк":dislikes.has(person.id)?"Твой выбор: дизлайк":"";
      const info=card.querySelector(".guest-info");info.disabled=offset>0;info.tabIndex=offset?-1:0;
      if(offset){card.setAttribute("aria-hidden","true");card.removeAttribute("tabindex");}
      else{
        card.removeAttribute("aria-hidden");card.tabIndex=0;
        card.setAttribute("aria-label",`${person.name}. ${person.description} Свайп вправо или стрелка вправо — лайк, влево — дизлайк.`);
      }
      if(!card.isConnected)cards.append(card);
    });
    likeButton.setAttribute("aria-label",`Лайк: ${remaining[0].name}`);
    dislikeButton.setAttribute("aria-label",`Дизлайк: ${remaining[0].name}`);
  }
  document.querySelector("#swipe-actions").hidden=!remaining.length;
  setActionLock(false);
  requestAnimationFrame(updateGuestDetailsButtons);
}
function decide(reaction){
  if(deciding || currentPanel!=="people" || deckIndex>=people.length || !["like","dislike"].includes(reaction))return;
  releaseDrag();
  deciding=true;
  setActionLock(true);
  const version=++interactionVersion;
  const person=people[deckIndex];
  const card=frontCard();
  const restoreFocus=document.activeElement===card;
  const direction=reaction==="like"?1:-1;
  // Confirmed intent is immediate; the timer only finishes the visual transition.
  const wasMutual=likes.has(person.id)&&reciprocal.has(person.id);
  if(reaction==="like"){likes.add(person.id);dislikes.delete(person.id);}
  else{dislikes.add(person.id);likes.delete(person.id);}
  deckIndex++;
  renderMatches();
  const isMutual=likes.has(person.id)&&reciprocal.has(person.id);
  status.textContent=isMutual&&!wasMutual?`У вас с ${person.name} взаимная симпатия! ♥`:
    reaction==="like"?`Лайк: ${person.name}.`:`Дизлайк: ${person.name}.`;
  card.classList.remove("is-dragging");
  card.classList.add("is-leaving");
  card.querySelector(reaction==="like"?".swipe-stamp--like":".swipe-stamp--nope").style.opacity="1";
  if(!motionPreference.matches){
    const distance=Math.max(window.innerWidth,card.offsetWidth)*1.2;
    card.style.transform=`translate3d(${direction*distance}px,25px,0) rotate(${direction*22}deg)`;
  }
  card.style.opacity="0";
  cards.querySelector(".swipe-card--back")?.classList.add("is-promoting");
  cards.querySelector(".swipe-card--back-2")?.classList.add("is-advancing");
  const finishTransition=()=>{
    card.removeEventListener("transitionend",onTransitionEnd);
    if(version!==interactionVersion || currentPanel!=="people" || !deciding)return;
    if(animationTimer!==null)clearTimeout(animationTimer);
    animationTimer=null;
    deciding=false;
    renderCards();
    if(viewportUpdatePending)updateViewport();
    if(restoreFocus)(frontCard() || cards.querySelector("button"))?.focus({preventScroll:true});
  };
  const onTransitionEnd=event=>{
    if(event.target===card && event.propertyName===(motionPreference.matches?"opacity":"transform"))finishTransition();
  };
  card.addEventListener("transitionend",onTransitionEnd);
  animationTimer=setTimeout(finishTransition,motionPreference.matches?160:480);
}
function attachGesture(card){
  card.addEventListener("pointerdown",event=>{
    if(deciding || drag || currentPanel!=="people" || event.isPrimary===false ||
        event.target.closest?.("button,a") ||
        (event.pointerType==="mouse" && event.button!==0))return;
    drag={card,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,width:card.offsetWidth,
      dx:0,dy:0,horizontal:false};
  });
  card.addEventListener("pointermove",event=>{
    if(!drag || drag.card!==card || drag.pointerId!==event.pointerId || deciding)return;
    const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;
    drag.dx=dx;drag.dy=dy;
    if(!drag.horizontal){
      if(Math.abs(dy)>8 && Math.abs(dy)>=Math.abs(dx)){releaseDrag();if(viewportUpdatePending)updateViewport();return;}
      if(Math.abs(dx)<8 || Math.abs(dx)<Math.abs(dy)*1.15)return;
      drag.horizontal=true;
      card.setPointerCapture?.(event.pointerId);
      card.classList.add("is-dragging");
    }
    if(event.cancelable)event.preventDefault();
    const width=drag.width || 330;
    card.style.transform=motionPreference.matches?`translate3d(${dx}px,0,0)`:
      `translate3d(${dx}px,${Math.max(-35,Math.min(35,dy*.15))}px,0) rotate(${dx/width*14}deg)`;
    const progress=Math.min(1,Math.abs(dx)/(width*.28));
    card.querySelector(".swipe-stamp--like").style.opacity=dx>0?String(progress):"0";
    card.querySelector(".swipe-stamp--nope").style.opacity=dx<0?String(progress):"0";
  });
  card.addEventListener("pointerup",event=>{
    if(!drag || drag.card!==card || drag.pointerId!==event.pointerId)return;
    const gesture=drag;
    const dx=event.clientX-gesture.startX;
    const threshold=Math.min(110,Math.max(64,(gesture.width || 330)*.28));
    releaseDrag();
    if(gesture.horizontal && Math.abs(dx)>=threshold){
      decide(dx>0?"like":"dislike");
    }else{restoreCard();if(viewportUpdatePending)updateViewport();}
  });
  const cancelPointer=event=>{
    if(!drag || drag.card!==card || drag.pointerId!==event.pointerId)return;
    releaseDrag();restoreCard();if(viewportUpdatePending)updateViewport();
  };
  card.addEventListener("pointercancel",cancelPointer);
  // Touch starts with implicit capture on the photo/text child. Its capture loss
  // bubbles while capture transfers to this card; only our own loss cancels.
  card.addEventListener("lostpointercapture",event=>{if(event.target===card)cancelPointer(event);});
  card.addEventListener("pointerleave",event=>{
    if(drag && !drag.horizontal && event.pointerType==="mouse")cancelPointer(event);
  });
  card.addEventListener("keydown",event=>{
    if(event.target!==card || event.repeat || !["ArrowLeft","ArrowRight"].includes(event.key))return;
    event.preventDefault();decide(event.key==="ArrowRight"?"like":"dislike");
  });
}
function renderMatches(){
  const mutual=people.filter(person=>likes.has(person.id)&&reciprocal.has(person.id));
  const badge=document.querySelector("#match-count");
  badge.textContent=String(mutual.length);badge.hidden=mutual.length===0;
  const summary=mutual.length?"♥ "+mutual.length+" "+(mutual.length===1?"мэтч":"мэтча")+" за вечер":"Пока без мэтчей";
  document.querySelector("#room-match-summary").textContent=summary;
  document.querySelector("#hub-match-summary").textContent=summary;
  matches.replaceChildren();
  if(!mutual.length){
    const empty=element("div","empty");
    empty.append(element("h2","em","Пока без мэтчей"),element("p","ep","Взаимная симпатия появится здесь, когда вы понравитесь друг другу."));
    matches.append(empty);
  }
  mutual.forEach(person=>{
    const card=element("article","match-card");
    const photo=element("div","match-photo");
    photo.style.setProperty("--portrait-position",person.photoPosition);
    photo.setAttribute("role","img");photo.setAttribute("aria-label",`Фото ${person.name}`);
    const unlike=element("button","pill pill--ghost unlike-button","Снять мой лайк");
    unlike.type="button";
    unlike.setAttribute("aria-label",`Снять лайк: ${person.name}`);
    unlike.addEventListener("click",()=>{
      cancelInteraction();likes.delete(person.id);renderMatches();renderCards();
      status.textContent=`Лайк ${person.name} снят. Взаимность завершена.`;
      document.querySelector("#matches-title").focus({preventScroll:true});
    });
    card.append(photo,element("div","match-label","♥ Симпатия взаимна"),element("h2","person-name",person.name),element("p","description","Вы понравились друг другу. Лайк сам по себе не передаёт контакт."),element("div","pending","Контакт закрыт. Правило отдельной передачи конкретному взаимному мэтчу уже выбрано, но в этом макете ещё не реализовано."),unlike);
    matches.append(card);
  });
}
likeButton.addEventListener("click",()=>decide("like"));
dislikeButton.addEventListener("click",()=>decide("dislike"));
const guestDetailsClose=document.querySelector("#guest-details-close");
let closePress=null;
guestDetailsClose.addEventListener("pointerdown",event=>{
  if(event.isPrimary===false || (event.pointerType==="mouse" && event.button!==0))return;
  closePress={id:event.pointerId,x:event.clientX,y:event.clientY};
});
guestDetailsClose.addEventListener("pointercancel",()=>{closePress=null;});
guestDetailsClose.addEventListener("pointerup",event=>{
  const press=closePress;closePress=null;
  if(!press || press.id!==event.pointerId)return;
  const box=guestDetailsClose.getBoundingClientRect();
  const inside=event.clientX>=box.left && event.clientX<=box.right && event.clientY>=box.top && event.clientY<=box.bottom;
  // Native scrolling can suppress click after a valid tap; keyboard keeps click.
  if(inside && Math.hypot(event.clientX-press.x,event.clientY-press.y)<10)guestDetails.close();
});
guestDetailsClose.addEventListener("click",()=>guestDetails.close());
guestDetails.addEventListener("close",()=>{
  if(guestDetailsReturnFocus?.isConnected && !guestDetailsReturnFocus.hidden){guestDetailsReturnFocus.focus({preventScroll:true});}
  else frontCard()?.focus({preventScroll:true});
  guestDetailsReturnFocus=null;
});
document.querySelectorAll("[data-tab], [data-open]").forEach(button=>button.addEventListener("click",()=>showPanel(button.dataset.tab||button.dataset.open)));
document.querySelector("#home-link").addEventListener("click",event=>{event.preventDefault();showPanel("rooms");});
people.forEach(person=>{
  const label=element("label");const input=element("input");input.type="checkbox";
  input.addEventListener("change",()=>{
    if(input.checked)reciprocal.add(person.id);else reciprocal.delete(person.id);
    renderMatches();status.textContent="Ответный лайк изменён в макете.";
  });
  label.append(input,element("span","",person.name+" лайкает меня"));
  document.querySelector("#reciprocal-controls").append(label);
});
function resetPhoto(){
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  photoUrl=null;
  document.querySelector("#profile-photo").replaceChildren(element("span","initials","Я"),element("small","","Твоя фотография"));
  document.querySelector("#photo-input").value="";
}
document.querySelector("#choose-photo").addEventListener("click",()=>document.querySelector("#photo-input").click());
document.querySelector("#photo-input").addEventListener("change",event=>{
  const file=event.target.files[0];if(!file)return;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024){
    status.textContent="Выбери JPEG, PNG или WebP размером до 10 МБ.";event.target.value="";return;
  }
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  photoUrl=URL.createObjectURL(file);
  const image=element("img");image.alt="Предпросмотр выбранной фотографии";
  image.addEventListener("error",()=>{resetPhoto();status.textContent="Не удалось открыть изображение. Выбери другое.";});
  image.src=photoUrl;document.querySelector("#profile-photo").replaceChildren(image);
  status.textContent="Фото открыто локально, никуда не отправлено.";
});
document.querySelector("#save-profile").addEventListener("click",()=>{status.textContent="Профиль остаётся только в этом макете до обновления страницы.";});
document.querySelector("#reset").addEventListener("click",()=>{
  cancelInteraction();likes.clear();dislikes.clear();reciprocal.clear();deckIndex=0;resetPhoto();
  document.querySelector("#profile-description").value="";
  document.querySelectorAll("#reciprocal-controls input[type=checkbox]").forEach(input=>{input.checked=false;});
  renderCards();renderMatches();showPanel("people");status.textContent="Макет сброшен.";
});
document.addEventListener("click",event=>{if(event.target.closest("[data-review-notes]"))cancelInteraction();},true);
window.addEventListener("blur",cancelInteraction);
document.addEventListener("visibilitychange",()=>{if(document.hidden)cancelInteraction();});
window.addEventListener("resize",()=>{
  if(window.innerWidth!==viewportWidth){viewportWidth=window.innerWidth;cancelInteraction();}
  updateViewport();
});
window.visualViewport?.addEventListener("resize",updateViewport);
motionPreference.addEventListener("change",cancelInteraction);
window.addEventListener("beforeunload",()=>{cancelInteraction();if(photoUrl)URL.revokeObjectURL(photoUrl);});
const portraitImage=new Image();
portraitImage.addEventListener("load",()=>{
  portraitsReady=true;portraitsFailed=false;
  cards.querySelectorAll(".swipe-portrait").forEach(applyPortraitState);
});
portraitImage.addEventListener("error",()=>{
  portraitsFailed=true;
  cards.querySelectorAll(".swipe-portrait").forEach(applyPortraitState);
});
portraitImage.src="assets/demo-portraits.png";
renderCards();renderMatches();
function openHashPanel(){showPanel(Object.hasOwn(mockupLabels,location.hash.slice(1))?location.hash.slice(1):"people");}
window.addEventListener("hashchange",openHashPanel);
openHashPanel();
