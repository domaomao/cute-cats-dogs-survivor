// 游戏参数
const W = 960, H = 700;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
const stats = document.getElementById('stats');
const ui = document.getElementById('ui');
const gameoverDiv = document.getElementById('gameover');

let player, bullets, monsters, particles, keys, tick, gameOver, score;

// 初始化所有变量
function startGame() {
  player = {
    x: W/2, y: H/2, r: 29, speed: 5,
    hp: 100, cooldown: 0, angle: 0,
    skin: Math.random() < 0.5 ? 'cat' : 'cat2', // 更可爱cat皮肤
  };
  bullets = [];
  monsters = [];
  particles = [];
  keys = {};
  tick = 0;
  score = 0;
  gameOver = false;
  gameoverDiv.style.display = 'none';
  canvas.style.filter = '';
}

// 键盘控制
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// 玩家移动
function movePlayer() {
  let dx = 0, dy = 0;
  if (keys['w']||keys['arrowup']) dy -= 1;
  if (keys['s']||keys['arrowdown']) dy += 1;
  if (keys['a']||keys['arrowleft']) dx -= 1;
  if (keys['d']||keys['arrowright']) dx += 1;
  if (dx || dy) {
    const len = Math.sqrt(dx * dx + dy * dy);
    player.x += player.speed * dx / (len||1);
    player.y += player.speed * dy / (len||1);
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y));
  }
}

// 自动攻击机制（每隔一段时间发射可爱爪爪弹幕）
function autoFire() {
  if (player.cooldown <= 0) {
    // 随机围绕猫猫一圈方向发射（有一定随机性）
    const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2].map(a => a + Math.random()*0.4 - 0.2);
    for (let a of angles) {
      bullets.push({
        x: player.x + Math.cos(a)*player.r,
        y: player.y + Math.sin(a)*player.r,
        r: 10,
        angle: a,
        speed: 8,
        life: 44,
      });
    }
    player.cooldown = 23 + Math.random()*9;
  } else player.cooldown -= 1;
}

// 生成怪物（狗狗）
function spawnMonster() {
  if (tick % 22 === 0) {
    let angle = Math.random() * Math.PI * 2;
    let dist = W/2 + 80*Math.random();
    let mx = Math.cos(angle) * dist + W/2;
    let my = Math.sin(angle) * dist + H/2;
    // 随机狗狗皮肤
    let skin = Math.random() < 0.34 ? 'dog2' : (Math.random()<0.6?'dog':'dog3');
    monsters.push({
      x: mx, y: my, r: 24+Math.random()*6,
      speed: 1.3+Math.random()*2.2,
      skin, angle: 0,
      hp: 2+(Math.random()<0.9?1:2),
    });
  }
}

// 怪物移动
function moveMonsters() {
  for (let m of monsters) {
    let dx = player.x - m.x, dy = player.y - m.y;
    let dist = Math.sqrt(dx*dx+dy*dy);
    m.angle = Math.atan2(dy, dx);
    m.x += Math.cos(m.angle) * m.speed;
    m.y += Math.sin(m.angle) * m.speed;
    // 撞到边界回弹
    if (m.x < m.r) m.x = m.r;
    if (m.x > W-m.r) m.x = W-m.r;
    if (m.y < m.r) m.y = m.r;
    if (m.y > H-m.r) m.y = H-m.r;
    // 猫猫被撞
    if (!gameOver && dist < m.r+player.r-5) {
      player.hp -= 0.7;
      for (let i=0;i<6;i++) {
        particles.push(spawnParticle(player.x, player.y, "#ffb7eb"));
      }
      if (player.hp <= 0) {
        endGame();
      }
    }
  }
}

// 子弹和怪物碰撞
function handleBullets() {
  for (let bidx = bullets.length - 1; bidx >= 0; --bidx) {
    const b = bullets[bidx];
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
    b.life -= 1;
    // 子弹超界/寿命
    if (b.x < 0 || b.x > W || b.y < 0 || b.y > H || b.life < 0) {
      bullets.splice(bidx, 1);
      continue;
    }
    // 判断是否击中怪物
    for (let midx = monsters.length - 1; midx >= 0; --midx) {
      let m = monsters[midx];
      let dx = b.x - m.x, dy = b.y - m.y;
      if (Math.sqrt(dx*dx+dy*dy) < b.r + m.r) {
        m.hp -= 1;
        score += 1;
        for (let i=0;i<8;i++) {
          particles.push(spawnParticle(m.x, m.y, "#f3a683"));
        }
        bullets.splice(bidx, 1);
        if (m.hp <= 0) {
          monsters.splice(midx, 1);
        }
        break;
      }
    }
  }
}

// 可爱粒子爆炸效果（被击中时出现）
function spawnParticle(x, y, color) {
  return {
    x, y,
    r: 6+Math.random()*3,
    angle: Math.random()*Math.PI*2,
    speed: 2+Math.random()*2,
    life: 18+Math.random()*18,
    color,
  };
}
function moveParticles() {
  for (let i=particles.length-1;i>=0;i--) {
    let pt = particles[i];
    pt.x += Math.cos(pt.angle)*pt.speed;
    pt.y += Math.sin(pt.angle)*pt.speed;
    pt.life -= 1;
    if (pt.life<=0) particles.splice(i,1);
  }
}

// 游戏主循环
function loop() {
  if (gameOver) return;
  tick++;
  movePlayer();
  autoFire();
  spawnMonster();
  moveMonsters();
  handleBullets();
  moveParticles();
  draw();
  requestAnimationFrame(loop);
}

// 绘制所有内容
function draw() {
  ctx.clearRect(0,0,W,H);

  // 粉色泡泡背景点缀
  let bgCount = 18;
  for(let i=0;i<bgCount;i++){
    let r=34+Math.random()*14;
    let x=Math.sin((tick/37)+i/3.2)*W/2.3+W/2+Math.cos(i)*200;
    let y=Math.cos((tick/41)+i/2.7)*H/2.5+H/2+Math.sin(i)*140;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle='#ffb7eb22';
    ctx.fill();
  }

  // 玩家猫猫
  if (player.skin === 'cat') drawCat(player.x,player.y,player.r);
  else drawCat2(player.x,player.y,player.r);

  // 子弹（爪爪弹幕）
  for(let b of bullets) drawPaw(b.x, b.y, b.r);

  // 怪物狗狗们
  for (let m of monsters) {
    if (m.skin=='dog') drawDog(m.x,m.y,m.r);
    if (m.skin=='dog2') drawDog2(m.x,m.y,m.r);
    if (m.skin=='dog3') drawDog3(m.x,m.y,m.r);
  }

  // 粒子爆炸
  for(let p of particles) drawParticle(p);

  // UI刷新
  stats.innerHTML =
    `<span style="padding:3px 14px 3px 8px;">🐱生命 <b>${Math.max(0,player.hp).toFixed(0)}</b></span>
     <span style="padding:3px 14px;">🎀得分 <b>${score}</b></span>
     <span style="font-size:0.9em;padding:3px 6px;">技能: 自动爪爪攻击</span>`;
}

// 可爱猫猫绘制（一号皮肤）
function drawCat(x,y,r){
  ctx.save();
  ctx.translate(x,y);
  // 主体
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fillStyle="#fff0fb";
  ctx.fill();
  ctx.strokeStyle="#fa6ea9";
  ctx.lineWidth=4;
  ctx.stroke();
  // 左耳
  ctx.beginPath();
  ctx.moveTo(-r*0.7,-r*0.5);
  ctx.lineTo(-r*1.1,-r*1.1);
  ctx.lineTo(-r*0.3,-r*0.8);
  ctx.closePath();
  ctx.fillStyle="#ffb7eb";
  ctx.fill();
  ctx.stroke();
  // 右耳
  ctx.beginPath();
  ctx.moveTo(r*0.7,-r*0.5);
  ctx.lineTo(r*1.1,-r*1.1);
  ctx.lineTo(r*0.3,-r*0.8);
  ctx.closePath();
  ctx.fillStyle="#ffb7eb";
  ctx.fill();
  ctx.stroke();
  // 眼睛
  ctx.beginPath();
  ctx.arc(-r*0.28,r*0.11,r*0.16,0,Math.PI*2);
  ctx.arc(r*0.28,r*0.11,r*0.16,0,Math.PI*2);
  ctx.fillStyle="#fa6ea9";
  ctx.fill();
  // 鼻子
  ctx.beginPath();
  ctx.arc(0,r*0.3,r*0.09,0,Math.PI*2);
  ctx.fillStyle="#fa8bb9";
  ctx.fill();
  ctx.restore();
}

// 可爱猫猫绘制（二号皮肤）
function drawCat2(x,y,r){
  ctx.save();
  ctx.translate(x,y);
  // 主体
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fillStyle="#fffdf0";
  ctx.fill();
  ctx.strokeStyle="#c477d8";
  ctx.lineWidth=3.5; ctx.stroke();
  // 斑纹
  ctx.beginPath();
  ctx.arc(-r*0.12,-r*0.18,r*0.22,Math.PI*0.5,Math.PI*1.18);
  ctx.strokeStyle="#f2aeff"; ctx.lineWidth=2.5; ctx.stroke();
  // 耳朵
  ctx.beginPath();
  ctx.moveTo(-r*0.5,-r*0.46);
  ctx.lineTo(-r*0.95,-r*1.02);
  ctx.lineTo(-r*0.14,-r*0.65);
  ctx.closePath();
  ctx.fillStyle="#f2aeff"; ctx.fill(); ctx.strokeStyle="#c477d8"; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r*0.5,-r*0.46);
  ctx.lineTo(r*0.95,-r*1.02);
  ctx.lineTo(r*0.14,-r*0.65);
  ctx.closePath();
  ctx.fillStyle="#f2aeff"; ctx.fill(); ctx.strokeStyle="#c477d8"; ctx.stroke();
  // 眼睛
  ctx.beginPath();
  ctx.arc(-r*0.27, r*0.05, r*0.13, 0, Math.PI*2);
  ctx.arc(r*0.27, r*0.05, r*0.13, 0, Math.PI*2);
  ctx.fillStyle="#c477d8"; ctx.fill();
  // 鼻子
  ctx.beginPath();
  ctx.arc(0,r*0.28,r*0.09,0,Math.PI*2);
  ctx.fillStyle="#ffd6ec"; ctx.fill();
  ctx.restore();
}

// 可爱狗狗绘制（三种皮肤）
function drawDog(x,y,r){
  ctx.save();
  ctx.translate(x,y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.fillStyle="#ffeaa7"; ctx.fill(); ctx.strokeStyle="#fa8bb9"; ctx.lineWidth=3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-r*0.8,-r*0.3,r*0.32,r*0.8,Math.PI/8,0,Math.PI*2);
  ctx.fillStyle="#ffd6b6"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(r*0.8,-r*0.3,r*0.32,r*0.8, -Math.PI/7,0,Math.PI*2);
  ctx.fillStyle="#ffd6b6"; ctx.fill();
  ctx.beginPath();
  ctx.arc(-r*0.22, r*0.13, r*0.12, 0, Math.PI*2);
  ctx.arc(r*0.22, r*0.13, r*0.12, 0, Math.PI*2);
  ctx.fillStyle="#fa8bb9"; ctx.fill();
  ctx.beginPath(); ctx.arc(0, r*0.29, r*0.09, 0, Math.PI*2);
  ctx.fillStyle="#fb7e8f"; ctx.fill();
  ctx.restore();
}
function drawDog2(x,y,r){
  ctx.save(); ctx.translate(x,y);
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fillStyle="#baffea"; ctx.fill(); ctx.strokeStyle="#4ec8b5"; ctx.lineWidth=3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-r*0.7, -r*0.44, r*0.32, r*0.44, 0,0,Math.PI*2);
  ctx.fillStyle="#ffe5ef"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(r*0.7, -r*0.44, r*0.32, r*0.44, 0,0,Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.arc(-r*0.22, r*0.15, r*0.12, 0, Math.PI*2);
  ctx.arc(r*0.22, r*0.15, r*0.12, 0, Math.PI*2);
  ctx.fillStyle="#02636e"; ctx.fill();
  ctx.beginPath(); ctx.arc(0, r*0.28, r*0.08,0,Math.PI*2); ctx.fillStyle="#4ec8b5"; ctx.fill();
  ctx.restore();
}
function drawDog3(x,y,r){
  ctx.save(); ctx.translate(x,y);
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fillStyle="#fff"; ctx.fill();
  ctx.strokeStyle="#c477d8"; ctx.lineWidth=3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-r*0.55, -r*0.24, r*0.25, r*0.52, -Math.PI/12, 0, Math.PI*2);
  ctx.fillStyle="#fad6ff"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(r*0.65, -r*0.24, r*0.25, r*0.52, Math.PI/12, 0, Math.PI*2);
  ctx.fillStyle="#ffcffa"; ctx.fill();
  ctx.beginPath();
  ctx.arc(-r*0.18, r*0.15, r*0.1, 0, Math.PI*2);
  ctx.arc(r*0.18, r*0.15, r*0.1, 0, Math.PI*2);
  ctx.fillStyle="#c477d8"; ctx.fill();
  ctx.beginPath(); ctx.arc(0, r*0.25, r*0.07,0,Math.PI*2); ctx.fillStyle="#c477d8"; ctx.fill();
  ctx.restore();
}

// 爪爪弹幕（子弹）
function drawPaw(x, y, r){
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.fillStyle = "#fa8bb9";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-r*0.6, -r*0.6, r*0.42, 0, Math.PI*2);
  ctx.arc(r*0.6, -r*0.6, r*0.42, 0, Math.PI*2);
  ctx.arc(r*0.5, r*0.3, r*0.28, 0, Math.PI*2);
  ctx.arc(-r*0.5, r*0.3, r*0.28, 0, Math.PI*2);
  ctx.fillStyle = "#ffd6ec";
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// 粒子效果
function drawParticle(p){
  ctx.save();
  ctx.globalAlpha = Math.max(0.1,p.life/30);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.restore();
}

// 游戏结束
function endGame() {
  gameOver = true;
  setTimeout(()=>{
    gameoverDiv.style.display = 'block';
    canvas.style.filter = 'grayscale(0.8) blur(4px)';
  }, 700);
}

// 再来一局
window.restartGame = function(){
  startGame();
  loop();
}

// 启动
startGame();
loop();
