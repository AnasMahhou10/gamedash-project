import asyncio
import logging
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import SECRET_KEY
from app.database import SessionLocal
from app.models.match import Match
from app.models.queue import QueuePlayer
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

# match_id -> {user_id: websocket}
_game_rooms: Dict[int, Dict[int, WebSocket]] = {}


async def _get_or_create_room(match_id: int) -> Dict[int, WebSocket]:
    if match_id not in _game_rooms:
        _game_rooms[match_id] = {}
    return _game_rooms[match_id]


async def _notify_opponent(match_id: int, sender_id: int, data: dict):
    room = _game_rooms.get(match_id, {})
    for uid, ws in room.items():
        if uid != sender_id:
            try:
                await ws.send_json(data)
            except Exception:
                pass


def _get_user_from_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if not email:
            return None
        return db.query(User).filter(User.email == email).first()
    except JWTError:
        return None


@router.websocket("/ws/game")
async def game_websocket(websocket: WebSocket):
    token        = websocket.query_params.get("token")
    match_id_str = websocket.query_params.get("match_id")

    if not token or not match_id_str:
        await websocket.close(code=4000)
        return

    try:
        match_id = int(match_id_str)
    except ValueError:
        await websocket.close(code=4001)
        return

    db: Session = SessionLocal()
    try:
        user = _get_user_from_token(token, db)
        if not user:
            await websocket.close(code=4002)
            db.close()
            return

        match = db.query(Match).filter(Match.id == match_id).first()
        if not match or match.status != "ongoing":
            await websocket.close(code=4003)
            db.close()
            return

        if user.id not in {match.player1_id, match.player2_id}:
            await websocket.close(code=4004)
            db.close()
            return

        user_id = user.id
    finally:
        db.close()

    await websocket.accept()
    room = await _get_or_create_room(match_id)
    room[user_id] = websocket

    logger.info(f"[GameWS] User {user_id} joined match {match_id} (players: {list(room.keys())})")

    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=30.0)
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "pong"})
                continue

            msg_type = data.get("type")

            if msg_type == "move":
                await _notify_opponent(match_id, user_id, {
                    "type": "opponent_move",
                    "x": data.get("x", 0.0),
                    "y": data.get("y", 0.0),
                })

            elif msg_type == "game_over":
                # Transmettre le résultat à l'adversaire
                winner_id = data.get("winner_id")
                logger.info(f"[GameWS] Match {match_id} — winner={winner_id}")
                await _notify_opponent(match_id, user_id, {
                    "type": "game_over",
                    "winner_id": winner_id,
                })

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"[GameWS] Error for user {user_id}: {e}")
    finally:
        if match_id in _game_rooms:
            _game_rooms[match_id].pop(user_id, None)
            if not _game_rooms[match_id]:
                del _game_rooms[match_id]

        await _notify_opponent(match_id, user_id, {"type": "opponent_disconnected"})

        db = SessionLocal()
        try:
            disconnected_user = db.query(User).filter(User.id == user_id).first()
            if disconnected_user:
                disconnected_user.player_status = "online"
                db.commit()
            db.query(QueuePlayer).filter(
                QueuePlayer.user_id == user_id,
                QueuePlayer.status == "waiting",
            ).delete(synchronize_session=False)
            db.commit()
        finally:
            db.close()

        logger.info(f"[GameWS] User {user_id} disconnected from match {match_id}")