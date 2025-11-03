// —— 猫猫狗狗幸存者 豪华年度版升级 ——
// 各种打击感、鼠标攻击方向、自动&鼠标射击、粒子特效、怪物速度分级、容错大幅提升

const W = 900, H = 600;
const canvas = document.getElementById("gameCanvas");
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d");

const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const gameUI = document.getElementById('gameUI');
const levelupBox = document.getElementById('levelupBox');
const levelupChoices = document.getElementById('levelupChoices');
const gameOverBox = document.getElementById('gameOverBox');
const finalScore = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const hudTime = document.getElementById('time');
const hudScore = document.getElementById('score');
const hudHealth = document.getElementById('health');
const hudSkills = document.getElementById('skills');
const expBar = document.getElementById('expbar');
const expVal = document.getElementById('expval');
const aboutBtn = document.getElementById('aboutBtn');
const authorBtn = document.getElementById('authorBtn');
const aboutText = document.getElementById('aboutText');
const authorText = document.getElementById('authorText');
const backBtn1 = document.getElementById('backBtn1');
const backBtn2 = document.getElementById('backBtn2');

function show(ele) { ele.classList.remove('hidden'); }
function hide(ele) { ele.classList.add('hidden'); }

// ——— 鼠标控制支持 ———
let mouse = { x: W/2, y: H/2, down: false };
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});
canvas.addEventListener('mousedown', ()=>{mouse.down=true;});
canvas.addEventListener('mouseup', ()=>{mouse.down=false;});

// ——— 页面逻辑 ———
startBtn.onclick = () => {
  hide(menu); show(gameUI); startGame();
};
aboutBtn.onclick = () => { show(aboutText); hide(startBtn); hide(authorBtn); };
authorBtn.onclick = () => { show(authorText); hide(startBtn); hide(aboutBtn); };
backBtn1.onclick = backBtn2.onclick = () => {
  hide(aboutText); hide(authorText); show(startBtn); show(aboutBtn); show(authorBtn);
};
restartBtn.onclick = () => { hide(gameOverBox); show(gameUI); startGame(); }
backToMenuBtn.onclick = () => { hide(gameOverBox); show(menu); };

let gameState;
let loopId = null;
let paused = false;
let lastFrameT = 0;
pauseBtn.onclick = () => {
  paused = !paused;
  pauseBtn.innerText = paused ? '继续' : '暂停';
};

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "Escape") paused = !paused;
});
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
function getMoveDir() {
  let dx = 0, dy = 0;
  if (keys['w']||keys['arrowup']) dy -= 1;
  if (keys['s']||keys['arrowdown']) dy += 1;
  if (keys['a']||keys['arrowleft']) dx -= 1;
  if (keys['d']||keys['arrowright']) dx += 1;
  if (dx !==0 || dy!==0) {
    let len = Math.sqrt(dx*dx+dy*dy);
    return {dx: dx/len, dy: dy/len};
  } return {dx:0,dy:0};
}

// ——— 玩家初始参数及升级池 ———
const INITIAL_PLAYER = {
  x: W/2, y: H/2, r: 26,
  hp: 200, maxHp: 200, speed: 4.2,
  atk: 9,
  bulletSpeed: 13,
  atkDelay: 0.45,
  atkRange: 180,
  skills: [],
  exp: 0,
  expNext: 12,
  level: 1,
  invincible: 0,  // 受伤无敌
  invincibleTimer: 0,
  score: 0,
};
const SKILL_LIST = [
  { id:'atkUp', name:'攻击力↑', desc:'攻击力+5', apply: p => p.atk+=5 },
  { id:'atkSpeed', name:'攻速↑', desc:'攻速提升', apply: p=>p.atkDelay*=0.85 },
  { id:'moveUp', name:'速度↑', desc:'移动速度+30%', apply: p=>p.speed*=1.3 },
  { id:'hpUp', name:'血量↑', desc:'血量+60', apply: p=>{p.maxHp+=60; p.hp=p.maxHp;} },
  { id:'rangeUp', name:'射程↑', desc:'攻击射程+50', apply: p=>p.atkRange+=50 },
  { id:'multiBullets', name:'多重弹', desc:'每次射击多发一颗', apply: p=>p.multiBullets=(p.multiBullets||1)+1 },
  { id:'healTick', name:'自动回血', desc:'每5秒回血10', apply: p=>p.healTick=true },
  // 可自由拓展
];

function startGame() {
  gameState = {
    player: {...INITIAL_PLAYER, multiBullets: 1, healTick: false},
    monsters: [],
    bullets: [],
    exps: [],
    skills: [],
    time: 0,
    wave: 1,
    lastAtk: 0,
    monsterSpawnTimer: 0,
    levelupReady: false,
    levelupChoices: [],
    score: 0,
    gameOver: false,
    paused: false,
    particles: [], // 粒子特效
    killCombo: 0, comboTimer: 0 // 连击打击感
  };
  hide(levelupBox); hide(gameOverBox);
  resizeCanvas();
  paused = false;
  pauseBtn.innerText = "暂停";
  lastFrameT = performance.now();
  if(loopId) cancelAnimationFrame(loopId);
  loopId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
  if(window.innerWidth < 700) {
    canvas.width = Math.max(250, window.innerWidth * 0.95);
    canvas.height = Math.max(300, window.innerHeight * 0.62);
  } else {
    canvas.width = W;
    canvas.height = H;
  }
}
window.onresize = resizeCanvas;

function gameLoop(ts) {
  let dt = (ts - lastFrameT)/1000;
  if(dt>0.08) dt = 0.04; // 防止卡顿
  lastFrameT = ts;

  if (paused || gameState.paused) {
    loopId = requestAnimationFrame(gameLoop); return;
  }
  if (!gameState.gameOver && !gameState.levelupReady)
    updateGame(dt);
  drawGame();
  loopId = requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
  let gs = gameState;
  if(gs.player.healTick){
    gs.player._healTimer = (gs.player._healTimer||0)+dt;
    if(gs.player._healTimer>5){ gs.player.hp=Math.min(gs.player.maxHp, gs.player.hp+10); gs.player._healTimer=0;}
  }
  gs.time += dt;
  gs.comboTimer -= dt;
  if(gs.comboTimer<=0) gs.killCombo=0;

  // 玩家移动
  let move = getMoveDir();
  gs.player.x += move.dx * gs.player.speed;
  gs.player.y += move.dy * gs.player.speed;
  gs.player.x = Math.max(gs.player.r, Math.min(canvas.width-gs.player.r, gs.player.x));
  gs.player.y = Math.max(gs.player.r, Math.min(canvas.height-gs.player.r, gs.player.y));

  // 怪物生成（分级速度&血量）
  gs.monsterSpawnTimer -= dt;
  let baseSpeed = 1 + gs.time/80;
  let spawnSpeed = Math.max(1.3, 3.2 - gs.time/120); // 延后更快
  if(gs.monsterSpawnTimer<0) {
    gs.monsterSpawnTimer = spawnSpeed+Math.random()*0.75;
    spawnMonster(gs, baseSpeed);
  }

  // 怪物移动、锁定玩家
  for(let m of gs.monsters) {
    if(m.hitFlash>0){m.hitFlash-=dt;}
    let dx = gs.player.x - m.x, dy = gs.player.y - m.y;
    let dist = Math.sqrt(dx*dx+dy*dy);
    let speed = m.speed;
    m.x += dx/dist * speed;
    m.y += dy/dist * speed;
  }

  // 攻击（鼠标控制方向，自动&点射）
  gs.lastAtk += dt;
  if(gs.lastAtk > gs.player.atkDelay) {
    if(mouse.down || true) { // 可以实现鼠标点射，或恒自动
      gs.lastAtk = 0;
      shootBullet(gs, mouse.x, mouse.y);
    }
  }

  // 子弹移动+命中
  for(let b of gs.bullets){
    b.x += b.vx;
    b.y += b.vy;
    b.lifetime--;
  }
  gs.bullets = gs.bullets.filter(b=>b.lifetime>0);

  // 子弹打怪 & 打击感
  for(let b of gs.bullets) {
    for(let m of gs.monsters) {
      let dx = b.x-m.x, dy=b.y-m.y;
      let dis = Math.sqrt(dx*dx+dy*dy);
      if(dis < m.r + b.r && !m.dead){
        m.hp -= gs.player.atk;
        b.lifetime = 0;
        m.hitFlash = 0.15;
        m.vx = dx/dis*16; m.vy=dy/dis*16; // 击退
        spawnParticles(gs, m.x, m.y, m.r, "#fa99d6", 13);
        if(m.hp<=0){
          m.dead = true; m.deathAnim=0.18; gs.score+=1;
          gs.killCombo+=1; gs.comboTimer=0.8;
          spawnParticles(gs, m.x, m.y, m.r+8, "#ff90c4", 18);
          spawnExp(gs, m.x, m.y);
        }
      }
    }
  }
  gs.monsters.forEach(m=>{
    if(m.vx || m.vy){
      m.x += m.vx*0.33; m.y += m.vy*0.33; m.vx*=0.66; m.vy*=0.66; // 击退衰减
      if(Math.abs(m.vx)+Math.abs(m.vy)<1){m.vx=0;m.vy=0;}
    }
    if(m.deathAnim){ m.deathAnim-=dt; }
  });
  gs.monsters = gs.monsters.filter(m=>!m.deathAnim);

  // 怪物碰玩家
  if(gs.player.invincibleTimer>0){gs.player.invincibleTimer-=dt;}
  for(let m of gs.monsters) {
    let dx = m.x - gs.player.x, dy = m.y - gs.player.y;
    let dis = Math.sqrt(dx*dx+dy*dy);
    if(dis < m.r + gs.player.r && gs.player.invincibleTimer<=0) {
      gs.player.hp -= Math.max(6, m.atk);
      gs.player.invincibleTimer = 0.8; // 碰撞无敌
      gs.player.x -= dx/dis*36; gs.player.y -= dy/dis*18; // 主角被击退
      spawnParticles(gs, gs.player.x, gs.player.y, 18, "#fff0fb", 10);
    }
  }

  // 经验球拾取
  for(let e of gs.exps) {
    let dx = e.x - gs.player.x, dy = e.y - gs.player.y;
    let dis = Math.sqrt(dx*dx+dy*dy);
    if(dis < gs.player.r + e.r + 6) {
      gs.player.exp += e.val;
      e.gone = true;
      if(gs.player.exp >= gs.player.expNext) {
        gs.levelupReady = true;
        gs.levelupChoices = getLevelupChoices(gs.player.skills);
      }
    }
  }
  gs.exps = gs.exps.filter(e=>!e.gone);

  // 死亡判定
  if(gs.player.hp <= 0){
    gs.gameOver = true;
    gameOver(gs.score, Math.floor(gs.time)); return;
  }
  if(gs.levelupReady){ showLevelupBox(); }

  // 打击粒子动画
  gs.particles = gs.particles.filter(p=>{
    p.x += p.vx; p.y += p.vy;
    p.life -= dt;
    return p.life>0;
  });
}

// 怪物分级速度、血量
function spawnMonster(gs, baseSpeed){
  let angle = Math.random()*Math.PI*2;
  let mx = Math.cos(angle)*canvas.width*0.48 + canvas.width/2;
  let my = Math.sin(angle)*canvas.height*0.48 + canvas.height/2;
  // monster分级
  let waveLv = 1+Math.floor(gs.time/45);
  let monsterTypes = [
    {r:20, hp:18+waveLv*4, speed:baseSpeed+Math.random()*0.7, atk:7 },
    {r:34, hp:48+waveLv*12, speed:baseSpeed*0.68, atk:18 },
    {r:12, hp:8+waveLv*2, speed:baseSpeed*1.38+Math.random()*0.5, atk:4 }
  ];
  let mt = monsterTypes[Math.random()<0.6?0:(Math.random()<0.8?1:2)];
  let dog = {
    x: mx, y: my,
    r: mt.r,
    hp: mt.hp,
    maxhp: mt.hp,
    speed: mt.speed,
    atk: mt.atk,
    color: "#ffeaa7",
    earColor: "#f3a683",
    hitFlash:0,
    deathAnim:0,
    vx:0,vy:0,
  };
  gs.monsters.push(dog);
}
function spawnExp(gs,x,y){
  gs.exps.push({
    x, y, r: 8, val: 8+Math.floor(Math.random()*2), color: "#fa99d6",
  });
}
// 子弹：鼠标方向/多重弹/伤害/击退
function shootBullet(gs, tx, ty){
  let p=gs.player, bullets=[];
  let shotNum=p.multiBullets||1;
  for(let i=0;i<shotNum;i++){
    let angle = Math.atan2(ty-p.y,tx-p.x)+((i-(shotNum-1)/2)*0.20);
    let vx = Math.cos(angle)*p.bulletSpeed;
    let vy = Math.sin(angle)*p.bulletSpeed;
    bullets.push({
      x: p.x + Math.cos(angle)*p.r,
      y: p.y + Math.sin(angle)*p.r,
      vx: vx, vy: vy,
      r: 8,
      color: "#fb7eeb",
      lifetime: Math.round(p.atkRange/Math.abs(vx+vy)*2),
    });
  }
  gs.bullets.push(...bullets);
}
// 升级池
function getLevelupChoices(taken){
  let pool = SKILL_LIST.filter(s=>!taken.includes(s.id));
  let picked=[];
  for(let i=0;i<3;i++){
    let idx = Math.floor(Math.random()*pool.length);
    if(pool[idx]) picked.push(pool[idx]);
    pool.splice(idx,1);
  }
  return picked;
}
function showLevelupBox(){
  pauseGame();
  levelupChoices.innerHTML = "";
  gameState.levelupChoices.forEach(s=>{
    let btn = document.createElement("button");
    btn.innerHTML = `<b>${s.name}</b><br>${s.desc}`;
    btn.onclick = () => {
      s.apply(gameState.player);
      gameState.player.skills.push(s.id);
      gameState.player.level += 1;
      gameState.player.exp = 0;
      gameState.player.expNext += 13+Math.floor(gameState.player.level*2.9);
      hide(levelupBox); resumeGame(); gameState.levelupReady = false; gameState.levelupChoices = [];
    };
    levelupChoices.appendChild(btn);
  });
  show(levelupBox);
}
function pauseGame(){ gameState.paused=true;}
function resumeGame(){ gameState.paused=false; }

function gameOver(score, time){
  show(gameOverBox);
  hide(gameUI); pauseGame();
  finalScore.innerHTML = `得分：${score}<br>生存时间：${time} 秒`;
}

// 打击粒子/爆炸效果
function spawnParticles(gs, x, y, r, color, count){
  for(let i=0;i<count;i++){
    let angle = Math.random()*Math.PI*2;
    let speed = Math.random()*3+1.2;
    gs.particles.push({
      x:x, y:y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed,
      color,
      r:1.9+Math.random()*2.5,
      life:0.17+Math.random()*0.22,
    });
  }
}

// 绘制全部
function drawGame(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.fillStyle="#ffe5ef";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // 粒子动画
  for(let p of gameState.particles){
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=p.color;
    ctx.globalAlpha = Math.max(0.30,p.life/0.38);
    ctx.fill();
    ctx.globalAlpha=1.0;
  }

  // 经验球
  for(let e of gameState.exps){
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.fillStyle=e.color;
    ctx.shadowColor="#fff";
    ctx.shadowBlur=9;
    ctx.fill(); ctx.shadowBlur=0;
  }

  // 怪物（打击感闪、死亡动画缩放）
  for(let m of gameState.monsters){
    ctx.save();
    if(m.hitFlash>0){
      ctx.globalAlpha=0.55+Math.sin(performance.now()/33)%0.25;
      ctx.filter="brightness(1.9)";
      ctx.translate(m.x,m.y);
      ctx.scale(1.13,1.13);
      ctx.translate(-m.x,-m.y);
    }
    if(m.deathAnim>0) {
      ctx.translate(m.x,m.y);
      ctx.scale(m.deathAnim, m.deathAnim);
      ctx.translate(-m.x,-m.y);
    }
    drawDog(m.x, m.y, m.r, m.color, m.earColor);
    ctx.restore();
    // 怪物血量
    ctx.save()
    ctx.strokeStyle="#ff90c4"; ctx.lineWidth=5;
    ctx.beginPath();
    ctx.moveTo(m.x-m.r/1.2,m.y-m.r-6);
    ctx.lineTo(m.x-m.r/1.2+m.r*2*m.hp/m.maxhp,m.y-m.r-6);
    ctx.globalAlpha=0.8;
    ctx.stroke();
    ctx.globalAlpha=1.0;
    ctx.restore();
  }
  // 玩家角色
  drawCat(gameState.player.x,gameState.player.y,gameState.player.r);

  // 子弹
  for(let b of gameState.bullets){
    drawBullet(b);
  }
  ctx.restore();

  // HUD
  hudTime.innerText = `时间: ${Math.floor(gameState.time)}秒`;
  hudScore.innerText = `分数: ${gameState.score}`;
  hudHealth.innerHTML = `血量: <span style="color:#f31c86;font-weight:bold">${Math.floor(gameState.player.hp)}/${gameState.player.maxHp}</span>`;
  hudSkills.innerHTML = `技能: ${gameState.player.skills.map(id=>SKILL_LIST.find(s=>s.id===id).name).join(", ")}`;
  expVal.style.width = `${(gameState.player.exp/gameState.player.expNext)*120}px`;
}

function drawCat(x,y,r){
  ctx.save();
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle="#fff0fb";
  ctx.fill();
  ctx.strokeStyle="#f58ecb"; ctx.lineWidth=4; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x-r*0.6,y-r*0.4);
  ctx.lineTo(x-r*1.2,y-r*1.1);
  ctx.lineTo(x-r*0.2,y-r*0.8);
  ctx.closePath();
  ctx.fillStyle="#fbd3e9"; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x+r*0.6,y-r*0.4);
  ctx.lineTo(x+r*1.2,y-r*1.1);
  ctx.lineTo(x+r*0.2,y-r*0.8);
  ctx.closePath();
  ctx.fillStyle="#fbd3e9"; ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.arc(x-r*0.3, y+r*0.1, r*0.18, 0, Math.PI*2);
  ctx.arc(x+r*0.3, y+r*0.1, r*0.18, 0, Math.PI*2);
  ctx.fillStyle="#f58ecb"; ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y+r*0.3, r*0.1, 0, Math.PI*2);
  ctx.fillStyle="#ffb7eb"; ctx.fill();
  ctx.restore();
}
function drawDog(x,y,r,color,earColor){
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = "#ff90c4"; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x-r*0.8, y-r*0.3, r*0.3, r*0.7, Math.PI/8, 0, Math.PI*2);
  ctx.fillStyle = earColor; ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x+r*0.8, y-r*0.3, r*0.3, r*0.7, -Math.PI/8, 0, Math.PI*2);
  ctx.fillStyle = earColor; ctx.fill();
  ctx.beginPath();
  ctx.arc(x-r*0.24, y+r*0.13, r*0.14, 0, Math.PI*2);
  ctx.arc(x+r*0.24, y+r*0.13, r*0.14, 0, Math.PI*2);
  ctx.fillStyle = "#ff90c4"; ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y+r*0.35, r*0.11, 0, Math.PI*2);
  ctx.fillStyle = "#fb7e8f"; ctx.fill();
  ctx.restore();
}
function drawBullet(b){
  ctx.save();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
  ctx.fillStyle = b.color;
  ctx.shadowColor = "#fa99d6"; ctx.shadowBlur = 8;
  ctx.fill(); ctx.shadowBlur=0; ctx.restore();
}

window.onload = ()=>{
  show(menu); hide(gameUI); hide(levelupBox); hide(gameOverBox);
  resizeCanvas();
};
