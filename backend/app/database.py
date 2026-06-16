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


def _build_map_cells(layout: list) -> str:
    data = {"cells": layout, "width": 16, "height": 12, "title": "", "description": ""}
    return base64.b64encode(json.dumps(data).encode()).decode()


def _make_ranked_map():
    """
    Map Ranked : arène symétrique.
    Les zones or (7,5) et (8,6) sont accessibles par des passages
    de 2 cases minimum de chaque côté (haut, bas, gauche, droite).
    
    Disposition des murs intérieurs :
    - Colonnes verticales x=5 et x=10, de y=3 à y=8
    - Pas de barre horizontale fermée — passages libres en haut (y=3)
      et en bas (y=8) entre x=6 et x=9
    """
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
    # Colonnes verticales gauche et droite (passages de 2 cases entre elles)
    for y in range(3, 9):
        cells.append({"x": 5, "y": y, "type": 1})
        cells.append({"x": 10, "y": y, "type": 1})
    # Spawns
    cells += [{"x": 2, "y": 2, "type": 3}, {"x": 13, "y": 9, "type": 4}]
    # Zones or au centre — accessibles par passages de 4 cases (x=6 à x=9)
    cells += [{"x": 7, "y": 5, "type": 5}, {"x": 8, "y": 6, "type": 5}]
    return cells


def _make_unranked_map():
    """
    Map Unranked : labyrinthe avec couloirs en L.
    Les zones or sont placées dans des espaces ouverts,
    accessibles par des passages droits d'au moins 2 cases.
    """
    cells = []
    for x in range(16):
        cells += [{"x": x, "y": 0, "type": 1}, {"x": x, "y": 11, "type": 1}]
    for y in range(1, 11):
        cells += [{"x": 0, "y": y, "type": 1}, {"x": 15, "y": y, "type": 1}]
    for y in range(1, 11):
        for x in range(1, 15):
            cells.append({"x": x, "y": y, "type": 2})
    # Mur vertical gauche (couloir en L)
    for y in range(2, 7):
        cells.append({"x": 4, "y": y, "type": 1})
    # Mur vertical droit
    for y in range(5, 10):
        cells.append({"x": 11, "y": y, "type": 1})
    # Barre horizontale haute — laisse 2 cases libres à gauche (x=1,2,3)
    # et 2 cases libres à droite (x=12,13,14)
    for x in range(5, 10):
        cells.append({"x": x, "y": 4, "type": 1})
    # Barre horizontale basse — laisse 2 cases libres de chaque côté
    for x in range(5, 10):
        cells.append({"x": x, "y": 7, "type": 1})
    # Spawns
    cells += [{"x": 2, "y": 2, "type": 3}, {"x": 13, "y": 9, "type": 4}]
    # Zones or dans des espaces ouverts — pas entourées de murs
    cells += [
        {"x": 2,  "y": 9, "type": 5},   # coin bas gauche — espace libre
        {"x": 13, "y": 2, "type": 5},   # coin haut droit — espace libre
        {"x": 7,  "y": 6, "type": 5},   # centre — entre les 2 barres horizontales
    ]
    return cells


def _make_fun_map():
    """
    Map Fun : grande arène ouverte avec petits îlots.
    Les zones or sont toutes en plein espace ouvert,
    jamais adjacentes à 2 murs en diagonale.
    """
    cells = []
    for x in range(16):
        cells += [{"x": x, "y": 0, "type": 1}, {"x": x, "y": 11, "type": 1}]
    for y in range(1, 11):
        cells += [{"x": 0, "y": y, "type": 1}, {"x": 15, "y": y, "type": 1}]
    for y in range(1, 11):
        for x in range(1, 15):
            cells.append({"x": x, "y": y, "type": 2})
    # Îlots isolés — espacés pour ne jamais former de passage diagonal
    for coord in [
        (3, 3), (3, 4),    # îlot haut gauche
        (12, 7), (12, 8),  # îlot bas droit
        (7, 1), (8, 1),    # îlot haut centre (bord)
        (7, 10), (8, 10),  # îlot bas centre (bord)
    ]:
        cells.append({"x": coord[0], "y": coord[1], "type": 1})
    # Spawns
    cells += [{"x": 2, "y": 2, "type": 3}, {"x": 13, "y": 9, "type": 4}]
    # Zones or toutes en espace ouvert, loin des murs
    cells += [
        {"x": 5,  "y": 5,  "type": 5},
        {"x": 10, "y": 6,  "type": 5},
        {"x": 5,  "y": 8,  "type": 5},
        {"x": 10, "y": 3,  "type": 5},
        {"x": 3,  "y": 7,  "type": 5},
        {"x": 12, "y": 4,  "type": 5},
    ]
    return cells


def ensure_default_maps():
    """
    Crée ou met à jour les 3 maps par défaut.
    Si une map existe déjà, son contenu est mis à jour
    pour refléter les corrections de disposition.
    """
    from app.models.map import Map
    from app.models.matchmaking_settings import MatchmakingSettings

    db = SessionLocal()
    try:
        maps_config = [
            ("ranked",   "Arène Ranked", _make_ranked_map()),
            ("unranked", "Labyrinthe",   _make_unranked_map()),
            ("fun",      "Îles Fun",     _make_fun_map()),
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

            if existing_id:
                existing_map = db.query(Map).filter(Map.id == existing_id).first()
                if existing_map:
                    # ── Mettre à jour le contenu même si la map existe ──
                    existing_map.content_url = _build_map_cells(cells)
                    db.commit()
                    continue

            # Créer la map si elle n'existe pas
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
            "map_id":             "ALTER TABLE matches ADD COLUMN map_id INTEGER",
            "mode":               "ALTER TABLE matches ADD COLUMN mode VARCHAR NOT NULL DEFAULT 'ranked'",
            "finished_at":        "ALTER TABLE matches ADD COLUMN finished_at TIMESTAMP NULL",
            "duration_seconds":   "ALTER TABLE matches ADD COLUMN duration_seconds INTEGER",
            "player1_elo_change": "ALTER TABLE matches ADD COLUMN player1_elo_change INTEGER NOT NULL DEFAULT 0",
            "player2_elo_change": "ALTER TABLE matches ADD COLUMN player2_elo_change INTEGER NOT NULL DEFAULT 0",
            "player1_xp_gain":    "ALTER TABLE matches ADD COLUMN player1_xp_gain INTEGER NOT NULL DEFAULT 0",
            "player2_xp_gain":    "ALTER TABLE matches ADD COLUMN player2_xp_gain INTEGER NOT NULL DEFAULT 0",
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