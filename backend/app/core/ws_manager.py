class ConnectionManager:
    def __init__(self):
        self.active_connections = {}  # user_id -> websocket

    async def connect(self, user_id, websocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_to_user(self, user_id, data):
        ws = self.active_connections.get(user_id)
        if ws:
            await ws.send_json(data)

    async def broadcast(self, data):
        stale_users = []

        for user_id, ws in self.active_connections.items():
            try:
                await ws.send_json(data)
            except Exception:
                stale_users.append(user_id)

        for user_id in stale_users:
            self.disconnect(user_id)

    async def broadcast_stats(self):
        await self.broadcast(
            {
                "type": "stats",
                "players": len(self.active_connections),
            }
        )


manager = ConnectionManager()
