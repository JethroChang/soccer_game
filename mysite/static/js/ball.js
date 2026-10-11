import { PITCH, dist } from './physics.js';

export class Ball {
  constructor(x = 480, y = 300) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 10;
    this.rotation = 0;
    this.owner = null;
    this.lastTouchTeam = null; // 'HOME' or 'AWAY'
    this.trail = [];
  }

  reset(x = 480, y = 300) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.owner = null;
    this.trail = [];
  }

  update(audio) {
    // 1. 若處於持球狀態，位置由持球球員驅動
    if (this.owner) {
      const offsetDist = 20;
      const targetX = this.owner.x + Math.cos(this.owner.angle) * offsetDist;
      const targetY = this.owner.y + Math.sin(this.owner.angle) * offsetDist;
      
      this.vx = (targetX - this.x) * 0.45;
      this.vy = (targetY - this.y) * 0.45;
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += Math.hypot(this.vx, this.vy) * 0.08;
      return;
    }

    // 2. 自由運動物理運算
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= PITCH.BALL_FRICTION;
    this.vy *= PITCH.BALL_FRICTION;

    // 極小速度歸零
    if (Math.hypot(this.vx, this.vy) < 0.05) {
      this.vx = 0;
      this.vy = 0;
    }

    this.rotation += Math.hypot(this.vx, this.vy) * 0.08;

    // 速度尾跡紀錄
    const speed = Math.hypot(this.vx, this.vy);
    if (speed > 4) {
      this.trail.push({ x: this.x, y: this.y, alpha: 0.6 });
      if (this.trail.length > 7) this.trail.shift();
    } else {
      if (this.trail.length > 0) this.trail.shift();
    }

    // 3. 門柱圓角碰撞 (4 個門柱)
    for (const post of PITCH.POSTS) {
      const d = dist(this.x, this.y, post.x, post.y);
      const minDist = this.radius + PITCH.GOAL.POST_RADIUS;
      if (d < minDist && d > 0.001) {
        const nx = (this.x - post.x) / d;
        const ny = (this.y - post.y) / d;
        // 分離
        this.x = post.x + nx * minDist;
        this.y = post.y + ny * minDist;

        // 反射
        const dot = this.vx * nx + this.vy * ny;
        this.vx = (this.vx - 2 * dot * nx) * PITCH.POST_RESTITUTION;
        this.vy = (this.vy - 2 * dot * ny) * PITCH.POST_RESTITUTION;

        if (audio) audio.playPost();
      }
    }

    // 4. 球網與邊界檢測
    const inGoalY = (this.y >= PITCH.GOAL.TOP_Y && this.y <= PITCH.GOAL.BOTTOM_Y);

    if (this.x < PITCH.BOUNDS.LEFT) {
      if (inGoalY) {
        // 進入左球門網內
        this.vx *= PITCH.NET_DAMPING;
        this.vy *= PITCH.NET_DAMPING;
        if (this.x < PITCH.GOAL.LEFT_BACK_X + this.radius) {
          this.x = PITCH.GOAL.LEFT_BACK_X + this.radius;
          this.vx = -this.vx * 0.25;
        }
      } else {
        // 左底線邊界反彈
        this.x = PITCH.BOUNDS.LEFT + this.radius;
        this.vx = -this.vx * PITCH.BALL_RESTITUTION;
      }
    } else if (this.x > PITCH.BOUNDS.RIGHT) {
      if (inGoalY) {
        // 進入右球門網內
        this.vx *= PITCH.NET_DAMPING;
        this.vy *= PITCH.NET_DAMPING;
        if (this.x > PITCH.GOAL.RIGHT_BACK_X - this.radius) {
          this.x = PITCH.GOAL.RIGHT_BACK_X - this.radius;
          this.vx = -this.vx * 0.25;
        }
      } else {
        // 右底線邊界反彈
        this.x = PITCH.BOUNDS.RIGHT - this.radius;
        this.vx = -this.vx * PITCH.BALL_RESTITUTION;
      }
    }

    // 上下邊線反彈
    if (this.y - this.radius < PITCH.BOUNDS.TOP) {
      this.y = PITCH.BOUNDS.TOP + this.radius;
      this.vy = -this.vy * PITCH.BALL_RESTITUTION;
    } else if (this.y + this.radius > PITCH.BOUNDS.BOTTOM) {
      this.y = PITCH.BOUNDS.BOTTOM - this.radius;
      this.vy = -this.vy * PITCH.BALL_RESTITUTION;
    }
  }

  draw(ctx) {
    // 1. 繪製動態速度尾跡
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      ctx.save();
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (0.4 + (i / this.trail.length) * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + (i / this.trail.length) * 0.25})`;
      ctx.fill();
      ctx.restore();
    }

    // 2. 地面投影陰影
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x + 3, this.y + 4, this.radius + 1, this.radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    ctx.restore();

    // 3. 足球本體球皮 (3D立體球體渲染)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.65, '#f1f5f9');
    grad.addColorStop(1, '#94a3b8');

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#475569';
    ctx.stroke();

    // 經典足球五角形花紋
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5;
      const px = Math.cos(a) * 3.8;
      const py = Math.sin(a) * 3.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 周邊五個小斑點
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 + 0.3;
      const px = Math.cos(a) * 7.5;
      const py = Math.sin(a) * 7.5;
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
