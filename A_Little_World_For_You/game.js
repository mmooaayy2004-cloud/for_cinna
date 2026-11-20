(() => {
  const $ = (id) => document.getElementById(id);
  const screens = ["intro","birthday","gameScreen","stageComplete","finale"];
  function showScreen(id){ screens.forEach(s => $(s).classList.toggle("active",s===id)); }
  const noBtn=$("noBtn"), tease=$("tease");
  const teasing=["Are you sure? This button is getting nervous 🙈","Whoa! That was a close one!","Looks like “No” really doesn’t want to be picked 😄","Try the other button. It’s waiting for you ❤️"];
  let teaseIndex=0;
  function escapeNo(){
    const parent=noBtn.parentElement.getBoundingClientRect();
    const btn=noBtn.getBoundingClientRect();
    const maxX=Math.max(0,parent.width-btn.width);
    const maxY=75;
    noBtn.style.position="relative";
    noBtn.style.transform=`translate(${(Math.random()-.5)*Math.min(maxX,170)}px, ${(Math.random()-.5)*maxY}px)`;
    tease.textContent=teasing[teaseIndex++%teasing.length];
  }
  noBtn.addEventListener("pointerenter",escapeNo);
  noBtn.addEventListener("click",(e)=>{e.preventDefault();escapeNo();});
  noBtn.addEventListener("touchstart",(e)=>{e.preventDefault();escapeNo();},{passive:false});
  $("yesBtn").addEventListener("click",()=>{showScreen("birthday");});
  $("startGameBtn").addEventListener("click",()=>{showScreen("gameScreen");startGame();});

  const canvas=$("game"),ctx=canvas.getContext("2d");
  const W=canvas.width,H=canvas.height,ground=470;
  const stages=[
    {name:"Heart Valley",mission:"Collect the hearts",items:["heart","heart","star","heart","star"],sky:"#f8cde0",hill:"#eea9c8",ground:"#bd7a9e",message:"Every heart you collected reminds me of a beautiful moment I hope you will always remember.",icon:"💗"},
    {name:"Flower Garden",mission:"Collect your favorite flowers",items:["lily","peony","tulip","daisy","tulip"],sky:"#f7d9ec",hill:"#cba9d9",ground:"#9f9ac4",message:"I chose flowers you love, and I hope your days are always full of color and happiness.",icon:"🌷"},
    {name:"Starry Path",mission:"Collect the stars",items:["star","heart","star","heart","star"],sky:"#d9c9ef",hill:"#a99acb",ground:"#887cae",message:"You are so close to your surprise! Just one more little step until your gift.",icon:"✨"}
  ];
  let stage=0,score=0,items=[],platforms=[],camera=0,frame=0,running=false,raf=0;
  const player={x:75,y:ground-55,w:34,h:48,vx:0,vy:0,onGround:false,face:1};
  const keys={left:false,right:false,jump:false};
  function makeLevel(){
    const data=stages[stage];items=[];
    const positions=[250,480,730,1010,1280];
    data.items.forEach((type,i)=>items.push({x:positions[i],y:ground-65-(i%2)*45,type,taken:false}));
    platforms=[{x:350,y:370,w:115,h:18},{x:620,y:320,w:120,h:18},{x:900,y:380,w:120,h:18},{x:1150,y:330,w:130,h:18}];
    player.x=75;player.y=ground-player.h;player.vx=0;player.vy=0;camera=0;
    $("levelLabel").textContent=`${stage+1} / 3`;
    $("missionLabel").textContent=data.mission;
    $("scoreLabel").textContent=`${score} / 15`;
    $("levelToast").textContent=`${data.name} — ${data.mission}`;
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
  function drawFlower(x,y,type,scale=1){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const colors={lily:"#fff7fc",peony:"#f18ab7",tulip:"#ed6f9f",daisy:"#fffdf0"};
    const c=colors[type]||"#fff";
    for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);rect(-5,-17,10,18,c);ctx.restore();}
    rect(-4,-4,8,8,type==="daisy"?"#f4c65d":"#f6d47a");
    ctx.restore();
  }
  function drawHeart(x,y,size,color="#f16d9f"){
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y+size*.35);ctx.bezierCurveTo(x-size,y-size*.35,x-size*.9,y-size,x,y-size*.45);ctx.bezierCurveTo(x+size*.9,y-size,x+size,y-size*.35,x,y+size*.35);ctx.fill();
  }
  function drawGirl(x,y){
    // Tiny pixel-art heroine: hair, face, dress, legs and bow.
    const px=Math.round(x),py=Math.round(y);
    rect(px+8,py+34,7,13,"#8b4b68");rect(px+21,py+34,7,13,"#8b4b68");
    rect(px+5,py+20,26,17,"#e875a7");rect(px+9,py+18,18,6,"#f7a9c8");
    rect(px+7,py+3,23,20,"#70435f");rect(px+10,py+7,18,15,"#ffd9c8");
    rect(px+6,py+1,25,8,"#70435f");rect(px+4,py+7,7,18,"#70435f");rect(px+27,py+7,7,17,"#70435f");
    rect(px+14,py+12,3,3,"#58394c");rect(px+23,py+12,3,3,"#58394c");
    rect(px+18,py+17,5,2,"#df8194");rect(px+27,py+2,6,5,"#f5a4c5");rect(px+29,py+0,4,4,"#ffe7a6");
    rect(px+5,py+24,5,10,"#ffd9c8");rect(px+29,py+24,5,10,"#ffd9c8");
  }
  function draw(){
    const sky=stages[stage].sky;rect(0,0,W,H,sky);
    // floating clouds
    for(let i=0;i<5;i++){let x=((i*230-frame*.25)%(W+180)+W+180)%(W+180)-80;rect(x,80+i%2*45,70,15,"#fff8");rect(x+15,68+i%2*45,42,18,"#fff8");}
    // distant hills
    ctx.fillStyle=stages[stage].hill;ctx.beginPath();ctx.moveTo(0,ground);for(let x=0;x<=W;x+=20)ctx.lineTo(x,360+Math.sin((x+camera*.25)/90)*25);ctx.lineTo(W,H);ctx.fill();
    // ground
    rect(0,ground,W,H-ground,stages[stage].ground);rect(0,ground,W,12,"#f8c4dc");
    for(let x=0;x<W;x+=32){rect(x,ground+24,12,5,"#ffffff22");}
    // decorative flowers
    for(let i=0;i<18;i++){let x=((i*91-camera*.55)%(W+40)+W+40)%(W+40);drawFlower(x,ground+34,"daisy",.45);}
    platforms.forEach(p=>{rect(p.x-camera,p.y,p.w,p.h,"#a66b92");rect(p.x-camera,p.y,p.w,6,"#ffe5ef");});
    items.forEach(it=>{if(it.taken)return;let x=it.x-camera;if(x<-40||x>W+40)return;
      if(["lily","peony","tulip","daisy"].includes(it.type))drawFlower(x,it.y,it.type,1.1);
      else if(it.type==="heart")drawHeart(x,it.y,17);
      else{ctx.fillStyle="#ffe58a";ctx.beginPath();for(let j=0;j<10;j++){let r=j%2?7:17,a=j*Math.PI/5-Math.PI/2;ctx.lineTo(x+Math.cos(a)*r,it.y+Math.sin(a)*r);}ctx.closePath();ctx.fill();}
    });
    drawGirl(player.x-camera,player.y);
    // finish gate
    rect(1390-camera,ground-100,12,100,"#fff0f7");rect(1370-camera,ground-110,52,13,"#e879aa");drawHeart(1396-camera,ground-125,15,"#fff");
    frame++;
  }
  function update(){
    if(!running)return;
    const speed=4.1;
    player.vx=(keys.right?speed:0)-(keys.left?speed:0);
    if(player.vx)player.face=Math.sign(player.vx);
    if(keys.jump&&player.onGround){player.vy=-12.8;player.onGround=false;}
    keys.jump=false;
    player.vy+=.58;player.x+=player.vx;player.y+=player.vy;
    if(player.y+player.h>=ground){player.y=ground-player.h;player.vy=0;player.onGround=true;}
    platforms.forEach(p=>{let prevBottom=player.y+player.h-player.vy;if(player.vy>=0&&player.x+player.w>p.x&&player.x<p.x+p.w&&prevBottom<=p.y&&player.y+player.h>=p.y){player.y=p.y-player.h;player.vy=0;player.onGround=true;}});
    player.x=Math.max(0,Math.min(1450,player.x));
    items.forEach(it=>{if(!it.taken&&Math.abs((player.x+player.w/2)-it.x)<27&&Math.abs((player.y+player.h/2)-it.y)<38){it.taken=true;score++;$("scoreLabel").textContent=`${score} / 15`;}});
    camera=Math.max(0,Math.min(520,player.x-250));
    if(player.x>1370){completeStage();}
    draw();raf=requestAnimationFrame(update);
  }
  function startGame(){stage=0;score=0;makeLevel();running=true;cancelAnimationFrame(raf);draw();raf=requestAnimationFrame(update);}
  function completeStage(){
    running=false;cancelAnimationFrame(raf);
    if(stage<2){
      $("stageIcon").textContent=stages[stage].icon;
      $("stageTitle").textContent=`You reached the end of ${stages[stage].name}!`;
      $("stageText").textContent=stages[stage].message;
      $("nextStageBtn").textContent=stage===1?"To the Final Level":"Next Level";
      showScreen("stageComplete");
    }else{showScreen("finale");}
  }
  $("nextStageBtn").addEventListener("click",()=>{stage++;makeLevel();showScreen("gameScreen");running=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(update);});
  $("openGiftBtn").addEventListener("click",()=>{$("openGiftBtn").classList.add("opened");$("loveLetter").classList.remove("hidden");$("openGiftBtn").querySelector("small").textContent="You opened your gift ❤️";});
  $("replayBtn").addEventListener("click",()=>{$("openGiftBtn").classList.remove("opened");$("loveLetter").classList.add("hidden");showScreen("intro");});
  window.addEventListener("keydown",e=>{
    if(["ArrowLeft","ArrowRight"," ","ArrowUp"].includes(e.key))e.preventDefault();
    if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")keys.left=true;
    if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")keys.right=true;
    if(e.key===" "||e.key==="ArrowUp"||e.key.toLowerCase()==="w")keys.jump=true;
  });
  window.addEventListener("keyup",e=>{
    if(e.key==="ArrowLeft"||e.key.toLowerCase()==="a")keys.left=false;
    if(e.key==="ArrowRight"||e.key.toLowerCase()==="d")keys.right=false;
  });
  document.querySelectorAll("[data-control]").forEach(btn=>{
    const c=btn.dataset.control;
    const down=e=>{e.preventDefault();if(c==="jump")keys.jump=true;else keys[c]=true;};
    const up=e=>{e.preventDefault();if(c!=="jump")keys[c]=false;};
    btn.addEventListener("pointerdown",down);btn.addEventListener("pointerup",up);btn.addEventListener("pointerleave",up);btn.addEventListener("pointercancel",up);
  });
})();