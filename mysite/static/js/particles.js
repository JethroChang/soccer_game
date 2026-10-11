/**
 * 粒子系統 - 包含進球彩色彩帶 (Confetti) 與球場草屑/速度尾跡
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // 1. 產生慶祝彩帶爆發 (Confetti)
  spawnGoalConfetti(count = 90) {
    const colors = ['#f59e0b', '#38bdf8', '#10b981', '#f43f5e', '#a855f7', '#fbbf24', '#ffffff'];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'confetti',
        x: 480 + (Math.random() - 0.5) * 400,
        y: 120 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: -3 - Math.random() * 6,
        size: 5 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0,
        decay: 0.007 + Math.random() * 0.005,
      });
    }
  }

  // 2. 產生草皮鏟球/踢球碎屑 (Grass dust)
  spawnTurfKick(x, y, vx, vy, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'grass',
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: vx * 0.3 + (Math.random() - 0.5) * 3,
        vy: vy * 0.3 + (Math.random() - 0.5) * 3,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#22c55e' : '#15803d',
        life: 1.0,
        decay: 0.03 + Math.random() * 0.02,
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay;

      if (p.type === 'confetti') {
        p.vy += 0.18; // 重力
        p.vx *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
      } else if (p.type === 'grass') {
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.x += p.vx;
        p.y += p.vy;
      }

      if (p.life <= 0 || p.y > 620) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);

      if (p.type === 'confetti') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.type === 'grass') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}
