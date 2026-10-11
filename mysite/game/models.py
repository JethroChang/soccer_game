from django.db import models

class MatchRecord(models.Model):
    """單場足球賽事完整數據紀錄"""
    RESULT_CHOICES = [
        ('WIN', '獲勝'),
        ('LOSS', '落敗'),
        ('DRAW', '平局'),
    ]

    DIFFICULTY_CHOICES = [
        ('EASY', '簡單'),
        ('MEDIUM', '普通'),
        ('HARD', '困難'),
    ]

    MODE_CHOICES = [
        ('1P', '單人對戰 AI'),
        ('2P', '本機雙人同機'),
    ]

    player_score = models.IntegerField(default=0, verbose_name="主隊/玩家進球")
    opponent_score = models.IntegerField(default=0, verbose_name="客隊/對手進球")
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, default='DRAW', verbose_name="賽果")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM', verbose_name="AI難度")
    game_mode = models.CharField(max_length=10, choices=MODE_CHOICES, default='1P', verbose_name="遊戲模式")
    shots_taken = models.IntegerField(default=0, verbose_name="射門次數")
    shots_on_target = models.IntegerField(default=0, verbose_name="射正次數")
    possession_rate = models.FloatField(default=50.0, verbose_name="控球率(%)")
    duration_seconds = models.IntegerField(default=90, verbose_name="比賽實際時長(秒)")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="對戰時間")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "比賽紀錄"
        verbose_name_plural = "比賽紀錄"

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.player_score} - {self.opponent_score} ({self.result})"


class LeaderboardEntry(models.Model):
    """玩家生涯戰績與排行榜數據"""
    player_name = models.CharField(max_length=50, default="Player 1", unique=True, verbose_name="玩家名稱")
    total_matches = models.IntegerField(default=0, verbose_name="總場次")
    wins = models.IntegerField(default=0, verbose_name="勝場")
    losses = models.IntegerField(default=0, verbose_name="敗場")
    draws = models.IntegerField(default=0, verbose_name="平局")
    total_goals_scored = models.IntegerField(default=0, verbose_name="總進球數")
    total_goals_conceded = models.IntegerField(default=0, verbose_name="總失球數")
    highest_win_streak = models.IntegerField(default=0, verbose_name="最高連勝紀錄")
    current_win_streak = models.IntegerField(default=0, verbose_name="當前連勝紀錄")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新時間")

    class Meta:
        ordering = ['-wins', '-highest_win_streak', '-total_goals_scored']
        verbose_name = "排行榜資料"
        verbose_name_plural = "排行榜資料"

    @property
    def win_rate(self):
        if self.total_matches == 0:
            return 0.0
        return round((self.wins / self.total_matches) * 100, 1)

    def __str__(self):
        return f"{self.player_name} (勝率: {self.win_rate}%, 勝場: {self.wins})"
