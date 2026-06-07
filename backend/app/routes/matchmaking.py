from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.ws_manager import manager
from app.database import get_db
from app.models.match import Match
from app.models.map import Map
from app.models.matchmaking_settings import MatchmakingSettings
from app.models.queue import QueuePlayer
from app.models.rank_settings import RankSettings
from app.models.reward_settings import RewardSettings
from app.models.user import User
from app.models.virtual_transaction import VirtualTransaction
from app.utils.progression import apply_progression
from app.utils.rank import get_rank_payload

router = APIRouter()

ALLOWED_MODES = {"ranked", "unranked", "fun"}
MODE_ELO_FIELDS = {
    "ranked": "ranked_elo",
    "unranked": "unranked_elo",
    "fun": "fun_elo",
}


class JoinQueuePayload(BaseModel):
    mode: str = "ranked"


def get_or_create_settings(db: Session) -> MatchmakingSettings:
    settings = db.query(MatchmakingSettings).first()

    if not settings:
        settings = MatchmakingSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


def get_rank_settings(db: Session):
    return db.query(RankSettings).first()


def get_reward_settings(db: Session):
    settings = db.query(RewardSettings).first()

    if not settings:
        settings = RewardSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


def serialize_settings(settings: MatchmakingSettings):
    return {
        "max_elo_gap": settings.max_elo_gap,
        "max_wait_seconds": settings.max_wait_seconds,
        "team_size": settings.team_size,
        "modes": {
            "ranked": settings.ranked_enabled,
            "unranked": settings.unranked_enabled,
            "fun": settings.fun_enabled,
        },
    }


def mode_is_enabled(settings: MatchmakingSettings, mode: str) -> bool:
    return {
        "ranked": settings.ranked_enabled,
        "unranked": settings.unranked_enabled,
        "fun": settings.fun_enabled,
    }.get(mode, False)


def get_user_elo_for_mode(user: User, mode: str):
    return getattr(user, MODE_ELO_FIELDS.get(mode, "ranked_elo"), user.elo)


def set_user_elo_for_mode(user: User, mode: str, value: int):
    field_name = MODE_ELO_FIELDS.get(mode, "ranked_elo")
    setattr(user, field_name, value)

    if mode == "ranked":
        user.elo = value


def serialize_match(match: Match, current_user: User, db: Session):
    player1 = db.query(User).filter(User.id == match.player1_id).first()
    player2 = db.query(User).filter(User.id == match.player2_id).first()

    player1_name = player1.pseudo if player1 else f"Player {match.player1_id}"
    player2_name = player2.pseudo if player2 else f"Player {match.player2_id}"

    if current_user.id == match.player1_id:
        opponent_id = match.player2_id
        opponent_name = player2_name
        elo_delta = match.player1_elo_change
        xp_gain = match.player1_xp_gain
    else:
        opponent_id = match.player1_id
        opponent_name = player1_name
        elo_delta = match.player2_elo_change
        xp_gain = match.player2_xp_gain

    result = "pending"
    if match.winner_id:
        result = "win" if match.winner_id == current_user.id else "lose"

    return {
        "match_id": match.id,
        "player1": match.player1_id,
        "player1_name": player1_name,
        "player2": match.player2_id,
        "player2_name": player2_name,
        "opponent_id": opponent_id,
        "opponent_name": opponent_name,
        "winner": match.winner_id,
        "status": match.status,
        "result": result,
        "mode": match.mode,
        "map_id": match.map_id,
        "map_title": db.query(Map).filter(Map.id == match.map_id).first().title if match.map_id else None,
        "date": match.created_at,
        "finished_at": match.finished_at,
        "duration_seconds": match.duration_seconds,
        "duration_label": f"{(match.duration_seconds or 0) // 60}m {(match.duration_seconds or 0) % 60}s",
        "elo_delta": elo_delta,
        "xp_gain": xp_gain,
        "details": {
            "pressure": "High" if match.mode == "ranked" else "Medium" if match.mode == "unranked" else "Low",
            "intensity_score": max(1, min(10, (match.duration_seconds or 300) // 60)),
            "queue_mode": match.mode,
        },
    }


def serialize_queue_entry(queue_player: QueuePlayer, db: Session):
    user = db.query(User).filter(User.id == queue_player.user_id).first()
    waited_for = max(0, int((datetime.utcnow() - queue_player.joined_at).total_seconds()))

    return {
        "queue_id": queue_player.id,
        "user_id": queue_player.user_id,
        "pseudo": user.pseudo if user else f"Player {queue_player.user_id}",
        "elo": get_user_elo_for_mode(user, queue_player.mode) if user else 0,
        "mode": queue_player.mode,
        "status": queue_player.status,
        "joined_at": queue_player.joined_at,
        "waited_seconds": waited_for,
    }


def evaluate_pair(db: Session, first_player: QueuePlayer, second_player: QueuePlayer, settings: MatchmakingSettings):
    first_user = db.query(User).filter(User.id == first_player.user_id).first()
    second_user = db.query(User).filter(User.id == second_player.user_id).first()

    if not first_user or not second_user:
        return None

    first_elo = get_user_elo_for_mode(first_user, first_player.mode)
    second_elo = get_user_elo_for_mode(second_user, second_player.mode)
    elo_diff = abs(first_elo - second_elo)
    waited_first = max(0, int((datetime.utcnow() - first_player.joined_at).total_seconds()))
    waited_second = max(0, int((datetime.utcnow() - second_player.joined_at).total_seconds()))
    longest_wait = max(waited_first, waited_second)

    can_match = elo_diff <= settings.max_elo_gap or longest_wait >= settings.max_wait_seconds
    score = elo_diff - min(longest_wait, settings.max_wait_seconds)

    return {
        "users": (first_user, second_user),
        "queue_entries": (first_player, second_player),
        "elo_diff": elo_diff,
        "longest_wait": longest_wait,
        "can_match": can_match,
        "score": score,
    }


async def try_create_match_for_mode(db: Session, mode: str, settings: MatchmakingSettings):
    players = (
        db.query(QueuePlayer)
        .filter(QueuePlayer.status == "waiting", QueuePlayer.mode == mode)
        .order_by(QueuePlayer.joined_at.asc())
        .all()
    )

    if len(players) < 2:
        return None

    best_candidate = None

    for index, first_player in enumerate(players):
        for second_player in players[index + 1 :]:
            candidate = evaluate_pair(db, first_player, second_player, settings)

            if not candidate or not candidate["can_match"]:
                continue

            if best_candidate is None or candidate["score"] < best_candidate["score"]:
                best_candidate = candidate

    if not best_candidate:
        return None

    first_user, second_user = best_candidate["users"]
    first_queue, second_queue = best_candidate["queue_entries"]

    match = Match(
        player1_id=first_user.id,
        player2_id=second_user.id,
        mode=mode,
        status="ongoing",
    )
    # choose a default map for the match: prefer featured published maps, else most tested
    try:
        candidate_map = (
            db.query(Map)
            .filter(Map.hidden.is_(False), Map.status == "published")
            .order_by(Map.featured.desc(), Map.tests_count.desc())
            .first()
        )
        if candidate_map:
            match.map_id = candidate_map.id
    except Exception:
        pass
    db.add(match)

    first_queue.status = "matched"
    second_queue.status = "matched"
    first_user.player_status = "in_game"
    second_user.player_status = "in_game"

    db.commit()
    db.refresh(match)

    await manager.send_to_user(
        first_user.id,
        {
            "type": "match_found",
            "match_id": match.id,
            "opponent": second_user.id,
            "mode": mode,
            "status": "in_game",
            "map_id": match.map_id,
        },
    )
    await manager.send_to_user(
        second_user.id,
        {
            "type": "match_found",
            "match_id": match.id,
            "opponent": first_user.id,
            "mode": mode,
            "status": "in_game",
            "map_id": match.map_id,
        },
    )

    return {
        "message": "Match auto created",
        "match_id": match.id,
        "mode": mode,
        "players": [first_user.id, second_user.id],
        "elo_diff": best_candidate["elo_diff"],
        "waited_seconds": best_candidate["longest_wait"],
    }


@router.get("/settings")
def get_matchmaking_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    return {"settings": serialize_settings(settings), "player_status": user.player_status}


@router.get("/queue-overview")
def queue_overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    queue_players = (
        db.query(QueuePlayer)
        .filter(QueuePlayer.status == "waiting")
        .order_by(QueuePlayer.joined_at.asc())
        .all()
    )

    grouped = {mode: [] for mode in ALLOWED_MODES}
    for queue_player in queue_players:
        grouped.setdefault(queue_player.mode, []).append(serialize_queue_entry(queue_player, db))

    return {
        "settings": serialize_settings(settings),
        "queue": grouped,
        "players_by_state": {
            "online": db.query(User).filter(User.player_status == "online").count(),
            "queue": db.query(User).filter(User.player_status == "queue").count(),
            "in_game": db.query(User).filter(User.player_status == "in_game").count(),
        },
    }


@router.get("/current")
def get_current_match(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    match = (
        db.query(Match)
        .filter(
            or_(Match.player1_id == user.id, Match.player2_id == user.id),
            Match.status == "ongoing",
        )
        .order_by(Match.created_at.desc())
        .first()
    )

    if not match:
        return {"match": None}

    opponent_id = match.player2_id if match.player1_id == user.id else match.player1_id

    return {
        "match": {
            "match_id": match.id,
            "opponent": opponent_id,
            "mode": match.mode,
            "status": "in_game",
            "map_id": match.map_id,
            "created_at": match.created_at,
        }
    }


@router.get("/history")
def get_history(
    mode: str | None = Query(default=None),
    period: str | None = Query(default=None),
    player: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Match).filter(or_(Match.player1_id == user.id, Match.player2_id == user.id))

    if mode in ALLOWED_MODES:
        query = query.filter(Match.mode == mode)

    if period == "7d":
        query = query.filter(Match.created_at >= datetime.utcnow() - timedelta(days=7))
    elif period == "30d":
        query = query.filter(Match.created_at >= datetime.utcnow() - timedelta(days=30))
    elif period == "90d":
        query = query.filter(Match.created_at >= datetime.utcnow() - timedelta(days=90))

    matches = query.order_by(Match.created_at.desc()).all()

    serialized = [serialize_match(match, user, db) for match in matches]

    if player:
        needle = player.lower().strip()
        serialized = [
            match
            for match in serialized
            if needle in match["opponent_name"].lower()
            or needle in match["player1_name"].lower()
            or needle in match["player2_name"].lower()
            or needle in str(match["opponent_id"])
        ]

    return serialized


@router.get("/elo-history")
def elo_history(
    mode: str | None = Query(default="ranked"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matches = (
        db.query(Match)
        .filter(
            or_(Match.player1_id == user.id, Match.player2_id == user.id),
            Match.status == "finished",
            Match.mode == mode,
        )
        .order_by(Match.created_at)
        .all()
    )

    elo_field = MODE_ELO_FIELDS.get(mode or "ranked", "ranked_elo")
    starting_elo = 1000
    history = []
    current_elo = starting_elo

    for match in matches:
        elo_delta = match.player1_elo_change if match.player1_id == user.id else match.player2_elo_change
        current_elo += elo_delta
        history.append(
            {
                "elo": current_elo,
                "date": match.created_at,
                "mode": match.mode,
                "delta": elo_delta,
                "rank": get_rank_payload(current_elo, get_rank_settings(db))["label"],
            }
        )

    return {
        "mode": mode,
        "current_elo": getattr(user, elo_field),
        "history": history,
    }


@router.post("/join")
async def join_queue(payload: JoinQueuePayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mode = payload.mode.lower().strip()
    if mode not in ALLOWED_MODES:
        raise HTTPException(status_code=400, detail="Invalid matchmaking mode")

    settings = get_or_create_settings(db)
    if not mode_is_enabled(settings, mode):
        raise HTTPException(status_code=400, detail=f"{mode} mode is disabled")

    existing = db.query(QueuePlayer).filter(QueuePlayer.user_id == user.id, QueuePlayer.status == "waiting").first()
    if existing:
        return {"message": "Already in queue", "mode": existing.mode, "player_status": user.player_status}

    player = QueuePlayer(user_id=user.id, mode=mode)
    db.add(player)
    user.player_status = "queue"
    db.commit()

    created_match = await try_create_match_for_mode(db, mode, settings)
    if created_match:
        return created_match

    return {
        "message": "Joined queue",
        "mode": mode,
        "player_status": "queue",
        "max_wait_seconds": settings.max_wait_seconds,
        "max_elo_gap": settings.max_elo_gap,
    }


@router.post("/leave")
def leave_queue(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    player = db.query(QueuePlayer).filter(QueuePlayer.user_id == user.id, QueuePlayer.status == "waiting").first()
    if not player:
        return {"message": "Not in queue", "player_status": user.player_status}

    db.delete(player)
    user.player_status = "online"
    db.commit()
    return {"message": "Left queue", "player_status": "online"}


@router.post("/match")
async def create_match(payload: JoinQueuePayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    require_mode = payload.mode.lower().strip()

    if require_mode not in ALLOWED_MODES:
        raise HTTPException(status_code=400, detail="Invalid matchmaking mode")

    result = await try_create_match_for_mode(db, require_mode, settings)
    if not result:
        return {"message": "No match found", "mode": require_mode}
    return result


@router.post("/result")
def match_result(match_id: int, winner_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        return {"message": "Match not found"}

    if match.player1_id == winner_id:
        loser_id = match.player2_id
    elif match.player2_id == winner_id:
        loser_id = match.player1_id
    else:
        return {"message": "Invalid winner"}

    winner = db.query(User).filter(User.id == winner_id).first()
    loser = db.query(User).filter(User.id == loser_id).first()
    if not winner or not loser:
        return {"message": "Players not found"}

    winner_elo = get_user_elo_for_mode(winner, match.mode)
    loser_elo = get_user_elo_for_mode(loser, match.mode)
    expected = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
    winner_gain = int(32 * (1 - expected))
    loser_loss = int(32 * expected)

    set_user_elo_for_mode(winner, match.mode, winner_elo + winner_gain)
    set_user_elo_for_mode(loser, match.mode, loser_elo - loser_loss)

    if winner.id == match.player1_id:
        match.player1_elo_change = winner_gain
        match.player2_elo_change = -loser_loss
    else:
        match.player1_elo_change = -loser_loss
        match.player2_elo_change = winner_gain

    reward_settings = get_reward_settings(db)
    winner_progression = apply_progression(
        winner,
        xp_gain=reward_settings.win_xp,
        currency_gain=reward_settings.win_currency,
    )
    loser_progression = apply_progression(
        loser,
        xp_gain=reward_settings.loss_xp,
        currency_gain=reward_settings.loss_currency,
    )

    db.add(
        VirtualTransaction(
            user_id=winner.id,
            amount=reward_settings.win_currency,
            currency_type="soft",
            source=f"{match.mode}_match_win",
        )
    )
    db.add(
        VirtualTransaction(
            user_id=loser.id,
            amount=reward_settings.loss_currency,
            currency_type="soft",
            source=f"{match.mode}_match_loss",
        )
    )

    if winner.id == match.player1_id:
        match.player1_xp_gain = winner_progression["xp_gain"]
        match.player2_xp_gain = loser_progression["xp_gain"]
    else:
        match.player1_xp_gain = loser_progression["xp_gain"]
        match.player2_xp_gain = winner_progression["xp_gain"]

    db.commit()

    return {
        "message": "ELO updated",
        "winner": winner_id,
        "loser": loser_id,
        "winner_elo": get_user_elo_for_mode(winner, match.mode),
        "loser_elo": get_user_elo_for_mode(loser, match.mode),
        "winner_level": winner.level,
        "loser_level": loser.level,
        "mode": match.mode,
    }


@router.post("/finish")
async def finish_match(match_id: int, winner_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        return {"message": "Match not found"}

    match.status = "finished"
    match.winner_id = winner_id
    match.finished_at = datetime.utcnow()
    elapsed = int((match.finished_at - match.created_at).total_seconds())
    match.duration_seconds = max(180, elapsed)

    users = db.query(User).filter(User.id.in_([match.player1_id, match.player2_id])).all()
    for user in users:
        user.player_status = "online"

    queue_entries = (
        db.query(QueuePlayer)
        .filter(QueuePlayer.user_id.in_([match.player1_id, match.player2_id]), QueuePlayer.status == "matched")
        .all()
    )
    for queue_entry in queue_entries:
        db.delete(queue_entry)

    db.commit()

    await manager.send_to_user(
        match.player1_id,
        {
            "type": "match_finished",
            "match_id": match.id,
            "winner_id": winner_id,
            "result": "win" if winner_id == match.player1_id else "lose",
            "mode": match.mode,
            "duration_seconds": match.duration_seconds,
        },
    )
    await manager.send_to_user(
        match.player2_id,
        {
            "type": "match_finished",
            "match_id": match.id,
            "winner_id": winner_id,
            "result": "win" if winner_id == match.player2_id else "lose",
            "mode": match.mode,
            "duration_seconds": match.duration_seconds,
        },
    )

    # Prepare a response with progression for the calling user
    mmr_change = 0
    xp_gained = 0
    coins_gained = 0
    reward_settings = get_reward_settings(db)

    if user.id == match.player1_id:
        mmr_change = match.player1_elo_change or 0
        xp_gained = match.player1_xp_gain or 0
        coins_gained = reward_settings.win_currency if winner_id == user.id else reward_settings.loss_currency
    elif user.id == match.player2_id:
        mmr_change = match.player2_elo_change or 0
        xp_gained = match.player2_xp_gain or 0
        coins_gained = reward_settings.win_currency if winner_id == user.id else reward_settings.loss_currency

    return {
        "message": "Match finished",
        "match_id": match.id,
        "winner": winner_id,
        "mode": match.mode,
        "duration_seconds": match.duration_seconds,
        "mmr_change": mmr_change,
        "xp_gained": xp_gained,
        "coins_gained": coins_gained,
    }
