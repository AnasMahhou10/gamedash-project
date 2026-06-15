import os
import base64
import json

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SQL_ECHO = os.getenv("SQL_ECHO", "false").lower() == "true"

engine = create_engine(
    DATABASE_URL,
    echo=SQL_ECHO,
    pool_pre_ping=True,
    connect_args={"options": "-c client_encoding=utf8"},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# ── Maps par défaut par mode ───────────────────────────────────────────────────
# Format : liste de cellules {x, y, type}
# type 1=mur, 2=sol, 3=spawnP1, 4=spawnP2, 5=powerup

def _build_map_cells(layout: list) -> str:
    """Encode une liste de cellules en base64 JSON comme le fait Unity."""
    data = {"cells": layout, "width": 16, "height": 12, "title": "", "description": ""}
    return base64.b64encode(json.dumps(data).encode()).decode()


def _make_ranked_map():
    """Map Ranked : arène symétrique avec obstacles centraux."""
    cells = []
    # Murs extérieurs
    for x in range(16):
        cells += [{"x": x, "y": 0, "type": 1}, {"x": x, "y": 11, "type": 1}]
    for y in range(1, 11):
        cells += [{"x": 0, "y": y, "type": 1}, {"x": 15, "y": y, "type": 1}]
    # Sol
    for y in range(1, 11):
        for x in range(1, 15):
            cells.append({"x": x, "y": y, "type": 2})
    # Obstacles centraux symétriques
    for y in range(4, 8):
        cells += [{"x": 5, "y": y, "type": 1}, {"x": 10, "y": y, "type": 1}]
    for x in range(6, 10):
        cells += [{"x": x, "y": 3, "type": 1}, {"x": x, "y": 8, "type": 1}]
    # Spawns
    cells += [{"x": 2, "y": 2, "type": 3}, {"x": 13, "y": 9, "type": 4}]
    # Powerups
    cells += [{"x": 7, "y": 5, "type": 5}, {"x": 8, "y": 6, "type": 5}]
    return cells


def _make_unranked_map():
    """Map Unranked : couloirs en labyrinthe."""
    cells = []
    for x in range(16):
        cells += [{"x": x, "y": 0, "type": 1}, {"x": x, "y": 11, "type": 1}]
    for y in range(1, 11):
        cells += [{"x": 0, "y": y, "type": 1}, {"x": 15, "y": y, "type": 1}]
    for y in range(1, 11):
        for x in range(1, 15):
            cells.append({"x": x, "y": y, "type": 2})
    # Murs labyrinthe
    for y in range(2, 6):
        cells.append({"x": 4, "y": y, "type": 1})
    for y in range(6, 10):
        cells.append({"x": 11, "y": y, "type": 1})
    for x in range(4, 9):
        cells.append({"x": x, "y": 6, "type": 1})
    for x in range(7, 12):
        cells.append({"x": x, "y": 4, "type": 1})
    # Spawns
    cells += [{"x": 2, "y": 2, "type": 3}, {"x": 13, "y": 9, "type": 4}]
    # Powerups
    cells += [
        {"x": 2, "y": 9, "type": 5},
        {"x": 13, "y": 2, "type": 5},
        {"x": 7, "y": 7, "type": 5},
    ]
    return cells


def _make_fun_map():
    """Map Fun : grande arène ouverte avec îlots."""
    cells = []
    for x in range(16):
        cells += [{"x": x, "y": 0, "type": 1}, {"x": x, "y": 11, "type": 1}]
    for y in range(1, 11):
        cells += [{"x": 0, "y": y, "type": 1}, {"x": 15, "y": y, "type": 1}]
    for y in range(1, 11):
        for x in range(1, 15):
            cells.append({"x": x, "y": y, "type": 2})
    # Petits îlots
    for coord in [(3, 3), (3, 4), (12, 7), (12, 8),
                  (7, 2), (8, 2), (7, 9), (8, 9)]:
        cells.append({"x": coord[0], "y": coord[1], "type": 1})
    # Spawns
    cells += [{"x": 2, "y": 2, "type": 3}, {"x": 13, "y": 9, "type": 4}]
    # Beaucoup de powerups
    cells += [
        {"x": 5,  "y": 5,  "type": 5},
        {"x": 10, "y": 6,  "type": 5},
        {"x": 7,  "y": 3,  "type": 5},
        {"x": 8,  "y": 8,  "type": 5},
        {"x": 3,  "y": 8,  "type": 5},
        {"x": 12, "y": 3,  "type": 5},
    ]
    return cells


def ensure_default_maps():
    """Crée les 3 maps par défaut si elles n'existent pas encore."""
    from app.models.map import Map
    from app.models.matchmaking_settings import MatchmakingSettings

    db = SessionLocal()
    try:
        maps_config = [
            ("ranked",   "Arène Ranked",   _make_ranked_map()),
            ("unranked", "Labyrinthe",      _make_unranked_map()),
            ("fun",      "Îles Fun",        _make_fun_map()),
        ]

        settings = db.query(MatchmakingSettings).first()
        if not settings:
            settings = MatchmakingSettings()
            db.add(settings)
            db.commit()
            db.refresh(settings)

        for mode, title, cells in maps_config:
            field = f"{mode}_default_map_id"
            existing_id = getattr(settings, field, None)

            # Vérifier si la map existe encore
            if existing_id:
                existing_map = db.query(Map).filter(Map.id == existing_id).first()
                if existing_map:
                    continue  # déjà créée

            # Créer la map
            new_map = Map(
                title=title,
                description=f"Map par défaut pour le mode {mode}",
                status="published",
                content_url=_build_map_cells(cells),
                hidden=False,
                featured=True,
            )
            db.add(new_map)
            db.commit()
            db.refresh(new_map)

            setattr(settings, field, new_map.id)
            db.commit()

    finally:
        db.close()


def ensure_schema():
    inspector = inspect(engine)

    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}

    alter_statements = {
        "is_active":                "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE",
        "avatar_url":               "ALTER TABLE users ADD COLUMN avatar_url TEXT",
        "bio":                      "ALTER TABLE users ADD COLUMN bio TEXT",
        "region":                   "ALTER TABLE users ADD COLUMN region VARCHAR",
        "language":                 "ALTER TABLE users ADD COLUMN language VARCHAR",
        "matchmaking_preferences":  "ALTER TABLE users ADD COLUMN matchmaking_preferences TEXT",
        "player_status":            "ALTER TABLE users ADD COLUMN player_status VARCHAR NOT NULL DEFAULT 'online'",
        "ranked_elo":               "ALTER TABLE users ADD COLUMN ranked_elo INTEGER NOT NULL DEFAULT 1000",
        "unranked_elo":             "ALTER TABLE users ADD COLUMN unranked_elo INTEGER NOT NULL DEFAULT 1000",
        "fun_elo":                  "ALTER TABLE users ADD COLUMN fun_elo INTEGER NOT NULL DEFAULT 1000",
        "xp":                       "ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0",
        "level":                    "ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1",
        "soft_currency":            "ALTER TABLE users ADD COLUMN soft_currency INTEGER NOT NULL DEFAULT 0",
        "hard_currency":            "ALTER TABLE users ADD COLUMN hard_currency INTEGER NOT NULL DEFAULT 0",
        "equipped_avatar_frame":    "ALTER TABLE users ADD COLUMN equipped_avatar_frame VARCHAR",
        "equipped_title":           "ALTER TABLE users ADD COLUMN equipped_title VARCHAR",
    }

    with engine.begin() as connection:
        for column_name, statement in alter_statements.items():
            if column_name not in user_columns:
                connection.execute(text(statement))

    if "queue_players" in inspector.get_table_names():
        queue_columns = {column["name"] for column in inspector.get_columns("queue_players")}
        if "mode" not in queue_columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE queue_players ADD COLUMN mode VARCHAR NOT NULL DEFAULT 'ranked'")
                )

    if "matches" in inspector.get_table_names():
        match_columns = {column["name"] for column in inspector.get_columns("matches")}
        match_alter_statements = {
            "map_id":            "ALTER TABLE matches ADD COLUMN map_id INTEGER",
            "mode":              "ALTER TABLE matches ADD COLUMN mode VARCHAR NOT NULL DEFAULT 'ranked'",
            "finished_at":       "ALTER TABLE matches ADD COLUMN finished_at TIMESTAMP NULL",
            "duration_seconds":  "ALTER TABLE matches ADD COLUMN duration_seconds INTEGER",
            "player1_elo_change":"ALTER TABLE matches ADD COLUMN player1_elo_change INTEGER NOT NULL DEFAULT 0",
            "player2_elo_change":"ALTER TABLE matches ADD COLUMN player2_elo_change INTEGER NOT NULL DEFAULT 0",
            "player1_xp_gain":   "ALTER TABLE matches ADD COLUMN player1_xp_gain INTEGER NOT NULL DEFAULT 0",
            "player2_xp_gain":   "ALTER TABLE matches ADD COLUMN player2_xp_gain INTEGER NOT NULL DEFAULT 0",
        }
        with engine.begin() as connection:
            for column_name, statement in match_alter_statements.items():
                if column_name not in match_columns:
                    connection.execute(text(statement))

    if "maps" in inspector.get_table_names():
        map_columns = {column["name"] for column in inspector.get_columns("maps")}
        map_alter_statements = {
            "content_url":      "ALTER TABLE maps ADD COLUMN content_url TEXT",
            "screenshot_urls":  "ALTER TABLE maps ADD COLUMN screenshot_urls TEXT",
            "tests_count":      "ALTER TABLE maps ADD COLUMN tests_count INTEGER NOT NULL DEFAULT 0",
            "retention_score":  "ALTER TABLE maps ADD COLUMN retention_score FLOAT NOT NULL DEFAULT 0",
            "featured":         "ALTER TABLE maps ADD COLUMN featured BOOLEAN NOT NULL DEFAULT FALSE",
            "hidden":           "ALTER TABLE maps ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE",
            "featured_at":      "ALTER TABLE maps ADD COLUMN featured_at TIMESTAMP NULL",
            "last_updated_at":  "ALTER TABLE maps ADD COLUMN last_updated_at TIMESTAMP NOT NULL DEFAULT NOW()",
            "last_tested_at":   "ALTER TABLE maps ADD COLUMN last_tested_at TIMESTAMP NULL",
        }
        with engine.begin() as connection:
            for column_name, statement in map_alter_statements.items():
                if column_name not in map_columns:
                    connection.execute(text(statement))

    if "matchmaking_settings" in inspector.get_table_names():
        mm_columns = {column["name"] for column in inspector.get_columns("matchmaking_settings")}
        mm_alter_statements = {
            "ranked_default_map_id":   "ALTER TABLE matchmaking_settings ADD COLUMN ranked_default_map_id INTEGER",
            "unranked_default_map_id": "ALTER TABLE matchmaking_settings ADD COLUMN unranked_default_map_id INTEGER",
            "fun_default_map_id":      "ALTER TABLE matchmaking_settings ADD COLUMN fun_default_map_id INTEGER",
        }
        with engine.begin() as connection:
            for column_name, statement in mm_alter_statements.items():
                if column_name not in mm_columns:
                    connection.execute(text(statement))


def ensure_modes_enabled():
    from app.models.matchmaking_settings import MatchmakingSettings
    db = SessionLocal()
    try:
        settings = db.query(MatchmakingSettings).first()
        if settings:
            settings.ranked_enabled   = True
            settings.unranked_enabled = True
            settings.fun_enabled      = True
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()