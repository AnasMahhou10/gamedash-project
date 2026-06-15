from fastapi import WebSocket, APIRouter, WebSocketDisconnect
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.config import SECRET_KEY
from app.core.ws_manager import manager
from app.database import SessionLocal
from app.models.queue import QueuePlayer
from app.models.rank_settings import RankSettings
from app.models.user import User
from app.utils.rank import get_rank_payload

router = APIRouter()


@router.websocket("/ws/matchmaking")
async def websocket_endpoint(websocket: WebSocket):

    token = websocket.query_params.get("token")

    if not token:
        await websocket.close()
        return

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")

    except JWTError:
        await websocket.close()
        return

    db: Session = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).first()
        rank_settings = db.query(RankSettings).first()
        if user and user.player_status not in {"queue", "in_game"}:
            user.player_status = "online"
            db.commit()
    finally:
        db.close()

    if not user:
        await websocket.close()
        return

    await manager.connect(user.id, websocket)

    # ENVOI STATS A TOUS LES DASHBOARDS CONNECTES
    await manager.broadcast_stats()

    await websocket.send_json({
        "type": "elo",
        "elo": user.ranked_elo,
        "rank": get_rank_payload(user.ranked_elo, rank_settings)["label"]
    })

    await websocket.send_json({
        "type": "player_state",
        "player_status": user.player_status,
    })

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(user.id)
        await manager.broadcast_stats()
        db = SessionLocal()
        try:
            disconnected_user = db.query(User).filter(User.id == user.id).first()
            if disconnected_user and disconnected_user.player_status == "queue":
                db.query(QueuePlayer).filter(
                    QueuePlayer.user_id == user.id,
                    QueuePlayer.status == "waiting",
                ).delete(synchronize_session=False)
                disconnected_user.player_status = "online"
                db.commit()
        finally:
            db.close()
