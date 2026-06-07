# backend/test_endpoints.py
import json, time, base64, urllib.request, urllib.error

API = "http://127.0.0.1:8000"

def post(path, data, token=None):
    url = API + path
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, method='POST', headers={'Content-Type':'application/json'})
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.getcode(), resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return None, str(e)

def get(path, token=None):
    url = API + path
    req = urllib.request.Request(url, method='GET', headers={'Content-Type':'application/json'})
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.getcode(), resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return None, str(e)

if __name__ == '__main__':
    ts = str(int(time.time()))
    email_a = f"testA{ts}@example.com"
    email_b = f"testB{ts}@example.com"
    pwd = "Password123!"

    print("Register user A...")
    print(post("/auth/register", {"email": email_a, "password": pwd, "pseudo":"testerA"}))
    print("Register user B...")
    print(post("/auth/register", {"email": email_b, "password": pwd, "pseudo":"testerB"}))

    print("Login A...")
    code, body = post("/auth/login", {"email": email_a, "password": pwd})
    print(code, body)
    tokenA = None
    try:
        tokenA = json.loads(body)['access_token']
    except: pass

    print("Login B...")
    code, body = post("/auth/login", {"email": email_b, "password": pwd})
    print(code, body)
    tokenB = None
    try:
        tokenB = json.loads(body)['access_token']
    except: pass

    # get profile ids
    _, meA = get("/auth/me", tokenA)
    uidA = json.loads(meA).get('id') if meA and tokenA else None
    _, meB = get("/auth/me", tokenB)
    uidB = json.loads(meB).get('id') if meB and tokenB else None
    print("A id:", uidA, "B id:", uidB)

    # Join queue both users to form match
    print("A join queue:", post("/matchmaking/join", {"mode":"ranked"}, tokenA))
    print("B join queue:", post("/matchmaking/join", {"mode":"ranked"}, tokenB))

    # poll current match for A
    match = None
    for i in range(15):
        code, body = get("/matchmaking/current", tokenA)
        try:
            obj = json.loads(body)
            if obj.get("match"):
                match = obj["match"]
                break
        except:
            pass
        time.sleep(1)
    print("match:", match)

    if match:
        match_id = match.get("match_id")
        # declare A as winner
        print("POST result (record elo):", post(f"/matchmaking/result?match_id={match_id}&winner_id={uidA}", {}, tokenA))
        print("POST finish (expect mmr_change/xp/coins):")
        code, body = post(f"/matchmaking/finish?match_id={match_id}&winner_id={uidA}", {}, tokenA)
        print(code, body)

    # Create a map and test /maps/test
    sample_map = {"name":"auto","description":"x","width":8,"height":6,"cells":[{"x":0,"y":0,"type":1}]}
    b64 = base64.b64encode(json.dumps(sample_map).encode('utf-8')).decode('utf-8')
    create_payload = {"title":"AutoMap","description":"desc","status":"draft","content_url": b64, "tags":[]}
    print("Create map:", post("/maps/", create_payload, tokenA))
    # parse map_id
    map_id = None
    # try to get user's maps
    code, body = get("/maps/mine", tokenA)
    try:
        items = json.loads(body)
        if isinstance(items, list) and len(items)>0:
            map_id = items[0].get("id")
    except:
        pass
    print("map_id:", map_id)
    if map_id:
        print("Mark map test:", post("/maps/test", {"map_id": map_id, "duration_seconds": 120, "completion_rate": 1.0}, tokenA))

    print("Done.")
