import { PITCH, dist, clamp } from './physics.js';

export class AIEngine {
  constructor() {
    this.reactionCounter = 0;
  }

  /**
   * 智慧守門員守備 FSM
   */
  updateGoalkeeper(gk, ball, isHomeTeam = false, audio = null, particles = null) {
    const goalX = isHomeTeam ? PITCH.GOAL.LEFT_X : PITCH.GOAL.RIGHT_X;
    const goalCenterY = 300;

    // 1. 計算球門中心與足球的動態防守黃金站位 (角平分線)
    const targetX = isHomeTeam ? 95 : 865;
    // 依球的 y 軸位置動態橫移，但限制在門柱範圍內
    const clampedBallY = clamp(ball.y, 235, 365);
    const targetY = goalCenterY + (clampedBallY - goalCenterY) * 0.85;

    const dx = targetX - gk.x;
    const dy = targetY - gk.y;
    const d = Math.hypot(dx, dy);

    if (d > 3) {
      gk.move(dx, dy, false);
    } else {
      gk.vx = 0;
      gk.vy = 0;
    }

    // 2. 禁區解圍判定 (當自由球滾入危險禁區)
    const distToBall = dist(gk.x, gk.y, ball.x, ball.y);
    if (!ball.owner && distToBall < 36) {
      // 門將大腳解圍！
      ball.owner = null;
      ball.lastTouchTeam = gk.team;
      const clearDir = isHomeTeam ? 1 : -1;
      ball.vx = clearDir * (11 + Math.random() * 4);
      ball.vy = (Math.random() - 0.5) * 8;
      if (audio) audio.playKick(1.0);
      if (particles) particles.spawnTurfKick(ball.x, ball.y, ball.vx, ball.vy, 10);
    }
  }

  /**
   * 電腦對手前鋒/中場 AI FSM
   */
  updateOutfieldAI(bot, ball, opponentPlayer, difficulty = 'MEDIUM', audio = null, particles = null) {
    let speedMult = 0.95;
    let leadFrames = 10;
    let tackleChance = 0.03;
    let shootRange = 360;

    if (difficulty === 'EASY') {
      speedMult = 0.72;
      leadFrames = 0;
      tackleChance = 0.005;
      shootRange = 300;
    } else if (difficulty === 'HARD') {
      speedMult = 1.05;
      leadFrames = 16;
      tackleChance = 0.08;
      shootRange = 420;
    }

    // 情況 A：電腦對手正在持球 (進攻帶球與瞄準射門)
    if (ball.owner === bot) {
      const targetGoalX = PITCH.GOAL.LEFT_X + 10;
      const targetGoalY = (bot.y > 300) ? 240 : 360; // 瞄準遠角

      const toGoalDx = targetGoalX - bot.x;
      const toGoalDy = targetGoalY - bot.y;

      // 檢查是否進入射門射程
      if (bot.x <= shootRange) {
        if (!bot.isCharging) {
          bot.startCharge();
        } else if (bot.chargePower >= 0.75 || difficulty === 'EASY') {
          // 蓄力完畢，果斷起腳射門！
          bot.angle = Math.atan2(toGoalDy, toGoalDx) + (Math.random() - 0.5) * (difficulty === 'EASY' ? 0.35 : 0.08);
          bot.releaseShot(ball, audio, particles);
        }
      } else {
        // 向前鋒推進
        const sprint = difficulty === 'HARD';
        bot.move(toGoalDx, toGoalDy * 0.4, sprint);
      }
      return;
    }

    // 情況 B：對手 (玩家) 正在持球 (逼搶與防守滑鏟)
    if (ball.owner === opponentPlayer) {
      const distToPlayer = dist(bot.x, bot.y, opponentPlayer.x, opponentPlayer.y);
      const dx = opponentPlayer.x - bot.x;
      const dy = opponentPlayer.y - bot.y;

      // 貼身滑鏟搶斷
      if (distToPlayer < 38 && Math.random() < tackleChance && !bot.isTackling) {
        bot.angle = Math.atan2(dy, dx);
        bot.tackle(audio, particles);
        // 滑鏟若命中持球玩家，使其掉球
        if (distToPlayer < 32) {
          ball.owner = null;
          opponentPlayer.possessionCooldown = 25;
          ball.vx = bot.vx * 1.3;
          ball.vy = bot.vy * 1.3;
        }
      } else {
        // 快速包夾
        const sprint = difficulty !== 'EASY';
        bot.move(dx, dy, sprint);
      }
      return;
    }

    // 情況 C：自由球 (預判軌跡截擊)
    const predX = ball.x + ball.vx * leadFrames;
    const predY = ball.y + ball.vy * leadFrames;
    const toBallDx = predX - bot.x;
    const toBallDy = predY - bot.y;

    const sprint = difficulty === 'HARD' && dist(bot.x, bot.y, ball.x, ball.y) > 120;
    bot.move(toBallDx, toBallDy, sprint);

    // 接球檢測
    if (dist(bot.x, bot.y, ball.x, ball.y) < 26 && bot.possessionCooldown <= 0) {
      ball.owner = bot;
      ball.lastTouchTeam = bot.team;
    }
  }
}
