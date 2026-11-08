import json
from django.test import TestCase, Client
from django.urls import reverse
from .models import MatchRecord, LeaderboardEntry

class SoccerGameTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_pages_render_successfully(self):
        """測試首頁與排行榜頁面皆能正常渲染 (HTTP 200)"""
        res_home = self.client.get(reverse('game.home'))
        self.assertEqual(res_home.status_code, 200)
        self.assertContains(res_home, "SOCCER")

        res_lead = self.client.get(reverse('game.leaderboard'))
        self.assertEqual(res_lead.status_code, 200)
        self.assertContains(res_lead, "排行榜")

    def test_match_record_and_leaderboard_logic(self):
        """測試賽事紀錄與排行榜模型連勝計算"""
        entry = LeaderboardEntry.objects.create(
            player_name="Test Striker",
            total_matches=5,
            wins=4,
            losses=1,
            draws=0,
            total_goals_scored=12,
            highest_win_streak=3,
            current_win_streak=2
        )
        self.assertEqual(entry.win_rate, 80.0)

        record = MatchRecord.objects.create(
            player_score=3,
            opponent_score=1,
            result='WIN',
            difficulty='HARD',
            shots_taken=7,
            shots_on_target=5,
            possession_rate=62.5
        )
        self.assertEqual(record.player_score, 3)
        self.assertEqual(record.result, 'WIN')

    def test_ajax_save_match_api(self):
        """測試 AJAX 儲存賽事戰績 API"""
        payload = {
            'player_score': 4,
            'opponent_score': 2,
            'result': 'WIN',
            'difficulty': 'MEDIUM',
            'game_mode': '1P',
            'shots_taken': 9,
            'shots_on_target': 6,
            'possession_rate': 55.0,
            'duration_seconds': 90,
            'player_name': 'Champion Player',
        }

        response = self.client.post(
            reverse('game.ajax.save_match'),
            data=json.dumps(payload),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['current_streak'], 1)
        self.assertEqual(data['total_wins'], 1)

        # 驗證資料庫已建立該賽事紀錄
        record = MatchRecord.objects.first()
        self.assertIsNotNone(record)
        self.assertEqual(record.player_score, 4)
        self.assertEqual(record.opponent_score, 2)

    def test_ajax_leaderboard_and_stats_api(self):
        """測試獲取排行榜與生涯數據 AJAX API"""
        LeaderboardEntry.objects.create(
            player_name="Rank One",
            total_matches=10,
            wins=8,
            losses=2,
            draws=0,
            total_goals_scored=25,
            highest_win_streak=5
        )

        res_lead = self.client.get(reverse('game.ajax.leaderboard'))
        self.assertEqual(res_lead.status_code, 200)
        lead_data = res_lead.json()
        self.assertEqual(lead_data['status'], 'success')
        self.assertTrue(len(lead_data['leaderboard']) > 0)
        self.assertEqual(lead_data['leaderboard'][0]['player_name'], 'Rank One')

        res_stats = self.client.get(reverse('game.ajax.stats'), {'player_name': 'Rank One'})
        self.assertEqual(res_stats.status_code, 200)
        stats_data = res_stats.json()
        self.assertEqual(stats_data['status'], 'success')
        self.assertEqual(stats_data['stats']['wins'], 8)

    def test_2p_mode_updates_both_players_leaderboard(self):
        """測試雙人同機 (2P) 模式結算時同時更新 Player 1 與 Player 2 排行榜"""
        payload = {
            'player_score': 1,
            'opponent_score': 3,
            'result': 'LOSS',
            'difficulty': 'MEDIUM',
            'game_mode': '2P',
            'shots_taken': 4,
            'shots_on_target': 2,
            'possession_rate': 45.0,
            'duration_seconds': 90,
            'player_name': 'Player 1',
            'opponent_name': 'Player 2',
        }
        response = self.client.post(
            reverse('game.ajax.save_match'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

        p1 = LeaderboardEntry.objects.get(player_name='Player 1')
        p2 = LeaderboardEntry.objects.get(player_name='Player 2')
        self.assertEqual(p1.losses, 1)
        self.assertEqual(p2.wins, 1)
        self.assertEqual(p2.total_goals_scored, 3)

    def test_docs_static_route_serves_html(self):
        """測試導覽列之 /docs/index.html 文檔中心路由正常回應 200"""
        res_doc = self.client.get('/docs/index.html')
        self.assertEqual(res_doc.status_code, 200)
        res_sub = self.client.get('/docs/soccer_gameplay/index.html')
        self.assertEqual(res_sub.status_code, 200)
