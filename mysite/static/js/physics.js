/**
 * Physics Constants & Helper Functions for Soccer Pitch
 */

export const PITCH = {
  WIDTH: 960,
  HEIGHT: 600,
  BOUNDS: {
    LEFT: 60,
    RIGHT: 900,
    TOP: 45,
    BOTTOM: 555,
  },
  GOAL: {
    TOP_Y: 220,
    BOTTOM_Y: 380,
    LEFT_X: 60,
    LEFT_BACK_X: 22,
    RIGHT_X: 900,
    RIGHT_BACK_X: 938,
    POST_RADIUS: 7,
  },
  POSTS: [
    { x: 60, y: 220, name: 'left-top' },
    { x: 60, y: 380, name: 'left-bottom' },
    { x: 900, y: 220, name: 'right-top' },
    { x: 900, y: 380, name: 'right-bottom' },
  ],
  BALL_FRICTION: 0.985,
  BALL_RESTITUTION: 0.82,
  POST_RESTITUTION: 0.88,
  NET_DAMPING: 0.45,
};

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function normalize(x, y) {
  const len = Math.hypot(x, y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/**
 * 處理兩個圓形之間的彈性碰撞
 */
export function resolveCircleCollision(c1, c2, r1, r2, restitution = 0.8) {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const distance = Math.hypot(dx, dy);
  const minDist = r1 + r2;

  if (distance < minDist && distance > 0.0001) {
    const nx = dx / distance;
    const ny = dy / distance;

    // 分離重疊
    const overlap = minDist - distance;
    c1.x -= nx * overlap * 0.5;
    c1.y -= ny * overlap * 0.5;
    c2.x += nx * overlap * 0.5;
    c2.y += ny * overlap * 0.5;

    // 計算相對速度
    const kx = c1.vx - c2.vx;
    const ky = c1.vy - c2.vy;
    const p = 2 * (nx * kx + ny * ky) / (1 + 1); // 假設質量相等

    c1.vx -= p * nx * restitution;
    c1.vy -= p * ny * restitution;
    c2.vx += p * nx * restitution;
    c2.vy += p * ny * restitution;
    return true;
  }
  return false;
}
