import { PITCH, dist, resolveCircleCollision } from './physics.js';
import { AudioEngine } from './audio.js';
import { ParticleSystem } from './particles.js';
import { PitchRenderer } from './renderer.js';
import { Ball } from './ball.js';
import { Player } from './player.js';
import { AIEngine } from './ai.js';

// P1 與 P2 獨立按鍵映射（徹底杜絕雙人同機按鍵衝突）
const P1_SHOOT_KEYS = new Set(['Space', 'KeyK', 'KeyF']);
const P1_TACKLE_KEYS = new Set(['KeyJ', 'KeyG']);
const P2_SHOOT_KEYS = new Set(['Enter', 'NumpadEnter', 'Numpad2', 'Period']);
const P2_TACKLE_KEYS = new Set(['Numpad1', 'Numpad3', 'Comma', 'Backslash']);
const PREVENT_DEFAULT_KEYS = new Set([
  'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Enter', 'NumpadEnter', 'Slash',
]);

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
    this.lastScoringTeam = null;

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
      x: 360, y: 300,
      angle: 0,
      team: 'HOME',
      role: 'OUTFIELD',
      number: '10',
      name: 'Player 1',
    });

    this.homeGK = new Player({
      x: 95, y: 300,
      angle: 0,
      team: 'HOME',
      role: 'GOALKEEPER',
      number: '1',
      name: 'Home GK',
    });

    // 客隊陣容 (紅色)
    this.p2 = new Player({
      x: 600, y: 300,
      angle: Math.PI,
      team: 'AWAY',
      role: 'OUTFIELD',
      number: '7',
      name: this.gameMode === '1P' ? 'AI Bot' : 'Player 2',
    });

    this.awayGK = new Player({
      x: 865, y: 300,
      angle: Math.PI,
      team: 'AWAY',
      role: 'GOALKEEPER',
      number: '1',
      name: 'Away GK',
    });

    this.outfieldPlayers = [this.p1, this.p2];
    this.allPlayers = [this.p1, this.homeGK, this.p2, this.awayGK];
  }

  resetKickoff(scoringTeam = null) {
    this.ball.reset(480, 300);
    this.p1.reset();
    this.homeGK.reset();
    this.p2.reset();
    this.awayGK.reset();

    // 依失球方開球原則設定對稱合理的開球站位（開球初始雙手公平爭球或失球方優先觸球）
    if (scoringTeam === 'HOME') {
      // 主隊進球 -> 客隊 (P2) 中圈開球
      this.p1.x = 360;
      this.p2.x = 515;
    } else if (scoringTeam === 'AWAY') {
      // 客隊進球 -> 主隊 (P1) 中圈開球
      this.p1.x = 445;
      this.p2.x = 600;
    } else {
      // 比賽開始時雙方對稱站位
      this.p1.x = 360;
      this.p2.x = 600;
    }

    this.audio.playWhistle();
  }

  bindDOM() {
    this.domHomeScore = document.getElementById('homeScore');
    this.domAwayScore = document.getElementById('awayScore');
    this.domTimer = document.getElementById('matchTimer');
    this.domStaminaFill = document.getElementById('staminaFill');
    this.domPowerFill = document.getElementById('powerFill');
    this.domP2StaminaGroup = document.getElementById('p2StaminaGroup');
    this.domP2PowerGroup = document.getElementById('p2PowerGroup');
    this.domP2StaminaFill = document.getElementById('p2StaminaFill');
    this.domP2PowerFill = document.getElementById('p2PowerFill');

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

  recordShotResult(team, res) {
    if (!res || !res.shotTaken) return;
    if (team === 'HOME') {
      this.homeShots++;
      if (res.onTarget) this.homeShotsOnTarget++;
    } else {
      this.awayShots++;
      if (res.onTarget) this.awayShotsOnTarget++;
    }
  }

  clearInputState() {
    this.keys = {};
    if (this.p1) {
      this.p1.isCharging = false;
      this.p1.chargePower = 0;
    }
    if (this.p2) {
      this.p2.isCharging = false;
      this.p2.chargePower = 0;
    }
  }

  bindEvents() {
    window.addEventListener('blur', () => {
      this.clearInputState();
    });

    window.addEventListener('keydown', (e) => {
      // 防止方向鍵、空白鍵或 Enter 觸發頁面捲動或誤觸焦點按鈕/下拉選單
      if (PREVENT_DEFAULT_KEYS.has(e.code)) {
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
        }
      }

      this.audio.init();
      this.keys[e.code] = true;

      // 暫停快捷鍵
      if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
        this.togglePause();
        return;
      }

      if (this.state !== 'PLAYING') return;

      // P1 蓄力射門鍵按下開始蓄力
      if (P1_SHOOT_KEYS.has(e.code)) {
        if (!e.repeat) this.p1.startCharge();
      }
      // P2 蓄力射門鍵按下開始蓄力 (僅 2P 模式)
      if (this.gameMode === '2P' && P2_SHOOT_KEYS.has(e.code)) {
        if (!e.repeat) this.p2.startCharge();
      }

      // P1 滑鏟 / 短傳鍵
      if (P1_TACKLE_KEYS.has(e.code)) {
        if (!e.repeat) {
          const res = this.p1.tackle(this.ball, this.audio, this.particles);
          this.recordShotResult('HOME', res);
        }
      }
      // P2 滑鏟 / 短傳鍵 (僅 2P 模式)
      if (this.gameMode === '2P' && P2_TACKLE_KEYS.has(e.code)) {
        if (!e.repeat) {
          const res = this.p2.tackle(this.ball, this.audio, this.particles);
          this.recordShotResult('AWAY', res);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;

      if (this.state !== 'PLAYING') return;

      // P1 放開射門鍵起腳射門！
      if (P1_SHOOT_KEYS.has(e.code)) {
        if (this.p1.isCharging) {
          const res = this.p1.releaseShot(this.ball, this.audio, this.particles);
          this.recordShotResult('HOME', res);
        }
      }
      // P2 放開射門鍵起腳射門！
      if (this.gameMode === '2P' && P2_SHOOT_KEYS.has(e.code)) {
        if (this.p2.isCharging) {
          const res = this.p2.releaseShot(this.ball, this.audio, this.particles);
          this.recordShotResult('AWAY', res);
        }
      }
    });

    // 介面按鈕事件 (點擊後主動移除焦點避免空白鍵/Enter誤觸)
    this.btnRestart.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.restartGame();
    });
    this.btnPause.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.togglePause();
    });
    this.btnResume.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.togglePause(false);
    });
    this.btnRestartFromPause.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.togglePause(false);
      this.restartGame();
    });
    this.btnPlayAgain.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.restartGame();
    });

    this.btnSound.addEventListener('click', (e) => {
      e.currentTarget.blur();
      const on = this.audio.toggleSound();
      this.btnSound.textContent = on ? '🔊 音效: 開啟' : '🔇 音效: 靜音';
    });

    this.selectMode.addEventListener('change', (e) => {
      this.gameMode = e.target.value;
      e.target.blur();
      const is2P = (this.gameMode === '2P');
      this.p2HelpText.style.display = is2P ? 'block' : 'none';
      if (this.domP2StaminaGroup) this.domP2StaminaGroup.style.display = is2P ? 'flex' : 'none';
      if (this.domP2PowerGroup) this.domP2PowerGroup.style.display = is2P ? 'flex' : 'none';
      document.getElementById('awayTeamName').textContent = is2P ? 'RED DRAGONS (P2)' : 'RED DRAGONS';
      document.getElementById('awayTeamType').textContent = is2P ? '玩家 2 (PVP)' : `電腦 AI (${this.difficulty})`;
      this.p2.name = is2P ? 'Player 2' : 'AI Bot';
      this.restartGame();
    });

    this.selectDiff.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      e.target.blur();
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
      this.clearInputState();
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
    this.lastScoringTeam = null;
    this.homeScore = 0;
    this.awayScore = 0;
    this.homeShots = 0;
    this.awayShots = 0;
    this.homeShotsOnTarget = 0;
    this.awayShotsOnTarget = 0;
    this.homePossessionFrames = 0;
    this.awayPossessionFrames = 0;
    this.shakeIntensity = 0;
    this.slowMoTimer = 0;
    this.clearInputState();

    this.domHomeScore.textContent = '0';
    this.domAwayScore.textContent = '0';
    this.domTimer.textContent = '90s';

    this.domGoalBanner.classList.remove('show');
    this.domPauseOverlay.classList.remove('active');
    this.domMatchOverOverlay.classList.remove('active');
    this.particles.clear();

    this.resetKickoff(null);
    this.lastTime = performance.now();
  }

  handleInputs() {
    const is1P = (this.gameMode === '1P');

    // 1. P1 玩家移動控制 (2P 模式下僅限 WASD 與左 Shift，避免與 P2 方向鍵/右 Shift 互相干擾)
    let p1dx = 0;
    let p1dy = 0;
    if (this.keys['KeyW'] || (is1P && this.keys['ArrowUp'])) p1dy -= 1;
    if (this.keys['KeyS'] || (is1P && this.keys['ArrowDown'])) p1dy += 1;
    if (this.keys['KeyA'] || (is1P && this.keys['ArrowLeft'])) p1dx -= 1;
    if (this.keys['KeyD'] || (is1P && this.keys['ArrowRight'])) p1dx += 1;
    const p1Sprint = this.keys['ShiftLeft'] || (is1P && this.keys['ShiftRight']);
    this.p1.move(p1dx, p1dy, p1Sprint);

    // 2. P2 玩家移動控制 (僅在 2P 模式下啟用：方向鍵或小鍵盤 8/5/4/6，絕不佔用 J/K)
    if (!is1P) {
      let p2dx = 0;
      let p2dy = 0;
      if (this.keys['ArrowUp'] || this.keys['Numpad8']) p2dy -= 1;
      if (this.keys['ArrowDown'] || this.keys['Numpad5']) p2dy += 1;
      if (this.keys['ArrowLeft'] || this.keys['Numpad4']) p2dx -= 1;
      if (this.keys['ArrowRight'] || this.keys['Numpad6']) p2dx += 1;
      const p2Sprint = this.keys['ShiftRight'] || this.keys['Numpad0'] || this.keys['Slash'];
      this.p2.move(p2dx, p2dy, p2Sprint);
    }
  }

  updatePhysics(timeScale = 1.0) {
    // 1. 實體更新
    this.p1.update(timeScale);
    this.homeGK.update(timeScale);
    this.p2.update(timeScale);
    this.awayGK.update(timeScale);
    this.ball.update(this.audio, timeScale);

    // 慢動作進球慶祝期間不執行 AI 搶球或控球變更
    if (this.state === 'GOAL_SLOWMO') {
      this.particles.update(timeScale);
      if (this.shakeIntensity > 0) {
        this.shakeIntensity *= 0.9;
        if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
      }
      return;
    }

    // 2. AI 決策更新 (門將與單人 AI 對手)
    this.ai.updateGoalkeeper(this.homeGK, this.ball, true, this.audio, this.particles);
    this.ai.updateGoalkeeper(this.awayGK, this.ball, false, this.audio, this.particles);

    if (this.gameMode === '1P') {
      this.ai.updateOutfieldAI(
        this.p2,
        this.ball,
        this.p1,
        this.difficulty,
        this.audio,
        this.particles,
        (res) => this.recordShotResult('AWAY', res)
      );
    }

    // 3. 球員之間互相碰撞擠壓
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

    // 4. 帶球吸附與搶斷檢測 (僅外場球員 p1/p2 可吸附帶球，門將不吸附持球)
    if (!this.ball.owner) {
      let bestCandidate = null;
      let bestDist = 26;
      for (const p of this.outfieldPlayers) {
        const d = dist(p.x, p.y, this.ball.x, this.ball.y);
        if (p.possessionCooldown <= 0 && d < bestDist) {
          bestDist = d;
          bestCandidate = p;
        }
      }
      if (bestCandidate) {
        this.ball.owner = bestCandidate;
        this.ball.lastTouchTeam = bestCandidate.team;
        bestCandidate.stealProtection = 14;
      }
    } else {
      const owner = this.ball.owner;
      for (const p of this.outfieldPlayers) {
        if (p === owner || p.team === owner.team) continue;

        const distToOwner = dist(p.x, p.y, owner.x, owner.y);
        const distToBall = dist(p.x, p.y, this.ball.x, this.ball.y);

        // 情況 A：對手主動滑鏟搶斷 (判定範圍涵蓋持球者身體與前方足球)
        if (p.isTackling && (distToOwner < 38 || distToBall < 32)) {
          this.ball.owner = null;
          owner.possessionCooldown = 28;
          owner.isCharging = false;
          owner.chargePower = 0;
          this.ball.lastTouchTeam = p.team;
          this.ball.vx = p.vx * 1.25;
          this.ball.vy = p.vy * 1.25;
          break;
        }

        // 情況 B：對手正面卡位直接觸碰到足球 (持球者無保護時被合理斷球)
        if (owner.stealProtection <= 0 && p.possessionCooldown <= 0 && distToBall < 20) {
          owner.possessionCooldown = 22;
          owner.isCharging = false;
          owner.chargePower = 0;
          this.ball.owner = p;
          this.ball.lastTouchTeam = p.team;
          p.stealProtection = 16;
          if (this.audio) this.audio.playKick(0.25);
          break;
        }
      }
    }

    // 5. 控球時間累計
    if (this.ball.owner) {
      if (this.ball.owner.team === 'HOME') this.homePossessionFrames++;
      else this.awayPossessionFrames++;
    }

    // 6. 粒子更新
    this.particles.update(timeScale);

    // 7. 畫面震動衰減
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
        this.ball.owner = null;
        this.triggerGoal('AWAY');
      } else if (this.ball.x > PITCH.GOAL.RIGHT_X + 2) {
        // 主隊進球！ (穿過右球門)
        this.ball.owner = null;
        this.triggerGoal('HOME');
      }
    }
  }

  triggerGoal(team) {
    this.state = 'GOAL_SLOWMO';
    this.lastScoringTeam = team;
    this.slowMoTimer = 90; // 慢動作持續約 1.5 秒
    this.shakeIntensity = 18; // 強烈螢幕震動
    this.clearInputState();

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
    this.clearInputState();
    this.audio.playWhistle();

    // 計算控球率
    const totalPoss = this.homePossessionFrames + this.awayPossessionFrames;
    const homePossRate = totalPoss > 0 ? Math.round((this.homePossessionFrames / totalPoss) * 100) : 50;
    const awayPossRate = 100 - homePossRate;

    // 確保射門數與射正數至少不低於實際進球數
    const finalHomeShots = Math.max(this.homeShots, this.homeScore);
    const finalAwayShots = Math.max(this.awayShots, this.awayScore);
    const finalHomeOnTarget = Math.min(finalHomeShots, Math.max(this.homeShotsOnTarget, this.homeScore));
    const finalAwayOnTarget = Math.min(finalAwayShots, Math.max(this.awayShotsOnTarget, this.awayScore));

    // 判斷勝負結果
    let result = 'DRAW';
    let resultTitle = '🤝 雙方握手言和 平局！';
    let titleClass = 'draw';

    if (this.homeScore > this.awayScore) {
      result = 'WIN';
      resultTitle = (this.gameMode === '2P') ? '🏆 主隊 (P1) 獲勝！VICTORY！' : '🏆 恭喜獲勝！VICTORY！';
      titleClass = 'win';
    } else if (this.homeScore < this.awayScore) {
      result = 'LOSS';
      resultTitle = (this.gameMode === '2P') ? '🏆 客隊 (P2) 獲勝！VICTORY！' : '💔 全場落敗！DEFEAT！';
      titleClass = (this.gameMode === '2P') ? 'win' : 'loss';
    }

    this.domMatchOverTitle.textContent = resultTitle;
    this.domMatchOverTitle.className = `match-over-title ${titleClass}`;
    this.domMatchOverScore.textContent = `${this.homeScore} - ${this.awayScore}`;
    this.domStatHomeShots.textContent = `${finalHomeOnTarget} / ${finalHomeShots}`;
    this.domStatAwayShots.textContent = `${finalAwayOnTarget} / ${finalAwayShots}`;
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
      shots_taken: finalHomeShots,
      shots_on_target: finalHomeOnTarget,
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
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
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
        this.resetKickoff(this.lastScoringTeam);
      }
    }

    // 更新底部 HUD 指示條 (P1 與 P2)
    this.domStaminaFill.style.width = `${this.p1.stamina}%`;
    this.domPowerFill.style.width = `${this.p1.chargePower * 100}%`;
    if (this.domP2StaminaFill) this.domP2StaminaFill.style.width = `${this.p2.stamina}%`;
    if (this.domP2PowerFill) this.domP2PowerFill.style.width = `${this.p2.chargePower * 100}%`;

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
