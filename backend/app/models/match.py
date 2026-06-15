from sqlalchemy import Column, Integer, ForeignKey, DateTime, String
from datetime import datetime
from app.database import Base

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    player1_id = Column(Integer, ForeignKey("users.id"))
    player2_id = Column(Integer, ForeignKey("users.id"))
    map_id = Column(Integer, ForeignKey("maps.id"), nullable=True)
    mode = Column(String, default="ranked")

    status = Column(String, default="pending")  # pending / ongoing / finished
    winner_id = Column(Integer, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    player1_elo_change = Column(Integer, default=0)
    player2_elo_change = Column(Integer, default=0)
    player1_xp_gain = Column(Integer, default=0)
    player2_xp_gain = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
