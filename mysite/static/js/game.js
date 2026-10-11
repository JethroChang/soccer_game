import { PITCH, dist, resolveCircleCollision } from './physics.js';
import { AudioEngine } from './audio.js';
import { ParticleSystem } from './particles.js';
import { PitchRenderer } from './renderer.js';
import { Ball } from './ball.js';
import { Player } from './player.js';
import { AIEngine } from './ai.js';

class SoccerGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new PitchRenderer(this.canvas);
    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();
    this.ai = new AIEngine();

    // 遊戲狀態與規則
    this.state = 'PLAYING'; // 'PLAYING', 'GOAL_SLOWMO', 'PAUSED', 'MATCH_OVER'
    this.matchTime = 90; // 90 秒
    this.lastTime = performance.now();
    this.timerAcc = 0;

    // 比分與統計
    this.homeScore = 0;
    this.awayScore = 0;
    this.homeShots = 0;
    this.awayShots = 0;
    this.homeShotsOnTarget = 0;
    this.awayShotsOnTarget = 0;
    this.homePossessionFrames = 0;
    this.awayPossessionFrames = 0;

    // 模式與難度
    this.gameMode = '1P'; // '1P' 或 '2P'
    this.difficulty = 'MEDIUM'; // 'EASY', 'MEDIUM', 'HARD'

    // 打擊感特效參數
    this.shakeIntensity = 0;
    this.slowMoTimer = 0;

    // 實體初始化
    this.ball = new Ball(480, 300);
    this.initPlayers();

    // 輸入鍵位追蹤
    this.keys = {};

    this.bindDOM();
    this.bindEvents();

    // 啟動主迴圈
    requestAnimationFrame((t) => this.loop(t));
  }

  initPlayers() {
    // 主隊陣容 (青藍色)
    this.p1 = new Player({
      x: 340, y: 300,
      team: 'HOME',
      role: 'OUTFIELD',
      number: '10',
      name: 'Player 1',
    });

    this.homeGK = new Player({
      x: 95, y: 300,
      team: 'HOME',
      role: 'GOALKEEPER',
      number: '1',
      name: 'Home GK',
    });

    // 客隊陣容 (紅色)
    this.p2 = new Player({
      x: 620, y: 300,
      team: 'AWAY',
      role: 'OUTFIELD',
      number: '7',
      name: this.gameMode === '1P' ? 'AI Bot' : 'Player 2',
    });

    this.awayGK = new Player({
      x: 865, y: 300,
      team: 'AWAY',
      role: 'GOALKEEPER',
      number: '1',
      name: 'Away GK',
    });

    this.allPlayers = [this.p1, this.homeGK, this.p2, this.awayGK];
  }

  resetKickoff(scoringTeam = null) {
    this.ball.reset(480, 300);
    this.p1.reset();
    this.homeGK.reset();
    this.p2.reset();
    this.awayGK.reset();

    // 開球方設定
    if (scoringTeam === 'HOME') {
      this.p2.x = 500;
      this.ball.x = 485;
    } else {
      this.p1.x = 460;
      this.ball.x = 475;
    }

    this.audio.playWhistle();
  }

  bindDOM() {
    this.domHomeScore = document.getElementById('homeScore');
    this.domAwayScore = document.getElementById('awayScore');
    this.domTimer = document.getElementById('matchTimer');
    this.domStaminaFill = document.getElementById('staminaFill');
    this.domPowerFill = document.getElementById('powerFill');

    this.domGoalBanner = document.getElementById('goalBanner');
    this.domGoalBannerSub = document.getElementById('goalBannerSub');
    this.domPauseOverlay = document.getElementById('pauseOverlay');
    this.domMatchOverOverlay = document.getElementById('matchOverOverlay');

    this.domMatchOverTitle = document.getElementById('matchOverTitle');
    this.domMatchOverScore = document.getElementById('matchOverScore');
    this.domStatHomeShots = document.getElementById('statHomeShots');
    this.domStatAwayShots = document.getElementById('statAwayShots');
    this.domStatHomePoss = document.getElementById('statHomePossession');
    this.domStatAwayPoss = document.getElementById('statAwayPossession');
    this.domStatStreak = document.getElementById('statStreak');

    this.btnRestart = document.getElementById('btnRestart');
    this.btnPause = document.getElementById('btnPause');
    this.btnResume = document.getElementById('btnResume');
    this.btnRestartFromPause = document.getElementById('btnRestartFromPause');
    this.btnPlayAgain = document.getElementById('btnPlayAgain');
    this.btnSound = document.getElementById('btnSoundToggle');
    this.selectMode = document.getElementById('selectMode');
    this.selectDiff = document.getElementById('selectDifficulty');
    this.p2HelpText = document.getElementById('p2HelpText');
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.audio.init();
      this.keys[e.code] = true;

      // 暫停快捷鍵
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }

      // 蓄力射門鍵按下開始蓄力
      if (e.code === 'Space' || e.code === 'KeyK') {
        if (!e.repeat) this.p1.startCharge();
      }
      if (this.gameMode === '2P' && (e.code === 'Enter' || e.code === 'Numpad2')) {
        if (!e.repeat) this.p2.startCharge();
      }

      // 滑鏟鍵
      if (e.code === 'KeyJ') {
        if (!e.repeat) this.p1.tackle(this.audio, this.particles);
      }
      if (this.gameMode === '2P' && (e.code === 'KeyO' || e.code === 'Numpad1')) {
        if (!e.repeat) this.p2.tackle(this.audio, this.particles);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;

      // 放開射門鍵起腳射門！
      if (e.code === 'Space' || e.code === 'KeyK') {
        if (this.p1.isCharging) {
          this.homeShots++;
          this.p1.releaseShot(this.ball, this.audio, this.particles);
        }
      }
      if (this.gameMode === '2P' && (e.code === 'Enter' || e.code === 'Numpad2')) {
        if (this.p2.isCharging) {
          this.awayShots++;
          this.p2.releaseShot(this.ball, this.audio, this.particles);
        }
      }
    });

    // 介面按鈕事件
    this.btnRestart.addEventListener('click', () => this.restartGame());
    this.btnPause.addEventListener('click', () => this.togglePause());
    this.btnResume.addEventListener('click', () => this.togglePause(false));
    this.btnRestartFromPause.addEventListener('click', () => {
      this.togglePause(false);
      this.restartGame();
    });
    this.btnPlayAgain.addEventListener('click', () => this.restartGame());

    this.btnSound.addEventListener('click', () => {
      const on = this.audio.toggleSound();
      this.btnSound.textContent = on ? '🔊 音效: 開啟' : '🔇 音效: 靜音';
    });

    this.selectMode.addEventListener('change', (e) => {
      this.gameMode = e.target.value;
      this.p2HelpText.style.display = (this.gameMode === '2P') ? 'block' : 'none';
      document.getElementById('awayTeamType').textContent = (this.gameMode === '2P') ? '玩家 2 (PVP)' : `電腦 AI (${this.difficulty})`;
      this.p2.name = (this.gameMode === '2P') ? 'Player 2' : 'AI Bot';
      this.restartGame();
    });

    this.selectDiff.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      if (this.gameMode === '1P') {
        document.getElementById('awayTeamType').textContent = `電腦 AI (${this.difficulty})`;
      }
    });
  }

  togglePause(forceState = null) {
    if (this.state === 'MATCH_OVER') return;
    const shouldPause = (forceState !== null) ? forceState : (this.state !== 'PAUSED');
    if (shouldPause) {
      this.state = 'PAUSED';
      this.domPauseOverlay.classList.add('active');
    } else {
      this.state = 'PLAYING';
      this.domPauseOverlay.classList.remove('active');
      this.lastTime = performance.now();
    }
  }

  restartGame() {
    this.state = 'PLAYING';
    this.matchTime = 90;
    this.timerAcc = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.homeShots = 0;
    this.awayShots = 0;
    this.homePossessionFrames = 0;
    this.awayPossessionFrames = 0;
    this.shakeIntensity = 0;
    this.slowMoTimer = 0;

    this.domHomeScore.textContent = '0';
    this.domAwayScore.textContent = '0';
    this.domTimer.textContent = '90s';

    this.domGoalBanner.classList.remove('show');
    this.domPauseOverlay.classList.remove('active');
    this.domMatchOverOverlay.classList.remove('active');
    this.particles.clear();

    this.resetKickoff();
    this.lastTime = performance.now();
  }

  handleInputs() {
    // 1. P1 玩家移動控制 (WASD 或 方向鍵)
    let p1dx = 0;
    let p1dy = 0;
    if (this.keys['KeyW'] || (this.gameMode === '1P' && this.keys['ArrowUp'])) p1dy -= 1;
    if (this.keys['KeyS'] || (this.gameMode === '1P' && this.keys['ArrowDown'])) p1dy += 1;
    if (this.keys['KeyA'] || (this.gameMode === '1P' && this.keys['ArrowLeft'])) p1dx -= 1;
    if (this.keys['KeyD'] || (this.gameMode === '1P' && this.keys['ArrowRight'])) p1dx += 1;
    const p1Sprint = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    this.p1.move(p1dx, p1dy, p1Sprint);

    // 2. P2 玩家移動控制 (若為雙人 PVP 模式)
    if (this.gameMode === '2P') {
      let p2dx = 0;
      let p2dy = 0;
      if (this.keys['ArrowUp'] || this.keys['KeyI']) p2dy -= 1;
      if (this.keys['ArrowDown'] || this.keys['KeyK']) p2dy += 1;
      if (this.keys['ArrowLeft'] || this.keys['KeyJ']) p2dx -= 1;
      if (this.keys['ArrowRight'] || this.keys['KeyL']) p2dx += 1;
      const p2Sprint = this.keys['KeyU'] || this.keys['Numpad0'];
      this.p2.move(p2dx, p2dy, p2Sprint);
    }
  }

  updatePhysics(timeScale = 1.0) {
    // 實體更新
    this.p1.update();
    this.homeGK.update();
    this.p2.update();
    this.awayGK.update();
    this.ball.update(this.audio);

    // AI 決策更新
    this.ai.updateGoalkeeper(this.homeGK, this.ball, true, this.audio, this.particles);
    this.ai.updateGoalkeeper(this.awayGK, this.ball, false, this.audio, this.particles);

    if (this.gameMode === '1P') {
      this.ai.updateOutfieldAI(this.p2, this.ball, this.p1, this.difficulty, this.audio, this.particles);
    }

    // 球員之間互相碰撞擠壓
    for (let i = 0; i < this.allPlayers.length; i++) {
      for (let j = i + 1; j < this.allPlayers.length; j++) {
        resolveCircleCollision(
          this.allPlayers[i],
          this.allPlayers[j],
          this.allPlayers[i].radius,
          this.allPlayers[j].radius,
          0.5
        );
      }
    }

    // 帶球吸附與搶斷檢測
    if (!this.ball.owner) {
      for (const p of this.allPlayers) {
        if (p.possessionCooldown <= 0 && dist(p.x, p.y, this.ball.x, this.ball.y) < 25) {
          this.ball.owner = p;
          this.ball.lastTouchTeam = p.team;
          break;
        }
      }
    } else {
      // 若持球者被對手貼身滑鏟
      const owner = this.ball.owner;
      for (const p of this.allPlayers) {
        if (p !== owner && p.team !== owner.team && p.isTackling) {
          if (dist(p.x, p.y, owner.x, owner.y) < 32) {
            this.ball.owner = null;
            owner.possessionCooldown = 25;
            this.ball.vx = p.vx * 1.25;
            this.ball.vy = p.vy * 1.25;
            break;
          }
        }
      }
    }

    // 控球時間累計
    if (this.ball.owner) {
      if (this.ball.owner.team === 'HOME') this.homePossessionFrames++;
      else this.awayPossessionFrames++;
    }

    // 粒子更新
    this.particles.update();

    // 畫面震動衰減
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.9;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }
  }

  checkGoal() {
    if (this.state !== 'PLAYING') return;

    // 檢查足球是否完整越過球門線
    const inGoalY = (this.ball.y >= PITCH.GOAL.TOP_Y && this.ball.y <= PITCH.GOAL.BOTTOM_Y);

    if (inGoalY) {
      if (this.ball.x < PITCH.GOAL.LEFT_X - 2) {
        // 客隊進球！ (穿過左球門)
        this.triggerGoal('AWAY');
      } else if (this.ball.x > PITCH.GOAL.RIGHT_X + 2) {
        // 主隊進球！ (穿過右球門)
        this.triggerGoal('HOME');
      }
    }
  }

  triggerGoal(team) {
    this.state = 'GOAL_SLOWMO';
    this.slowMoTimer = 90; // 慢動作持續約 1.5 秒
    this.shakeIntensity = 18; // 強烈螢幕震動

    if (team === 'HOME') {
      this.homeScore++;
      this.domHomeScore.textContent = this.homeScore;
      this.domGoalBannerSub.textContent = (this.gameMode === '1P') ? '🔥 漂亮！玩家射門破網！' : '🔥 主隊 (P1) 取得進球！';
    } else {
      this.awayScore++;
      this.domAwayScore.textContent = this.awayScore;
      this.domGoalBannerSub.textContent = (this.gameMode === '1P') ? '⚡ 哎呀！電腦對手破門！' : '⚡ 客隊 (P2) 取得進球！';
    }

    this.domGoalBanner.classList.add('show');
    this.particles.spawnGoalConfetti(100);
    this.audio.playGoalCheer();
    this.audio.playWhistle();
  }

  finishMatch() {
    this.state = 'MATCH_OVER';
    this.audio.playWhistle();

    // 計算控球率
    const totalPoss = this.homePossessionFrames + this.awayPossessionFrames || 1;
    const homePossRate = Math.round((this.homePossessionFrames / totalPoss) * 100);
    const awayPossRate = 100 - homePossRate;

    // 判斷勝負結果
    let result = 'DRAW';
    let resultTitle = '🤝 雙方握手言和 平局！';
    let titleClass = 'draw';

    if (this.homeScore > this.awayScore) {
      result = 'WIN';
      resultTitle = '🏆 恭喜獲勝！VICTORY！';
      titleClass = 'win';
    } else if (this.homeScore < this.awayScore) {
      result = 'LOSS';
      resultTitle = '💔 全場落敗！DEFEAT！';
      titleClass = 'loss';
    }

    this.domMatchOverTitle.textContent = resultTitle;
    this.domMatchOverTitle.className = `match-over-title ${titleClass}`;
    this.domMatchOverScore.textContent = `${this.homeScore} - ${this.awayScore}`;
    this.domStatHomeShots.textContent = this.homeShots;
    this.domStatAwayShots.textContent = this.awayShots;
    this.domStatHomePoss.textContent = `${homePossRate}%`;
    this.domStatAwayPoss.textContent = `${awayPossRate}%`;

    this.domMatchOverOverlay.classList.add('active');

    // 透過 AJAX 儲存賽事戰績
    this.saveMatchData({
      player_score: this.homeScore,
      opponent_score: this.awayScore,
      result: result,
      difficulty: this.difficulty,
      game_mode: this.gameMode,
      shots_taken: this.homeShots,
      shots_on_target: Math.max(this.homeScore, Math.floor(this.homeShots * 0.7)),
      possession_rate: homePossRate,
      duration_seconds: 90,
      player_name: 'Player 1',
    });
  }

  saveMatchData(payload) {
    fetch('/ajax/save_match/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          this.domStatStreak.textContent = `當前連勝: ${data.current_streak} 場 | 歷史最高: ${data.highest_streak} 場`;
        }
      })
      .catch((err) => {
        console.error('儲存賽事戰績失敗:', err);
      });
  }

  loop(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 賽事倒數計時器
    if (this.state === 'PLAYING') {
      this.timerAcc += dt;
      if (this.timerAcc >= 1.0) {
        this.timerAcc -= 1.0;
        this.matchTime--;
        this.domTimer.textContent = `${this.matchTime}s`;
        if (this.matchTime <= 0) {
          this.finishMatch();
        }
      }
    }

    // 狀態處理
    if (this.state === 'PLAYING') {
      this.handleInputs();
      this.updatePhysics(1.0);
      this.checkGoal();
    } else if (this.state === 'GOAL_SLOWMO') {
      // 0.3x 慢動作播放慶祝
      this.updatePhysics(0.3);
      this.slowMoTimer--;
      if (this.slowMoTimer <= 0) {
        this.domGoalBanner.classList.remove('show');
        this.state = 'PLAYING';
        this.resetKickoff(this.homeScore > this.awayScore ? 'HOME' : 'AWAY');
      }
    }

    // 更新底部 HUD 指示條
    this.domStaminaFill.style.width = `${this.p1.stamina}%`;
    this.domPowerFill.style.width = `${this.p1.chargePower * 100}%`;

    // 渲染畫布 (計算螢幕震動位移)
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity;

    this.renderer.drawPitch(shakeX, shakeY);

    const ctx = this.renderer.ctx;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 繪製所有球員與足球
    for (const p of this.allPlayers) {
      p.draw(ctx);
    }
    this.ball.draw(ctx);
    this.particles.draw(ctx);

    ctx.restore();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// 頁面載入後自動啟動
window.addEventListener('DOMContentLoaded', () => {
  new SoccerGame();
});
