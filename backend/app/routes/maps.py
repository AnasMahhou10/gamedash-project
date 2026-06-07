import json
import base64
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_optional_current_user
from app.database import get_db
from app.models.map import Map
from app.utils.progression import apply_progression
from app.models.map_comment import MapComment
from app.models.map_favorite import MapFavorite
from app.models.map_playtest import MapPlaytest
from app.models.map_report import MapReport
from app.models.map_tag import MapTag
from app.models.map_version import MapVersion
from app.models.map_vote import MapVote
from app.models.notification import Notification
from app.models.user import User
from app.models.virtual_transaction import VirtualTransaction
from fastapi import Body


router = APIRouter(prefix="/maps")




@router.post("/unity/save/{map_id}")
def save_map_unity(map_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    game_map = db.query(Map).filter(Map.id == map_id).first()

    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")

    # stocker JSON Unity
    game_map.content_url = json.dumps(data)
    game_map.last_updated_at = datetime.utcnow()

    db.commit()

    return {"message": "Map JSON saved"}


@router.get("/unity/load/{map_id}")
def load_map_unity(map_id: int, db: Session = Depends(get_db)):
    game_map = db.query(Map).filter(Map.id == map_id).first()

    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")

    if not game_map.content_url:
        return {"objects": []}

    try:
        return json.loads(game_map.content_url)
    except:
        return {"objects": []}


class CreateMapPayload(BaseModel):
    title: str
    description: str
    status: str = "draft"
    tags: list[str] = Field(default_factory=list)
    content_url: str | None = None
    screenshot_urls: list[str] = Field(default_factory=list)


class AddVersionPayload(BaseModel):
    map_id: int
    notes: str
    content_url: str | None = None
    screenshot_urls: list[str] = Field(default_factory=list)


class UpdateMapPayload(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    content_url: str | None = None
    screenshot_urls: list[str] | None = None


class VoteMapPayload(BaseModel):
    map_id: int
    value: int


class FavoriteMapPayload(BaseModel):
    map_id: int


class CommentMapPayload(BaseModel):
    map_id: int
    content: str


class MapTestPayload(BaseModel):
    map_id: int
    duration_seconds: int = 300
    completion_rate: float = 1.0


class MapReportPayload(BaseModel):
    map_id: int
    reason: str


def _create_notification(
    db: Session,
    target_user_id: int,
    actor_user_id: int | None,
    map_id: int | None,
    notification_type: str,
    title: str,
    message: str,
):
    if actor_user_id and actor_user_id == target_user_id:
        return

    db.add(
        Notification(
            user_id=target_user_id,
            actor_user_id=actor_user_id,
            map_id=map_id,
            type=notification_type,
            title=title,
            message=message,
        )
    )


def _load_screenshots(raw_value: str | None):
    if not raw_value:
        return []
    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        return []


def _compute_creator_stats(author_id: int, db: Session):
    author_maps = db.query(Map).filter(Map.author_id == author_id).all()
    total_tests = sum(game_map.tests_count for game_map in author_maps)
    total_popularity = 0
    for game_map in author_maps:
        votes = db.query(MapVote).filter(MapVote.map_id == game_map.id).all()
        favorites = db.query(MapFavorite).filter(MapFavorite.map_id == game_map.id).count()
        total_popularity += sum(vote.value for vote in votes) + favorites * 2 + game_map.tests_count

    return {
        "maps_published": len(author_maps),
        "tests_count": total_tests,
        "popularity": total_popularity,
    }


def _serialize_map(game_map: Map, db: Session, current_user: User | None):
    votes = db.query(MapVote).filter(MapVote.map_id == game_map.id).all()
    versions = (
        db.query(MapVersion)
        .filter(MapVersion.map_id == game_map.id)
        .order_by(MapVersion.created_at.desc())
        .all()
    )
    tags = db.query(MapTag).filter(MapTag.map_id == game_map.id).all()
    comments = (
        db.query(MapComment)
        .filter(MapComment.map_id == game_map.id)
        .order_by(MapComment.created_at.desc())
        .all()
    )
    favorites = db.query(MapFavorite).filter(MapFavorite.map_id == game_map.id).all()
    playtests = db.query(MapPlaytest).filter(MapPlaytest.map_id == game_map.id).all()
    reports = db.query(MapReport).filter(MapReport.map_id == game_map.id).all()
    author = db.query(User).filter(User.id == game_map.author_id).first()

    like_count = sum(1 for vote in votes if vote.value == 1)
    dislike_count = sum(1 for vote in votes if vote.value == -1)
    score = like_count - dislike_count
    average_rating = round((like_count / len(votes)) * 5, 2) if votes else 0
    average_completion = round(
        sum(test.completion_rate for test in playtests) / len(playtests), 2
    ) if playtests else 0

    popularity = score * 2 + len(favorites) * 3 + len(comments) + len(versions) + game_map.tests_count * 2
    recent_bonus = 0
    if game_map.last_updated_at and game_map.last_updated_at >= datetime.utcnow() - timedelta(days=7):
        recent_bonus = 5

    user_vote = None
    is_favorited = False
    if current_user:
        current_vote = next((vote for vote in votes if vote.user_id == current_user.id), None)
        user_vote = current_vote.value if current_vote else None
        is_favorited = any(favorite.user_id == current_user.id for favorite in favorites)

    return {
        "id": game_map.id,
        "title": game_map.title,
        "description": game_map.description,
        "status": game_map.status,
        "content_url": game_map.content_url,
        "screenshots": _load_screenshots(game_map.screenshot_urls),
        "featured": game_map.featured,
        "hidden": game_map.hidden,
        "author": {
            "id": author.id if author else game_map.author_id,
            "pseudo": author.pseudo if author else f"Player {game_map.author_id}",
            "stats": _compute_creator_stats(game_map.author_id, db),
        },
        "score": score,
        "likes": like_count,
        "dislikes": dislike_count,
        "favorites": len(favorites),
        "comments_count": len(comments),
        "versions_count": len(versions),
        "tests_count": game_map.tests_count,
        "report_count": len(reports),
        "average_rating": average_rating,
        "retention_score": round(game_map.retention_score or average_completion, 2),
        "last_updated_at": game_map.last_updated_at,
        "last_tested_at": game_map.last_tested_at,
        "popularity": popularity + recent_bonus,
        "is_favorited": is_favorited,
        "user_vote": user_vote,
        "tags": [tag.name for tag in tags],
        "created_at": game_map.created_at,
        "versions": [
            {
                "id": version.id,
                "version": version.version,
                "notes": version.notes,
                "created_at": version.created_at,
            }
            for version in versions
        ],
        "comments": [
            {
                "id": comment.id,
                "author_id": comment.user_id,
                "author_name": (
                    db.query(User).filter(User.id == comment.user_id).first().pseudo
                    if db.query(User).filter(User.id == comment.user_id).first()
                    else f"Player {comment.user_id}"
                ),
                "content": comment.content,
                "created_at": comment.created_at,
            }
            for comment in comments
        ],
    }


def _validate_map_content(raw_content: Optional[str]):
    if not raw_content:
        return True
    # try to handle data URLs: data:application/json;base64,xxxx
    try:
        content = raw_content
        if content.startswith("data:") and "," in content:
            content = content.split(",", 1)[1]

        # try base64 decode
        try:
            decoded = base64.b64decode(content)
            text = decoded.decode("utf-8")
            obj = json.loads(text)
        except Exception:
            # maybe it's plain JSON
            obj = json.loads(content)

        # basic shape checks
        if not isinstance(obj, dict):
            return False
        if not all(k in obj for k in ("width", "height", "cells")):
            return False
        if not isinstance(obj["cells"], list):
            return False
        return True
    except Exception:
        return False


@router.post("/")
def create_map(payload: CreateMapPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # validate content_url
    if payload.content_url and not _validate_map_content(payload.content_url):
        raise HTTPException(status_code=400, detail="Invalid map content_url")

    game_map = Map(
        title=payload.title,
        description=payload.description,
        author_id=user.id,
        status=payload.status,
        content_url=payload.content_url,
        screenshot_urls=json.dumps(payload.screenshot_urls[:4]),
        last_updated_at=datetime.utcnow(),
    )
    db.add(game_map)
    db.commit()
    db.refresh(game_map)

    db.add(MapVersion(map_id=game_map.id, version="v1", notes="Initial release"))
    for tag_name in payload.tags[:5]:
        cleaned = tag_name.strip().lower()
        if cleaned:
            db.add(MapTag(map_id=game_map.id, name=cleaned))

    db.commit()
    return {"message": "Map created", "map_id": game_map.id}


@router.post("/version")
def add_version(payload: AddVersionPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    game_map = db.query(Map).filter(Map.id == payload.map_id).first()
    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")
    if game_map.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to edit this map")

    count = db.query(MapVersion).filter(MapVersion.map_id == payload.map_id).count()
    version = f"v{count + 1}"
    db.add(MapVersion(map_id=payload.map_id, version=version, notes=payload.notes))
    if payload.content_url:
        if not _validate_map_content(payload.content_url):
            raise HTTPException(status_code=400, detail="Invalid map content_url")
        game_map.content_url = payload.content_url
    if payload.screenshot_urls:
        game_map.screenshot_urls = json.dumps(payload.screenshot_urls[:4])
    game_map.last_updated_at = datetime.utcnow()
    _create_notification(
        db,
        game_map.author_id,
        user.id,
        game_map.id,
        "map_version",
        "Nouvelle version",
        f"{user.pseudo} a publie {version} sur {game_map.title}.",
    )
    db.commit()

    return {"message": "Version added", "version": version}


@router.post("/vote")
def vote(payload: VoteMapPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.value not in (-1, 1):
        raise HTTPException(status_code=400, detail="Vote must be 1 or -1")
    existing_vote = db.query(MapVote).filter(MapVote.map_id == payload.map_id, MapVote.user_id == user.id).first()
    if existing_vote:
        existing_vote.value = payload.value
    else:
        db.add(MapVote(map_id=payload.map_id, user_id=user.id, value=payload.value))
    game_map = db.query(Map).filter(Map.id == payload.map_id).first()
    if game_map:
        _create_notification(
            db,
            game_map.author_id,
            user.id,
            game_map.id,
            "map_vote",
            "Nouvelle evaluation",
            f"{user.pseudo} a evalue votre map {game_map.title}.",
        )
    db.commit()
    return {"message": "Vote added"}


@router.post("/favorite")
def favorite_map(payload: FavoriteMapPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favorite = db.query(MapFavorite).filter(MapFavorite.map_id == payload.map_id, MapFavorite.user_id == user.id).first()
    game_map = db.query(Map).filter(Map.id == payload.map_id).first()
    if favorite:
        db.delete(favorite)
        db.commit()
        return {"message": "Favorite removed", "is_favorited": False}

    db.add(MapFavorite(map_id=payload.map_id, user_id=user.id))
    if game_map:
        _create_notification(
            db,
            game_map.author_id,
            user.id,
            game_map.id,
            "map_favorite",
            "Nouveau favori",
            f"{user.pseudo} a ajoute {game_map.title} a ses favoris.",
        )
    db.commit()
    return {"message": "Favorite added", "is_favorited": True}


@router.post("/comment")
def comment_map(payload: CommentMapPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    db.add(MapComment(map_id=payload.map_id, user_id=user.id, content=content))
    game_map = db.query(Map).filter(Map.id == payload.map_id).first()
    if game_map:
        _create_notification(
            db,
            game_map.author_id,
            user.id,
            game_map.id,
            "map_comment",
            "Nouveau commentaire",
            f"{user.pseudo} a commente votre map {game_map.title}.",
        )
    db.commit()
    return {"message": "Comment added"}


@router.post("/test")
def mark_test(payload: MapTestPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    game_map = db.query(Map).filter(Map.id == payload.map_id).first()
    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")

    playtest = MapPlaytest(
        map_id=payload.map_id,
        user_id=user.id,
        duration_seconds=max(60, payload.duration_seconds),
        completion_rate=max(0.1, min(payload.completion_rate, 1.0)),
    )
    db.add(playtest)
    db.flush()

    tests = db.query(MapPlaytest).filter(MapPlaytest.map_id == payload.map_id).all()
    game_map.tests_count = len(tests)
    game_map.retention_score = sum(test.completion_rate for test in tests) / len(tests)
    game_map.last_tested_at = datetime.utcnow()
    _create_notification(
        db,
        game_map.author_id,
        user.id,
        game_map.id,
        "map_test",
        "Nouveau test",
        f"{user.pseudo} a teste votre map {game_map.title}.",
    )
    # Rewards: small bonus to the tester and a tiny reward to the map author
    try:
        tester_xp = 10
        tester_currency = 5
        author_currency = 3

        # apply progression to tester
        tester_progress = apply_progression(user, xp_gain=tester_xp, currency_gain=tester_currency)
        db.add(
            VirtualTransaction(
                user_id=user.id,
                amount=tester_currency,
                currency_type="soft",
                source="map_test_reward",
            )
        )

        # reward the author (if not the tester)
        if game_map.author_id and game_map.author_id != user.id:
            db.add(
                VirtualTransaction(
                    user_id=game_map.author_id,
                    amount=author_currency,
                    currency_type="soft",
                    source="map_test_received",
                )
            )
    except Exception:
        # don't block test recording on reward errors
        pass

    db.commit()
    return {"message": "Map test recorded"}


@router.post("/report")
def report_map(payload: MapReportPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Reason is required")
    db.add(MapReport(map_id=payload.map_id, user_id=user.id, reason=reason))
    game_map = db.query(Map).filter(Map.id == payload.map_id).first()
    if game_map:
        _create_notification(
            db,
            game_map.author_id,
            user.id,
            game_map.id,
            "map_report",
            "Signalement recu",
            f"{user.pseudo} a signale votre map {game_map.title}.",
        )
    db.commit()
    return {"message": "Report submitted"}


@router.get("/mine")
def get_my_maps(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    my_maps = (
        db.query(Map)
        .filter(Map.author_id == user.id)
        .order_by(Map.last_updated_at.desc(), Map.created_at.desc())
        .all()
    )
    return [_serialize_map(game_map, db, user) for game_map in my_maps]


@router.get("/notifications")
def get_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    unread_count = len([notification for notification in notifications if not notification.is_read])

    return {
        "unread_count": unread_count,
        "items": [
            {
                "id": notification.id,
                "type": notification.type,
                "title": notification.title,
                "message": notification.message,
                "map_id": notification.map_id,
                "is_read": notification.is_read,
                "created_at": notification.created_at,
            }
            for notification in notifications
        ],
    }


@router.post("/notifications/read-all")
def read_all_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(Notification.user_id == user.id, Notification.is_read.is_(False)).all()
    for notification in notifications:
        notification.is_read = True
    db.commit()
    return {"message": "Notifications marked as read"}


@router.delete("/comment/{comment_id}")
def delete_comment(comment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment = db.query(MapComment).filter(MapComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    game_map = db.query(Map).filter(Map.id == comment.map_id).first()
    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")

    if comment.user_id != user.id and game_map.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to delete this comment")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}


@router.get("/creator-stats")
def creator_stats(db: Session = Depends(get_db)):
    creators = {}
    users = db.query(User).all()
    for user in users:
        stats = _compute_creator_stats(user.id, db)
        if stats["maps_published"] > 0:
            creators[user.pseudo] = stats
    payload = [
        {"creator": pseudo, **stats}
        for pseudo, stats in sorted(creators.items(), key=lambda item: (item[1]["popularity"], item[1]["tests_count"]), reverse=True)
    ]
    return payload[:10]
@router.get("/{map_id}")
def get_map_by_id(
    map_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
   
    game_map = db.query(Map).filter(Map.id == map_id, Map.hidden.is_(False)).first()

    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")

    return _serialize_map(game_map, db, current_user)


@router.put("/{map_id}")
def update_map(map_id: int, payload: UpdateMapPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    game_map = db.query(Map).filter(Map.id == map_id).first()
    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")
    if game_map.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to edit this map")

    if payload.content_url is not None:
        if not _validate_map_content(payload.content_url):
            raise HTTPException(status_code=400, detail="Invalid map content_url")
        game_map.content_url = payload.content_url

    if payload.title is not None:
        game_map.title = payload.title
    if payload.description is not None:
        game_map.description = payload.description
    if payload.status is not None:
        game_map.status = payload.status
    if payload.screenshot_urls is not None:
        game_map.screenshot_urls = json.dumps(payload.screenshot_urls[:4])
    if payload.tags is not None:
        # replace tags: remove existing and add provided
        db.query(MapTag).filter(MapTag.map_id == game_map.id).delete()
        for tag_name in payload.tags[:5]:
            cleaned = tag_name.strip().lower()
            if cleaned:
                db.add(MapTag(map_id=game_map.id, name=cleaned))

    game_map.last_updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Map updated", "map_id": game_map.id}


@router.delete("/{map_id}")
def delete_map(map_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    game_map = db.query(Map).filter(Map.id == map_id).first()
    if not game_map:
        raise HTTPException(status_code=404, detail="Map not found")
    if game_map.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to delete this map")

    # soft delete
    game_map.hidden = True
    game_map.last_updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Map deleted"}


@router.get("/")
def get_maps(
    q: str | None = Query(default=None),
    status: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    sort: str = Query(default="trending"),
    author: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    maps = db.query(Map).filter(Map.hidden.is_(False)).all()
    items = [_serialize_map(game_map, db, current_user) for game_map in maps]

    if q:
        term = q.lower()
        items = [
            item
            for item in items
            if term in item["title"].lower()
            or term in item["description"].lower()
            or any(term in map_tag for map_tag in item["tags"])
        ]

    if status:
        items = [item for item in items if item["status"] == status]

    if tag:
        tag_lower = tag.lower()
        items = [item for item in items if tag_lower in item["tags"]]

    if author:
        author_term = author.lower()
        items = [item for item in items if author_term in item["author"]["pseudo"].lower()]

    if sort == "newest":
        items.sort(key=lambda item: item["created_at"] or datetime.min, reverse=True)
    elif sort == "top":
        items.sort(key=lambda item: item["average_rating"], reverse=True)
    elif sort == "favorites":
        items.sort(key=lambda item: item["favorites"], reverse=True)
    elif sort == "tested":
        items.sort(key=lambda item: item["tests_count"], reverse=True)
    else:
        items.sort(key=lambda item: item["popularity"], reverse=True)

    return items



