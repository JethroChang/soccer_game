import { PITCH } from './physics.js';

export class PitchRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  drawPitch(shakeX = 0, shakeY = 0) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. 球場外圍跑道草皮底色
    ctx.fillStyle = '#0f291e';
    ctx.fillRect(0, 0, PITCH.WIDTH, PITCH.HEIGHT);

    // 2. 綠茵草皮條紋 (交替墨綠與草綠色)
    const stripeWidth = 60;
    for (let x = PITCH.BOUNDS.LEFT; x < PITCH.BOUNDS.RIGHT; x += stripeWidth) {
      const idx = Math.floor((x - PITCH.BOUNDS.LEFT) / stripeWidth);
      ctx.fillStyle = (idx % 2 === 0) ? '#16432d' : '#1a4e34';
      const w = Math.min(stripeWidth, PITCH.BOUNDS.RIGHT - x);
      ctx.fillRect(x, PITCH.BOUNDS.TOP, w, PITCH.BOUNDS.BOTTOM - PITCH.BOUNDS.TOP);
    }

    // 3. 繪製白色場地標線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.5;

    // 外邊框
    ctx.strokeRect(
      PITCH.BOUNDS.LEFT,
      PITCH.BOUNDS.TOP,
      PITCH.BOUNDS.RIGHT - PITCH.BOUNDS.LEFT,
      PITCH.BOUNDS.BOTTOM - PITCH.BOUNDS.TOP
    );

    // 中線
    ctx.beginPath();
    ctx.moveTo(480, PITCH.BOUNDS.TOP);
    ctx.lineTo(480, PITCH.BOUNDS.BOTTOM);
    ctx.stroke();

    // 中圈與開球點
    ctx.beginPath();
    ctx.arc(480, 300, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(480, 300, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 四個角球弧
    this.drawCornerArc(PITCH.BOUNDS.LEFT, PITCH.BOUNDS.TOP, 0, Math.PI / 2);
    this.drawCornerArc(PITCH.BOUNDS.RIGHT, PITCH.BOUNDS.TOP, Math.PI / 2, Math.PI);
    this.drawCornerArc(PITCH.BOUNDS.LEFT, PITCH.BOUNDS.BOTTOM, -Math.PI / 2, 0);
    this.drawCornerArc(PITCH.BOUNDS.RIGHT, PITCH.BOUNDS.BOTTOM, Math.PI, -Math.PI / 2);

    // 4. 左半場禁區與球門區
    ctx.strokeRect(60, 160, 130, 280); // 大禁區
    ctx.strokeRect(60, 220, 48, 160);  // 小禁區
    // 點球點與弧頂
    ctx.beginPath();
    ctx.arc(150, 300, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(150, 300, 55, -0.65, 0.65);
    ctx.stroke();

    // 5. 右半場禁區與球門區
    ctx.strokeRect(770, 160, 130, 280); // 大禁區
    ctx.strokeRect(852, 220, 48, 160);  // 小禁區
    // 點球點與弧頂
    ctx.beginPath();
    ctx.arc(810, 300, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(810, 300, 55, Math.PI - 0.65, Math.PI + 0.65);
    ctx.stroke();

    // 6. 球門與球網繪製
    this.drawGoal(true);  // 左球門
    this.drawGoal(false); // 右球門

    ctx.restore();
  }

  drawCornerArc(x, y, startAngle, endAngle) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, 16, startAngle, endAngle);
    ctx.stroke();
  }

  drawGoal(isLeft) {
    const ctx = this.ctx;
    const gx = isLeft ? PITCH.GOAL.LEFT_BACK_X : PITCH.GOAL.RIGHT_X;
    const gw = isLeft ? (PITCH.GOAL.LEFT_X - PITCH.GOAL.LEFT_BACK_X) : (PITCH.GOAL.RIGHT_BACK_X - PITCH.GOAL.RIGHT_X);
    const gy = PITCH.GOAL.TOP_Y;
    const gh = PITCH.GOAL.BOTTOM_Y - PITCH.GOAL.TOP_Y;

    // 球門底草皮暗色
    ctx.fillStyle = 'rgba(10, 30, 20, 0.6)';
    ctx.fillRect(gx, gy, gw, gh);

    // 網格菱形效果
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    const step = 8;
    for (let x = gx; x <= gx + gw; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, gy + gh);
      ctx.stroke();
    }
    for (let y = gy; y <= gy + gh; y += step) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx + gw, y);
      ctx.stroke();
    }

    // 球門框白線
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(gx, gy, gw, gh);

    // 門柱立體圓形
    const topPostX = isLeft ? PITCH.GOAL.LEFT_X : PITCH.GOAL.RIGHT_X;
    this.drawPost(topPostX, PITCH.GOAL.TOP_Y);
    this.drawPost(topPostX, PITCH.GOAL.BOTTOM_Y);
  }

  drawPost(x, y) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, PITCH.GOAL.POST_RADIUS, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, PITCH.GOAL.POST_RADIUS);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.7, '#cbd5e1');
    grad.addColorStop(1, '#64748b');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
