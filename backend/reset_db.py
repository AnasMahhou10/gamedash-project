from sqlalchemy import text

from app.database import engine


def reset_database():
    statements = [
        "UPDATE matches SET status = 'finished' WHERE status = 'ongoing'",
        "UPDATE users SET player_status = 'online'",
        "DELETE FROM queue_players",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

    print("Database reset complete.")


if __name__ == "__main__":
    reset_database()
