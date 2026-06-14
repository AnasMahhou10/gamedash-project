from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import SECRET_KEY
from app.database import Base, engine, ensure_schema, ensure_modes_enabled,ensure_default_maps
from app.models import (  # noqa: F401
    economy_settings,
    inventory_item,
    map_comment,
    map_favorite,
    map_playtest,
    map_report,
    map_tag,
    notification,
    payment_transaction,
    reward_settings,
    sanction_log,
    season_pass,
    season_pass_tier,
    shop_item,
    store_pack,
    virtual_transaction,
)
from app.routes import admin, auth, dashboard, maps, matchmaking, matchmaking_ws, shop, user, game_ws

Base.metadata.create_all(bind=engine)
ensure_schema()
ensure_modes_enabled()
ensure_default_maps()

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(matchmaking.router, prefix="/matchmaking", tags=["Matchmaking"])
app.include_router(maps.router, tags=["Maps"])
app.include_router(matchmaking_ws.router)
app.include_router(game_ws.router)
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(shop.router, prefix="/shop", tags=["Shop"])


@app.get("/")
def root():
    return {"message": "GameDash API running "}