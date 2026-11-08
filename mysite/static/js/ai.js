import { PITCH, dist, clamp } from './physics.js';

export class AIEngine {
  constructor() {
    this.reactionCounter = 0;
  }

  /**
   * 智慧守門員守備 FSM
   */
  updateGoalkeeper(gk, ball, isHomeTeam = false, audio = null, particles = null) {
    const goalCenterY = 300;
    const baseLineX = isHomeTeam ? 95 : 865;

    // 1. 計算球門中心與足球的動態防守黃金站位 (角平分線)
    let targetX = baseLineX;
    const inDangerBox = isHomeTeam
      ? (ball.x < 200 && ball.y > 160 && ball.y < 440)
      : (ball.x > 760 && ball.y > 160 && ball.y < 440);

    if (inDangerBox) {
      // 球進入危險區域時適度出擊封堵角度
      targetX = isHomeTeam
        ? clamp(ball.x - 18, 78, 145)
        : clamp(ball.x + 18, 815, 882);
    }

    // 依球的 y 軸位置動態橫移，但限制在門柱範圍內
    const clampedBallY = clamp(ball.y, 230, 370);
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
    // 讓門將始終面向球場中央與來球方向
    gk.angle = Math.atan2(ball.y - gk.y, ball.x - gk.x);

    // 2. 禁區撲救與大腳解圍判定 (門將絕不吸附持球，避免卡球)
    if (gk.possessionCooldown > 0) return;

    const distToBall = dist(gk.x, gk.y, ball.x, ball.y);
    const clearDir = isHomeTeam ? 1 : -1;

    // 情況 2A：對手帶球衝入小禁區貼近門將時，門將倒地撲救斷球
    if (ball.owner && ball.owner.team !== gk.team) {
      const distToOwner = dist(gk.x, gk.y, ball.owner.x, ball.owner.y);
      if (distToBall < 30 || distToOwner < 32) {
        const formerOwner = ball.owner;
        formerOwner.possessionCooldown = 25;
        formerOwner.isCharging = false;
        formerOwner.chargePower = 0;
        ball.owner = null;
        ball.lastTouchTeam = gk.team;
        gk.possessionCooldown = 22;

        ball.vx = clearDir * (10 + Math.random() * 4);
        ball.vy = (Math.random() - 0.5) * 8;
        if (audio) audio.playKick(0.9);
        if (particles) particles.spawnTurfKick(ball.x, ball.y, ball.vx, ball.vy, 10);
      }
      return;
    }

    // 情況 2B：自由球進入門將防守半徑，門將直接大腳解圍
    if (!ball.owner && distToBall < 34) {
      ball.owner = null;
      ball.lastTouchTeam = gk.team;
      gk.possessionCooldown = 20;

      ball.vx = clearDir * (11 + Math.random() * 4);
      ball.vy = (Math.random() - 0.5) * 8;
      if (audio) audio.playKick(1.0);
      if (particles) particles.spawnTurfKick(ball.x, ball.y, ball.vx, ball.vy, 10);
    }
  }

  /**
   * 電腦對手前鋒/中場 AI FSM
   */
  updateOutfieldAI(bot, ball, opponentPlayer, difficulty = 'MEDIUM', audio = null, particles = null, onShotCallback = null) {
    let speedMult = 0.95;
    let leadFrames = 10;
    let tackleChance = 0.035;
    let shootRange = 360;

    if (difficulty === 'EASY') {
      speedMult = 0.75;
      leadFrames = 0;
      tackleChance = 0.008;
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
      const targetGoalY = (bot.y > 300) ? 245 : 355; // 瞄準遠角

      const toGoalDx = targetGoalX - bot.x;
      const toGoalDy = targetGoalY - bot.y;

      // 檢查是否進入射門射程
      if (bot.x <= shootRange) {
        if (!bot.isCharging) {
          bot.startCharge();
        }
        // 蓄力期間仍微幅朝球門方向調整推進
        bot.move(toGoalDx, toGoalDy * 0.5, false, speedMult * 0.85);

        if (bot.chargePower >= 0.72 || difficulty === 'EASY') {
          // 蓄力完畢，果斷起腳射門！
          bot.angle = Math.atan2(toGoalDy, toGoalDx) + (Math.random() - 0.5) * (difficulty === 'EASY' ? 0.35 : 0.08);
          const res = bot.releaseShot(ball, audio, particles);
          if (res.shotTaken && onShotCallback) {
            onShotCallback(res);
          }
        }
      } else {
        // 向前場推進，若對手擋在正前方則微幅變向繞開
        let evadeDy = toGoalDy * 0.4;
        const distToOpp = dist(bot.x, bot.y, opponentPlayer.x, opponentPlayer.y);
        if (distToOpp < 85 && opponentPlayer.x < bot.x) {
          evadeDy += (bot.y >= opponentPlayer.y ? 90 : -90);
        }
        const sprint = difficulty === 'HARD';
        bot.move(toGoalDx, evadeDy, sprint, speedMult);
      }
      return;
    }

    // 情況 B：對手 (玩家) 正在持球 (逼搶與防守滑鏟)
    if (ball.owner === opponentPlayer) {
      const distToBall = dist(bot.x, bot.y, ball.x, ball.y);
      const distToPlayer = dist(bot.x, bot.y, opponentPlayer.x, opponentPlayer.y);
      // 瞄準對手帶球前方位置進行攔截
      const targetX = (opponentPlayer.x + ball.x) * 0.5;
      const targetY = (opponentPlayer.y + ball.y) * 0.5;
      const dx = targetX - bot.x;
      const dy = targetY - bot.y;

      // 貼身滑鏟搶斷
      if ((distToPlayer < 42 || distToBall < 36) && Math.random() < tackleChance && !bot.isTackling) {
        bot.angle = Math.atan2(ball.y - bot.y, ball.x - bot.x);
        bot.tackle(ball, audio, particles);
      } else {
        // 快速包夾
        const sprint = difficulty !== 'EASY';
        bot.move(dx, dy, sprint, speedMult);
      }
      return;
    }

    // 情況 C：自由球 (預判軌跡截擊)
    const predX = clamp(ball.x + ball.vx * leadFrames, PITCH.BOUNDS.LEFT + 20, PITCH.BOUNDS.RIGHT - 20);
    const predY = clamp(ball.y + ball.vy * leadFrames, PITCH.BOUNDS.TOP + 20, PITCH.BOUNDS.BOTTOM - 20);
    const toBallDx = predX - bot.x;
    const toBallDy = predY - bot.y;

    const sprint = difficulty === 'HARD' && dist(bot.x, bot.y, ball.x, ball.y) > 120;
    bot.move(toBallDx, toBallDy, sprint, speedMult);
  }
}
