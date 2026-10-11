from django.urls import path
from . import views

urlpatterns = [
    # 頁面路由
    path('', views.game_home, name='game.home'),
    path('leaderboard/', views.leaderboard_page, name='game.leaderboard'),

    # AJAX API (對齊 stock_dash ajax/<action>/ 命名慣例)
    path('ajax/save_match/', views.ajax_save_match, name='game.ajax.save_match'),
    path('ajax/leaderboard/', views.ajax_leaderboard, name='game.ajax.leaderboard'),
    path('ajax/stats/', views.ajax_stats, name='game.ajax.stats'),
]
