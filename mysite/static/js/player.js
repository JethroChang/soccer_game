import { PITCH, dist, clamp } from './physics.js';

export class Player {
  constructor(config) {
    this.x = config.x || 300;
    this.y = config.y || 300;
    this.startX = this.x;
    this.startY = this.y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 17;
    this.angle = config.angle || 0;
    this.team = config.team || 'HOME'; // 'HOME' (Blue) or 'AWAY' (Red)
    this.role = config.role || 'OUTFIELD'; // 'OUTFIELD' or 'GOALKEEPER'
    this.number = config.number || (this.role === 'GOALKEEPER' ? '1' : (this.team === 'HOME' ? '10' : '7'));
    this.name = config.name || (this.team === 'HOME' ? 'Player 1' : 'AI Bot');

    // 運動與體能屬性
    this.baseSpeed = this.role === 'GOALKEEPER' ? 3.4 : 3.8;
    this.sprintSpeed = 5.5;
    this.stamina = 100;
    this.maxStamina = 100;
    this.isSprinting = false;

    // 射門蓄力屬性
    this.isCharging = false;
    this.chargePower = 0; // 0.0 ~ 1.0

    // 滑鏟搶斷狀態
    this.isTackling = false;
    this.tackleTimer = 0;
    this.possessionCooldown = 0; // 被搶斷後的免控硬直倒數

    // 外觀顏色配置
    if (this.role === 'GOALKEEPER') {
      this.color = this.team === 'HOME' ? '#eab308' : '#f97316'; // 門將亮黃/亮橘
      this.borderColor = '#ffffff';
    } else {
      this.color = this.team === 'HOME' ? '#0284c7' : '#e11d48'; // 主隊青藍 / 客隊亮紅
      this.borderColor = this.team === 'HOME' ? '#38bdf8' : '#fb7185';
    }
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.vx = 0;
    this.vy = 0;
    this.angle = this.team === 'HOME' ? 0 : Math.PI;
    this.stamina = 100;
    this.isCharging = false;
    this.chargePower = 0;
    this.isTackling = false;
    this.tackleTimer = 0;
    this.possessionCooldown = 0;
  }

  update() {
    // 1. 硬直倒數
    if (this.possessionCooldown > 0) {
      this.possessionCooldown--;
    }

    // 2. 滑鏟處理
    if (this.isTackling) {
      this.tackleTimer--;
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.92;
      this.vy *= 0.92;
      if (this.tackleTimer <= 0) {
        this.isTackling = false;
      }
    } else {
      // 正常移動位移與摩擦衰減
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.82;
      this.vy *= 0.82;

      // 體力自動回充
      if (!this.isSprinting && this.stamina < this.maxStamina) {
        this.stamina = Math.min(this.maxStamina, this.stamina + 0.35);
      }
    }

    // 3. 射門蓄力自增
    if (this.isCharging) {
      this.chargePower = Math.min(1.0, this.chargePower + 0.035);
    }

    // 4. 球場邊界約束
    this.x = clamp(this.x, PITCH.BOUNDS.LEFT + this.radius, PITCH.BOUNDS.RIGHT - this.radius);
    this.y = clamp(this.y, PITCH.BOUNDS.TOP + this.radius, PITCH.BOUNDS.BOTTOM - this.radius);

    // 門將活動範圍限制在各自禁區防守半場
    if (this.role === 'GOALKEEPER') {
      if (this.team === 'HOME') {
        this.x = clamp(this.x, PITCH.BOUNDS.LEFT + this.radius, 220);
        this.y = clamp(this.y, 180, 420);
      } else {
        this.x = clamp(this.x, 740, PITCH.BOUNDS.RIGHT - this.radius);
        this.y = clamp(this.y, 180, 420);
      }
    }
  }

  move(dx, dy, sprint = false) {
    if (this.isTackling) return;

    if (dx !== 0 || dy !== 0) {
      this.angle = Math.atan2(dy, dx);
      let currentSpeed = this.baseSpeed;

      if (sprint && this.stamina > 5) {
        this.isSprinting = true;
        currentSpeed = this.sprintSpeed;
        this.stamina = Math.max(0, this.stamina - 0.7);
      } else {
        this.isSprinting = false;
      }

      const len = Math.hypot(dx, dy);
      this.vx = (dx / len) * currentSpeed;
      this.vy = (dy / len) * currentSpeed;
    } else {
      this.isSprinting = false;
    }
  }

  startCharge() {
    if (!this.isCharging && !this.isTackling) {
      this.isCharging = true;
      this.chargePower = 0.1;
    }
  }

  releaseShot(ball, audio, particles) {
    if (!this.isCharging) return;
    const power = this.chargePower;
    this.isCharging = false;
    this.chargePower = 0;

    // 只有在球在自己腳下時才能踢球
    if (ball.owner === this || dist(this.x, this.y, ball.x, ball.y) <= 30) {
      ball.owner = null;
      ball.lastTouchTeam = this.team;
      this.possessionCooldown = 15; // 踢球後短暫不吸附

      const shotSpeed = 8.5 + power * 10.5;
      ball.vx = Math.cos(this.angle) * shotSpeed;
      ball.vy = Math.sin(this.angle) * shotSpeed;

      if (audio) audio.playKick(power);
      if (particles) particles.spawnTurfKick(ball.x, ball.y, ball.vx, ball.vy, 10);
    }
  }

  tackle(audio, particles) {
    if (this.isTackling || this.stamina < 15) return;
    this.isTackling = true;
    this.tackleTimer = 16;
    this.stamina -= 15;

    const tackleSpeed = 7.2;
    this.vx = Math.cos(this.angle) * tackleSpeed;
    this.vy = Math.sin(this.angle) * tackleSpeed;

    if (audio) audio.playTackle();
    if (particles) particles.spawnTurfKick(this.x, this.y, this.vx, this.vy, 12);
  }

  draw(ctx) {
    ctx.save();

    // 1. 投影陰影
    ctx.beginPath();
    ctx.ellipse(this.x + 2, this.y + 3, this.radius + 1, this.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // 2. 滑鏟動態拖影
    if (this.isTackling) {
      ctx.beginPath();
      ctx.arc(this.x - this.vx * 1.5, this.y - this.vy * 1.5, this.radius * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
    }

    // 3. 球員身體 (帶漸層的立體圓圈)
    ctx.translate(this.x, this.y);
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.3, this.color);
    bodyGrad.addColorStop(1, '#0f172a');

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.borderColor;
    ctx.stroke();

    // 4. 朝向箭頭 / 指示標誌
    ctx.save();
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(this.radius + 4, 0);
    ctx.lineTo(this.radius - 2, -4);
    ctx.lineTo(this.radius - 2, 4);
    ctx.closePath();
    ctx.fillStyle = this.borderColor;
    ctx.fill();
    ctx.restore();

    // 5. 背號文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.number, 0, 0);

    // 6. 射門蓄力弧形光圈 (若正在蓄力)
    if (this.chargePower > 0.05) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, -Math.PI / 2, -Math.PI / 2 + this.chargePower * Math.PI * 2);
      ctx.strokeStyle = this.chargePower > 0.8 ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }
}
