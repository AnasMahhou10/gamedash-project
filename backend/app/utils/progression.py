def xp_needed_for_level(level: int):
    return 100 + max(level - 1, 0) * 50


def apply_progression(user, xp_gain: int, currency_gain: int, elo_change: int = 0, mode: str = "ranked"):
    user.xp += xp_gain
    user.soft_currency += currency_gain

    # Appliquer le changement ELO selon le mode
    if elo_change != 0:
        if mode == "ranked":
            user.ranked_elo = max(0, user.ranked_elo + elo_change)
            user.elo        = user.ranked_elo
        elif mode == "unranked":
            user.unranked_elo = max(0, user.unranked_elo + elo_change)
        elif mode == "fun":
            user.fun_elo = max(0, user.fun_elo + elo_change)

    level_ups = 0
    while user.xp >= xp_needed_for_level(user.level):
        user.xp -= xp_needed_for_level(user.level)
        user.level += 1
        user.soft_currency += 50
        level_ups += 1

    return {
        "xp_gain":      xp_gain,
        "currency_gain": currency_gain,
        "level":         user.level,
        "level_ups":     level_ups,
        "xp_in_level":   user.xp,
        "xp_needed":     xp_needed_for_level(user.level),
    }