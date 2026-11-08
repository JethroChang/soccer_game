import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import MatchRecord, LeaderboardEntry

def game_home(request):
    """遊戲主畫面"""
    recent_matches = MatchRecord.objects.all()[:5]
    player_entry = LeaderboardEntry.objects.filter(player_name="Player 1").first()
    
    context = {
        'recent_matches': recent_matches,
        'player_entry': player_entry,
    }
    return render(request, 'game.html', context)


def leaderboard_page(request):
    """歷史賽事與排行榜頁面"""
    leaderboard = LeaderboardEntry.objects.all()[:20]
    all_matches = MatchRecord.objects.all()[:30]
    
    context = {
        'leaderboard': leaderboard,
        'matches': all_matches,
    }
    return render(request, 'leaderboard.html', context)


@csrf_exempt
def ajax_save_match(request):
    """AJAX: 比賽結束後儲存戰績"""
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Only POST method is allowed'}, status=405)

    try:
        data = json.loads(request.body)
        player_score = int(data.get('player_score', 0))
        opponent_score = int(data.get('opponent_score', 0))
        result = data.get('result', 'DRAW')
        difficulty = data.get('difficulty', 'MEDIUM')
        game_mode = data.get('game_mode', '1P')
        shots_taken = int(data.get('shots_taken', 0))
        shots_on_target = int(data.get('shots_on_target', 0))
        possession_rate = float(data.get('possession_rate', 50.0))
        duration_seconds = int(data.get('duration_seconds', 90))
        player_name = str(data.get('player_name', 'Player 1')).strip() or 'Player 1'

        # 1. 建立比賽紀錄
        record = MatchRecord.objects.create(
            player_score=player_score,
            opponent_score=opponent_score,
            result=result,
            difficulty=difficulty,
            game_mode=game_mode,
            shots_taken=shots_taken,
            shots_on_target=shots_on_target,
            possession_rate=possession_rate,
            duration_seconds=duration_seconds,
        )

        # 2. 更新或建立主隊玩家 (Player 1) 生涯排行
        entry, _ = LeaderboardEntry.objects.get_or_create(player_name=player_name)
        entry.total_matches += 1
        entry.total_goals_scored += player_score
        entry.total_goals_conceded += opponent_score

        if result == 'WIN':
            entry.wins += 1
            entry.current_win_streak += 1
            if entry.current_win_streak > entry.highest_win_streak:
                entry.highest_win_streak = entry.current_win_streak
        elif result == 'LOSS':
            entry.losses += 1
            entry.current_win_streak = 0
        else:
            entry.draws += 1
            # 平局不中斷連勝，亦不增加

        entry.save()

        # 3. 若為雙人同機 (2P) 模式，同步更新 Player 2 生涯排行
        if game_mode == '2P':
            p2_name = str(data.get('opponent_name', 'Player 2')).strip() or 'Player 2'
            p2_entry, _ = LeaderboardEntry.objects.get_or_create(player_name=p2_name)
            p2_entry.total_matches += 1
            p2_entry.total_goals_scored += opponent_score
            p2_entry.total_goals_conceded += player_score
            if result == 'LOSS':  # 主隊 LOSS 即 P2 獲勝
                p2_entry.wins += 1
                p2_entry.current_win_streak += 1
                if p2_entry.current_win_streak > p2_entry.highest_win_streak:
                    p2_entry.highest_win_streak = p2_entry.current_win_streak
            elif result == 'WIN':
                p2_entry.losses += 1
                p2_entry.current_win_streak = 0
            else:
                p2_entry.draws += 1
            p2_entry.save()

        return JsonResponse({
            'status': 'success',
            'match_id': record.id,
            'current_streak': entry.current_win_streak,
            'highest_streak': entry.highest_win_streak,
            'total_wins': entry.wins,
            'win_rate': entry.win_rate,
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)


def ajax_leaderboard(request):
    """AJAX: 獲取排行榜資料"""
    entries = LeaderboardEntry.objects.all()[:15]
    data = [
        {
            'player_name': e.player_name,
            'total_matches': e.total_matches,
            'wins': e.wins,
            'losses': e.losses,
            'draws': e.draws,
            'win_rate': e.win_rate,
            'goals_scored': e.total_goals_scored,
            'highest_streak': e.highest_win_streak,
        }
        for e in entries
    ]
    return JsonResponse({'status': 'success', 'leaderboard': data})


def ajax_stats(request):
    """AJAX: 獲取生涯數據與最近比賽"""
    player_name = request.GET.get('player_name', 'Player 1')
    entry = LeaderboardEntry.objects.filter(player_name=player_name).first()
    recent = MatchRecord.objects.all()[:10]

    stats_data = {
        'player_name': player_name,
        'total_matches': entry.total_matches if entry else 0,
        'wins': entry.wins if entry else 0,
        'losses': entry.losses if entry else 0,
        'draws': entry.draws if entry else 0,
        'win_rate': entry.win_rate if entry else 0.0,
        'highest_streak': entry.highest_win_streak if entry else 0,
        'current_streak': entry.current_win_streak if entry else 0,
    }

    recent_data = [
        {
            'player_score': m.player_score,
            'opponent_score': m.opponent_score,
            'result': m.result,
            'difficulty': m.difficulty,
            'created_at': m.created_at.strftime('%m-%d %H:%M'),
        }
        for m in recent
    ]

    return JsonResponse({
        'status': 'success',
        'stats': stats_data,
        'recent_matches': recent_data
    })
