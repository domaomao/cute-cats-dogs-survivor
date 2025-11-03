// =========== UI & 画布设置 ==========
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

// ------- 页面逻辑 -------
startBtn.onclick = () => {
  hide(menu);
  show(gameUI);
  startGame();
};
aboutBtn.onclick = () => { show(aboutText); hide(startBtn); hide(authorBtn); };
authorBtn.onclick = () => { show(authorText); hide(startBtn); hide(aboutBtn); };
backBtn1.onclick = backBtn2.onclick = () => {
  hide(aboutText); hide(authorText); show(startBtn); show(aboutBtn); show(authorBtn);
};
restartBtn.onclick = () => { hide(gameOverBox); show(gameUI); startGame(); }
backToMenuBtn.onclick = () => { hide(gameOverBox); show(menu); };

// =========== 游戏核心逻辑 ==========
let gameState; // {player, monsters, bullets, exps, skills, ...}
let loopId = null;
let paused = false;
let lastFrameT = 0;

pauseBtn.onclick = () => {
  paused = !paused;
  pauseBtn.innerText = paused ? '继续' : '暂停';
};

// 玩家操作
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  // ESC直接暂停
  if (e.key === "Escape") paused = !paused;
});
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// 移动端虚拟摇杆可加，但默认WASD/方向键
function getMoveDir() {
  let dx = 0, dy = 0;
  if (keys['w']||keys['arrowup']) dy -= 1;
  if (keys['s']||keys['arrowdown']) dy += 1;
  if (keys['a']||keys['arrowleft']) dx -= 1;
  if (keys['d']||keys['arrowright']) dx += 1;
  // 归一，兼容斜方向
  if (dx !==0 || dy!==0) {
    let len = Math.sqrt(dx*dx+dy*dy);
    return {dx: dx/len, dy: dy/len};
  } return {dx:0,dy:0};
}

// 游戏参数设定
const INITIAL_PLAYER = {
  x: W/2, y: H/2, r: 26,
  hp: 120, maxHp: 120, speed: 4,
  atk: 1, // 攻击力
  atkDelay: 0.5, // 攻击间隔秒
  atkRange: 140, // 攻击射程
  skills: [],
  exp: 0,
  expNext: 10,
  level: 1,
  score: 0,
  invincible: 0, // 短暂无敌
};

const SKILL_LIST = [
  { id:'atkUp', name:'攻击力↑', desc:'提升攻击力+1', apply: p => p.atk+=1 },
  { id:'atkSpeed', name:'攻速↑', desc:'降低攻击间隔，提升攻速', apply: p=>p.atkDelay*=0.85 },
  { id:'moveUp', name:'速度↑', desc:'提升移动速度+30%', apply: p=>p.speed*=1.3 },
  { id:'hpUp', name:'血量↑', desc:'血量上限+30，立即回血30', apply: p=>{p.maxHp+=30; p.hp=Math.min(p.maxHp,p.hp+30);} },
  { id:'rangeUp', name:'射程↑', desc:'攻击射程+40', apply: p=>p.atkRange+=40 },
  { id:'resist', name:'防御提升', desc:'每次受伤减少50%伤害', apply: p=>p.invincible=0.5 }, // 半时间无敌
  // 可扩展更多技能
];

function startGame() {
  // 初始化游戏状态
  gameState = {
    player: {...INITIAL_PLAYER},
    monsters: [],
    bullets: [],
    exps: [],
    skills: [],
    time: 0, // 秒
    wave: 1,
    lastAtk: 0,
    monsterSpawnTimer: 0,
    levelupReady: false,
    levelupChoices: [],
    score: 0,
    gameOver: false,
    paused: false
  };
  hide(levelupBox); hide(gameOverBox);
  resizeCanvas();
  paused = false;
  pauseBtn.innerText = "暂停";
  lastFrameT = performance.now();
  // 启动主循环
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
  if(dt>0.09) dt = 0.05; // 避免卡顿
  lastFrameT = ts;

  if (paused || gameState.paused) {
    loopId = requestAnimationFrame(gameLoop);
    return;
  }
  if (!gameState.gameOver && !gameState.levelupReady)
    updateGame(dt);
  drawGame();

  loopId = requestAnimationFrame(gameLoop);
}

// ====== 游戏更新主流程 ======
function updateGame(dt) {
  let gs = gameState;
  gs.time += dt;

  // 玩家移动
  let move = getMoveDir();
  gs.player.x += move.dx * gs.player.speed;
  gs.player.y += move.dy * gs.player.speed;
  // 边界约束
  gs.player.x = Math.max(gs.player.r, Math.min(canvas.width-gs.player.r, gs.player.x));
  gs.player.y = Math.max(gs.player.r, Math.min(canvas.height-gs.player.r, gs.player.y));

  // 怪物生成
  gs.monsterSpawnTimer -= dt;
  let spawnSpeed = Math.max(0.7, 2.8 - gs.time/80); // 随时间加快
  if(gs.monsterSpawnTimer<0) {
    gs.monsterSpawnTimer = spawnSpeed+Math.random()*0.5;
    spawnMonster(gs);
  }

  // 怪物移动 + 追踪玩家
  for(let m of gs.monsters) {
    let dx = gs.player.x - m.x, dy = gs.player.y - m.y;
    let dist = Math.sqrt(dx*dx+dy*dy);
    let speed = m.speed;
    m.x += dx/dist * speed;
    m.y += dy/dist * speed;
  }

  // 自动攻击
  gs.lastAtk += dt;
  if(gs.lastAtk > gs.player.atkDelay) {
    gs.lastAtk = 0;
    shootBullet(gs);
  }

  // 子弹移动&碰撞
  for (let b of gs.bullets) {
    b.x += b.vx;
    b.y += b.vy;
    b.lifetime--;
  }
  gs.bullets = gs.bullets.filter(b=>b.lifetime>0);

  // 子弹打怪
  for(let b of gs.bullets) {
    for(let m of gs.monsters) {
      let dx = b.x-m.x, dy=b.y-m.y;
      let dis = Math.sqrt(dx*dx+dy*dy);
      if(dis < m.r + b.r){
        m.hp -= gs.player.atk;
        b.lifetime = 0;
        if(m.hp<=0){
          gs.score += 1;
          spawnExp(gs, m.x, m.y); // 死亡掉经验
          m.dead = true;
        }
      }
    }
  }
  gs.monsters = gs.monsters.filter(m=>!m.dead);

  // 怪物碰玩家
  for(let m of gs.monsters) {
    let dx = m.x - gs.player.x, dy = m.y - gs.player.y;
    let dis = Math.sqrt(dx*dx+dy*dy);
    if(dis < m.r + gs.player.r) {
      if(gs.player.invincible>0) gs.player.hp -= 1*gs.player.invincible;
      else gs.player.hp -= 2;
      m.x -= dx/dis * 12; m.y -= dy/dis * 12; // 反弹
    }
  }

  // 经验球被玩家拾取
  for(let e of gs.exps) {
    let dx = e.x - gs.player.x, dy = e.y - gs.player.y;
    let dis = Math.sqrt(dx*dx+dy*dy);
    if(dis < gs.player.r + e.r + 5) {
      gs.player.exp += e.val;
      e.gone = true;
      // 升级判定
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
    gameOver(gs.score, Math.floor(gs.time));
    return;
  }
  // 升级弹窗
  if(gs.levelupReady){
    showLevelupBox();
  }
}

// ============ 怪物与元素生成 ============
function spawnMonster(gs) {
  let angle = Math.random()*6.28;
  let mx = Math.cos(angle)*canvas.width*0.48 + canvas.width/2;
  let my = Math.sin(angle)*canvas.height*0.48 + canvas.height/2;
  // 怪随时间强度递增
  let dog = {
    x: mx, y: my,
    r: 24,
    hp: Math.max(10, gs.time/15+10+Math.random()*5),
    speed: Math.min(2.6, 1.2 + gs.time/90 + Math.random()*0.7),
    color: "#ffeaa7",
    earColor: "#f3a683",
  };
  gs.monsters.push(dog);
}
function spawnExp(gs, x, y){
  gs.exps.push({
    x, y,
    r: 8,
    val: 6 + Math.floor(Math.random()*3),
    color: "#fa99d6",
  });
}

// ============ 自动攻击（子弹环绕发射/升级可扩展） ============
function shootBullet(gs){
  let p = gs.player;
  let bullets = [];
  // 环形发射，等级高弹道多
  let shotNum = 1 + Math.floor((p.level-1)/2);
  for(let i=0;i<shotNum;i++){
    let angle = Math.random()*Math.PI*2;
    let vx = Math.cos(angle)*p.atkRange/20;
    let vy = Math.sin(angle)*p.atkRange/20;
    bullets.push({
      x: p.x + Math.cos(angle)*p.r,
      y: p.y + Math.sin(angle)*p.r,
      vx: vx, vy: vy,
      r: 9,
      color: "#fb7eeb",
      lifetime: Math.round(p.atkRange/Math.abs(vx+vy))
    });
  }
  gs.bullets.push(...bullets);
}

// ============ 升级与成长 ============
function getLevelupChoices(taken){
  // 随机三项（未获得的技能优先），可改成更多技能池
  let pool = SKILL_LIST.filter(s=>!taken.includes(s.id));
  let picked = [];
  for(let i=0;i<3;i++){
    let idx = Math.floor(Math.random()*pool.length);
    if(pool[idx]) picked.push(pool[idx]);
    pool.splice(idx, 1);
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
      // 升级经验曲线递增
      gameState.player.exp = 0;
      gameState.player.expNext += 12 + Math.floor(gameState.player.level*2.5);
      hide(levelupBox);
      resumeGame();
      gameState.levelupReady = false;
      gameState.levelupChoices = [];
    };
    levelupChoices.appendChild(btn);
  });
  show(levelupBox);
}
function pauseGame(){ gameState.paused=true; }
function resumeGame(){ gameState.paused=false; }

// ======= 游戏结束流程 =======
function gameOver(score, time){
  show(gameOverBox);
  hide(gameUI); pauseGame();
  finalScore.innerHTML = `得分：${score}<br>生存时间：${time} 秒`;
}

// =========== 绘制所有内容 =============
function drawGame(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // 背景
  ctx.save();
  ctx.fillStyle = "#ffe5ef";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // 绘制经验球
  for(let e of gameState.exps){
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
    ctx.fillStyle = e.color;
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 11;
    ctx.fill(); ctx.shadowBlur = 0;
  }

  // 绘制狗狗怪物
  for(let m of gameState.monsters){
    drawDog(m.x, m.y, m.r, m.color, m.earColor);
  }
  // 绘制玩家猫猫
  let p = gameState.player;
  drawCat(p.x, p.y, p.r);

  // 绘制子弹（猫爪弹or鱼刺）
  for(let b of gameState.bullets){
    drawBullet(b);
  }
  ctx.restore();

  // HUD显示
  hudTime.innerText = `时间: ${Math.floor(gameState.time)}秒`;
  hudScore.innerText = `分数: ${gameState.score}`;
  hudHealth.innerHTML = `血量: <span style="color:#f31c86;font-weight:bold">${Math.floor(p.hp)}/${p.maxHp}</span>`;
  hudSkills.innerHTML = `技能: ${p.skills.map(id=>SKILL_LIST.find(s=>s.id===id).name).join(", ")}`;
  // 经验条
  expVal.style.width = `${(p.exp/p.expNext)*120}px`; // 120px为满
}

// =========== 可爱猫猫狗狗绘制 ===========
function drawCat(x, y, r){
  ctx.save();
  // 主体
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = "#fff0fb";
  ctx.fill();
  ctx.strokeStyle = "#f58ecb";
  ctx.lineWidth = 4;
  ctx.stroke();
  // 左耳
  ctx.beginPath();
  ctx.moveTo(x-r*0.6, y-r*0.4);
  ctx.lineTo(x-r*1.2, y-r*1.1);
  ctx.lineTo(x-r*0.2, y-r*0.8);
  ctx.closePath();
  ctx.fillStyle = "#fbd3e9";
  ctx.fill();
  ctx.stroke();
  // 右耳
  ctx.beginPath();
  ctx.moveTo(x+r*0.6, y-r*0.4);
  ctx.lineTo(x+r*1.2, y-r*1.1);
  ctx.lineTo(x+r*0.2, y-r*0.8);
  ctx.closePath();
  ctx.fillStyle = "#fbd3e9";
  ctx.fill();
  ctx.stroke();
  // 眼睛
  ctx.beginPath();
  ctx.arc(x-r*0.3, y+r*0.1, r*0.18, 0, Math.PI*2);
  ctx.arc(x+r*0.3, y+r*0.1, r*0.18, 0, Math.PI*2);
  ctx.fillStyle = "#f58ecb";
  ctx.fill();
  // 鼻子
  ctx.beginPath();
  ctx.arc(x, y+r*0.3, r*0.1, 0, Math.PI*2);
  ctx.fillStyle = "#ffb7eb";
  ctx.fill();
  ctx.restore();
}

function drawDog(x, y, r, color, earColor){
  ctx.save();
  // 主体
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#ff90c4";
  ctx.lineWidth = 3;
  ctx.stroke();
  // 左耳
  ctx.beginPath();
  ctx.ellipse(x-r*0.8, y-r*0.3, r*0.3, r*0.7, Math.PI/8, 0, Math.PI*2);
  ctx.fillStyle = earColor;
  ctx.fill();
  // 右耳
  ctx.beginPath();
  ctx.ellipse(x+r*0.8, y-r*0.3, r*0.3, r*0.7, -Math.PI/8, 0, Math.PI*2);
  ctx.fillStyle = earColor;
  ctx.fill();
  // 眼睛
  ctx.beginPath();
  ctx.arc(x-r*0.24, y+r*0.13, r*0.14, 0, Math.PI*2);
  ctx.arc(x+r*0.24, y+r*0.13, r*0.14, 0, Math.PI*2);
  ctx.fillStyle = "#ff90c4";
  ctx.fill();
  // 鼻头
  ctx.beginPath();
  ctx.arc(x, y+r*0.35, r*0.11, 0, Math.PI*2);
  ctx.fillStyle = "#fb7e8f";
  ctx.fill();
  ctx.restore();
}

// 子弹样式
function drawBullet(b){
  ctx.save();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
  ctx.fillStyle = b.color;
  ctx.shadowColor = "#fa99d6";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore();
}

// 启动菜单界面（初始显示）
window.onload = () => {
  show(menu); hide(gameUI); hide(levelupBox); hide(gameOverBox);
  resizeCanvas();
};
