// 猫猫狗狗幸存者 豪华地图+打击感修正版
// 包含摄像机 大地图 怪物生成正确+受击动画+攻速优化

const MAP_W = 4000, MAP_H = 4000;

const W = 900, H = 600;
const canvas = document.getElementById("gameCanvas");
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext("2d");

let camera = { x: 0, y: 0 };

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

// 鼠标控制
let mouse = { x: W/2, y: H/2, down: false };
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width) + camera.x;
  mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height) + camera.y;
});
canvas.addEventListener('mousedown', ()=>{mouse.down=true;});
canvas.addEventListener('mouseup', ()=>{mouse.down=false;});

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

// 玩家初始参数
const INITIAL_PLAYER = {
  x: MAP_W/2, y: MAP_H/2, r: 22,
  hp: 220, maxHp: 220, speed: 5.2,
  atk: 8,
  bulletSpeed: 10,
  atkDelay: 0.70,
  atkRange: 180,
  skills: [],
  exp: 0,
  expNext: 15,
  level: 1,
  invincibleTimer: 0,
  hitFlash: 0,
  hitAnim: 0,
  multiBullets: 1,
  healTick: false,
  score: 0,
};

const SKILL_LIST = [
  { id:'atkUp', name:'攻击力↑', desc:'攻击力+5', apply: p => p.atk+=5 },
  { id:'atkSpeed', name:'攻速↑', desc:'攻速提升（快10%）', apply: p=>p.atkDelay*=0.90 },
  { id:'moveUp', name:'速度↑', desc:'移动速度+30%', apply: p=>p.speed*=1.3 },
  { id:'hpUp', name:'血量↑', desc:'血量+60', apply: p=>{p.maxHp+=60; p.hp=p.maxHp;} },
  { id:'rangeUp', name:'射程↑', desc:'攻击射程+50', apply: p=>p.atkRange+=50 },
  { id:'multiBullets', name:'多重弹', desc:'每次射击多发一颗', apply: p=>p.multiBullets=(p.multiBullets||1)+1 },
  { id:'healTick', name:'自动回血', desc:'每5秒回血10', apply: p=>p.healTick=true },
];

function startGame() {
  gameState = {
    player: {...INITIAL_PLAYER},
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
    particles: [],
    killCombo: 0, comboTimer: 0
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
  if(dt>0.08) dt = 0.04;
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
    if(gs.player._healTimer>4){ gs.player.hp=Math.min(gs.player.maxHp, gs.player.hp+12); gs.player._healTimer=0;}
  }
  gs.time += dt;
  gs.comboTimer -= dt;
  if(gs.comboTimer<=0) gs.killCombo=0;

  // 玩家移动（地图边界检测）
  let move = getMoveDir();
  gs.player.x += move.dx * gs.player.speed;
  gs.player.y += move.dy * gs.player.speed;
  gs.player.x = Math.max(gs.player.r, Math.min(MAP_W-gs.player.r, gs.player.x));
  gs.player.y = Math.max(gs.player.r, Math.min(MAP_H-gs.player.r, gs.player.y));

  // 怪物生成，确保生成在玩家附近
  gs.monsterSpawnTimer -= dt;
  let baseSpeed = 1 + gs.time/160;
  let spawnSpeed = Math.max(1.1, 3.3 - gs.time/160);
  if(gs.monsterSpawnTimer<0) {
    gs.monsterSpawnTimer = spawnSpeed+Math.random()*0.85;
    spawnMonster(gs, baseSpeed);
  }

  // 怪物移动、锁定玩家
  for(let m of gs.monsters) {
    if(m.hitFlash>0){m.hitFlash-=dt;}
    let dx = gs.player.x - m.x, dy = gs.player.y - m.y;
    let dist = Math.sqrt(dx*dx+dy*dy)+0.01;
    let speed = m.speed;
    m.x += dx/dist * speed;
    m.y += dy/dist * speed;
  }

  // 攻击
  gs.lastAtk += dt;
  if(gs.lastAtk > gs.player.atkDelay) {
    gs.lastAtk = 0;
    shootBullet(gs, mouse.x, mouse.y);
  }

  // 子弹移动+命中
  for(let b of gs.bullets){
    b.x += b.vx;
    b.y += b.vy;
    b.lifetime--;
  }
  gs.bullets = gs.bullets.filter(b=>b.lifetime>0);

  // 子弹打怪
  for(let b of gs.bullets) for(let m of gs.monsters) {
    let dx = b.x-m.x, dy=b.y-m.y;
    let dis = Math.sqrt(dx*dx+dy*dy);
    if(dis < m.r + b.r && !m.dead){
      m.hp -= gs.player.atk;
      b.lifetime = 0;
      m.hitFlash = 0.15;
      m.vx = dx/dis*14; m.vy=dy/dis*14;
      spawnParticles(gs, m.x, m.y, m.r, "#fa99d6", 11);
      if(m.hp<=0){
        m.dead = true; m.deathAnim=0.20; gs.score+=1;
        gs.killCombo+=1; gs.comboTimer=0.8;
        spawnParticles(gs, m.x, m.y, m.r+8, "#ff90c4", 15);
        spawnExp(gs, m.x, m.y);
      }
    }
  }
  gs.monsters.forEach(m=>{
    if(m.vx || m.vy){
      m.x += m.vx*0.30; m.y += m.vy*0.30; m.vx*=0.70; m.vy*=0.70;
      if(Math.abs(m.vx)+Math.abs(m.vy)<1){m.vx=0;m.vy=0;}
    }
    if(m.deathAnim){ m.deathAnim-=dt; }
  });
  gs.monsters = gs.monsters.filter(m=>!m.deathAnim);

  // 怪物碰玩家（受击动画+体积优化）
  if(gs.player.invincibleTimer>0){gs.player.invincibleTimer-=dt;}
  for(let m of gs.monsters) {
    let dx = m.x - gs.player.x, dy = m.y - gs.player.y;
    let dis = Math.sqrt(dx*dx+dy*dy);
    if(dis < m.r + gs.player.r && gs.player.invincibleTimer<=0) {
      onPlayerHit(Math.max(8, m.atk), dx, dy);
      spawnParticles(gs, gs.player.x, gs.player.y, 14, "#fff0fb", 7);
    }
  }

  // 经验球拾取
  for(let e of gs.exps) {
    let dx = e.x - gs.player.x, dy = e.y - gs.player.y;
    let dis = Math.sqrt(dx*dx+dy*dy);
    if(dis < gs.player.r + e.r + 7) {
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

  gs.particles = gs.particles.filter(p=>{
    p.x += p.vx; p.y += p.vy;
    p.life -= dt;
    return p.life>0;
  });
}

// 怪物生成在玩家周围
function spawnMonster(gs, baseSpeed){
  const angle = Math.random() * Math.PI * 2;
  const radius = 320 + Math.random() * 100; // 距主角较近范围
  const mx = gs.player.x + Math.cos(angle) * radius;
  const my = gs.player.y + Math.sin(angle) * radius;
  const x = Math.max(25, Math.min(MAP_W-25, mx));
  const y = Math.max(25, Math.min(MAP_H-25, my));
  let waveLv = 1+Math.floor(gs.time/55);
  let monsterTypes = [
    {r:18, hp:18+waveLv*4, speed:baseSpeed+Math.random(), atk:9 },
    {r:34, hp:54+waveLv*13, speed:baseSpeed*0.73, atk:18 },
    {r:13, hp:7+waveLv*2, speed:baseSpeed*1.5+Math.random()*0.4, atk:4 }
  ];
  let mt = monsterTypes[Math.random()<0.62?0:(Math.random()<0.83?1:2)];
  let dog = {
    x: x, y: y,
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
// 玩家受击动画与击退
function onPlayerHit(damage, dx=0, dy=0) {
  let p = gameState.player;
  p.hp -= damage;
  p.invincibleTimer = 0.95;
  p.hitFlash = 0.18;
  p.hitAnim = 0.20;
  p.x -= dx/Math.sqrt(dx*dx+dy*dy||1)*30;
  p.y -= dy/Math.sqrt(dx*dx+dy*dy||1)*12;
  p.x = Math.max(p.r, Math.min(MAP_W-p.r, p.x));
  p.y = Math.max(p.r, Math.min(MAP_H-p.r, p.y));
}

function shootBullet(gs, tx, ty){
  let p=gs.player, bullets=[];
  let shotNum=p.multiBullets||1;
  for(let i=0;i<shotNum;i++){
    let angle = Math.atan2(ty-p.y,tx-p.x)+((i-(shotNum-1)/2)*0.18);
    let vx = Math.cos(angle)*p.bulletSpeed;
    let vy = Math.sin(angle)*p.bulletSpeed;
    bullets.push({
      x: p.x + Math.cos(angle)*p.r,
      y: p.y + Math.sin(angle)*p.r,
      vx: vx, vy: vy,
      r: 7,
      color: "#fb7eeb",
      lifetime: Math.round(p.atkRange/Math.abs(vx+vy)*2),
    });
  }
  gs.bullets.push(...bullets);
}
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
      gameState.player.expNext += 17+Math.floor(gameState.player.level*3.2);
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
function spawnParticles(gs, x, y, r, color, count){
  for(let i=0;i<count;i++){
    let angle = Math.random()*Math.PI*2;
    let speed = Math.random()*3+1.2;
    gs.particles.push({
      x:x, y:y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed,
      color,
      r:1.7+Math.random()*2.8,
      life:0.17+Math.random()*0.22,
    });
  }
}
function updateCamera() {
  camera.x = gameState.player.x - canvas.width / 2;
  camera.y = gameState.player.y - canvas.height / 2;
  camera.x = Math.max(0, Math.min(MAP_W - canvas.width, camera.x));
  camera.y = Math.max(0, Math.min(MAP_H - canvas.height, camera.y));
}

// 怪物/地图绘制修正确保怪物不会隐身
function drawGame(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  updateCamera();

  ctx.save();
  ctx.fillStyle = "#ffe5ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let gx = 0; gx < MAP_W; gx += 98) {
    for (let gy = 0; gy < MAP_H; gy += 98) {
      let sx = gx - camera.x, sy = gy - camera.y;
      if (sx < -40 || sy < -40 || sx > canvas.width+40 || sy > canvas.height+40) continue;
      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI*2);
      ctx.fillStyle="#fb7eeb";
      ctx.globalAlpha=0.09;
      ctx.fill(); ctx.globalAlpha=1.0;
    }
  }
  ctx.restore();

  for(let p of gameState.particles){
    ctx.beginPath();
    ctx.arc(p.x-camera.x, p.y-camera.y, p.r, 0, Math.PI*2);
    ctx.fillStyle=p.color;
    ctx.globalAlpha = Math.max(0.30,p.life/0.38);
    ctx.fill();
    ctx.globalAlpha=1.0;
  }
  for(let e of gameState.exps){
    ctx.beginPath();
    ctx.arc(e.x-camera.x, e.y-camera.y, e.r, 0, Math.PI*2);
    ctx.fillStyle=e.color;
    ctx.shadowColor="#fff";
    ctx.shadowBlur=7;
    ctx.fill(); ctx.shadowBlur=0;
  }
  // 怪物显示修正
  for(let m of gameState.monsters){
    ctx.save();
    let scale=1, alpha=1;
    if(m.hitFlash>0){
      scale=1.13; ctx.filter="brightness(1.7)"; alpha=0.66;
    }
    if(m.deathAnim>0) {
      scale=m.deathAnim;
      ctx.filter="brightness(2)";
      alpha=0.55;
    }
    ctx.globalAlpha=alpha;
    ctx.translate(m.x-camera.x, m.y-camera.y);
    ctx.scale(scale,scale);
    ctx.translate(-(m.x-camera.x),-(m.y-camera.y));
    drawDog(m.x - camera.x, m.y - camera.y, m.r, m.color, m.earColor);
    ctx.globalAlpha=1.0; ctx.filter="none"; ctx.restore();

    ctx.save()
    ctx.strokeStyle="#ff90c4"; ctx.lineWidth=5;
    ctx.beginPath();
    ctx.moveTo(m.x-camera.x-m.r/1.2,m.y-camera.y-m.r-6);
    ctx.lineTo(m.x-camera.x-m.r/1.2+m.r*2*m.hp/m.maxhp,m.y-camera.y-m.r-6);
    ctx.globalAlpha=0.7;
    ctx.stroke();
    ctx.globalAlpha=1.0;
    ctx.restore();
  }
  drawCat(gameState.player.x-camera.x,gameState.player.y-camera.y,gameState.player.r);
  for(let b of gameState.bullets){
    drawBullet(b.x-camera.x, b.y-camera.y, b.r, b.color);
  }
  ctx.restore();

  hudTime.innerText = `时间: ${Math.floor(gameState.time)}秒`;
  hudScore.innerText = `分数: ${gameState.score}`;
  hudHealth.innerHTML = `血量: <span style="color:#f31c86;font-weight:bold">${Math.floor(gameState.player.hp)}/${gameState.player.maxHp}</span>`;
  hudSkills.innerHTML = `技能: ${gameState.player.skills.map(id=>SKILL_LIST.find(s=>s.id===id).name).join(", ")}`;
  expVal.style.width = `${(gameState.player.exp/gameState.player.expNext)*120}px`;
}

function drawCat(x,y,r){
  ctx.save();
  let p = gameState.player;
  let scale = 1;
  if(p.hitAnim > 0) {
    scale = 1 + 0.27 * Math.sin(performance.now()/66) * p.hitAnim;
    p.hitAnim -= 0.04;
  }
  let alpha = 1;
  if(p.hitFlash > 0){
    alpha = 0.4 + 0.6*Math.abs(Math.sin(performance.now()/55));
    ctx.filter = "brightness(2.02) contrast(1.4)";
    p.hitFlash -= 0.045;
  }
  ctx.globalAlpha = alpha;
  ctx.translate(x,y);
  ctx.scale(scale, scale);
  ctx.translate(-x,-y);

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

  ctx.globalAlpha=1.0;
  ctx.filter="none";
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
function drawBullet(x, y, r, color){
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.shadowColor = "#fa99d6"; ctx.shadowBlur = 6;
  ctx.fill(); ctx.shadowBlur=0; ctx.restore();
}
window.onload = ()=>{
  show(menu); hide(gameUI); hide(levelupBox); hide(gameOverBox);
  resizeCanvas();
};
