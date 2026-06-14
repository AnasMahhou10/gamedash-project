from sqlalchemy import Boolean, Column, Integer, event
from sqlalchemy.orm import Session

from app.database import Base


class MatchmakingSettings(Base):
    __tablename__ = "matchmaking_settings"

    id = Column(Integer, primary_key=True, index=True)
    max_elo_gap = Column(Integer, default=150)
    max_wait_seconds = Column(Integer, default=45)
    team_size = Column(Integer, default=1)
    ranked_enabled = Column(Boolean, default=True)
    unranked_enabled = Column(Boolean, default=True)
    fun_enabled = Column(Boolean, default=True)

    # Map par défaut associée à chaque mode (nullable = utilise la sélection automatique)
    ranked_default_map_id = Column(Integer, nullable=True)
    unranked_default_map_id = Column(Integer, nullable=True)
    fun_default_map_id = Column(Integer, nullable=True)