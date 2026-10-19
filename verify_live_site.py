"""
Verify Live Server Delivery & Endpoints over HTTP
"""
import urllib.request
import json
import re

BASE_URL = "http://localhost:8000"

def test_live_site():
    print("=" * 60)
    print("TESTING LIVE SERVER DEPLOYMENT ON PORT 8000")
    print("=" * 60)

    # 1. Fetch Root HTML
    print("\n1. Fetching Root SPA HTML...")
    req = urllib.request.urlopen(f"{BASE_URL}/")
    assert req.status == 200, f"Expected 200, got {req.status}"
    html = req.read().decode("utf-8")
    print(f"   [OK] Root HTML fetched successfully ({len(html)} bytes)")
    assert "<title>" in html
    assert "DermaClass" in html or "Skin Cancer" in html or "root" in html

    # 2. Extract and verify all static bundle assets
    print("\n2. Verifying Static Assets Delivery...")
    asset_urls = re.findall(r'/(assets/[^"\'>\s]+)', html)
    print(f"   Discovered {len(asset_urls)} bundled assets in index.html:")
    for a in asset_urls:
        url = f"{BASE_URL}/{a}"
        res = urllib.request.urlopen(url)
        content = res.read()
        print(f"   [OK] HTTP {res.status} | {a} ({len(content)} bytes)")
        assert res.status == 200

    # 3. Test API Health
    print("\n3. Testing /api/v1/health...")
    res = urllib.request.urlopen(f"{BASE_URL}/api/v1/health")
    health = json.loads(res.read().decode("utf-8"))
    print(f"   [OK] Health: {health['status']}")
    print(f"   - Model: {health['model']}")
    print(f"   - Centroid: {health['centroid']}")
    assert health['status'] == 'healthy'
    assert health['model'] == 'loaded'

    # 4. Test Model Info
    print("\n4. Testing /api/v1/model/info...")
    res = urllib.request.urlopen(f"{BASE_URL}/api/v1/model/info")
    model_info = json.loads(res.read().decode("utf-8"))
    print(f"   [OK] Model Name: {model_info['model_name']}")
    print(f"   - Classes: {model_info['classes']}")
    assert len(model_info['classes']) == 8

    # 5. Test Doctor Sign In
    print("\n5. Testing Doctor Sign In API...")
    login_data = json.dumps({
        "email": "dr.evelyn.vance@dermaclass.med",
        "password": "Doctor@2026"
    }).encode("utf-8")
    login_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/auth/login",
        data=login_data,
        headers={"Content-Type": "application/json"}
    )
    login_res = urllib.request.urlopen(login_req)
    auth = json.loads(login_res.read().decode("utf-8"))
    token = auth["access_token"]
    print(f"   [OK] Doctor Authenticated: {auth['user']['full_name']} ({auth['user']['role']})")
    assert auth["user"]["role"] == "DOCTOR"

    # 6. Test Doctor Patient Roster
    print("\n6. Testing Patient Roster API...")
    roster_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/patients",
        headers={"Authorization": f"Bearer {token}"}
    )
    roster_res = urllib.request.urlopen(roster_req)
    roster = json.loads(roster_res.read().decode("utf-8"))
    print(f"   [OK] Found {len(roster.get('patients', []))} registered patients in database.")

    # 7. Test Admin Metrics
    print("\n7. Testing Admin Sign In & Metrics API...")
    admin_data = json.dumps({
        "email": "admin@dermaclass.med",
        "password": "Admin@2026"
    }).encode("utf-8")
    admin_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/auth/login",
        data=admin_data,
        headers={"Content-Type": "application/json"}
    )
    admin_res = urllib.request.urlopen(admin_req)
    admin_auth = json.loads(admin_res.read().decode("utf-8"))
    admin_token = admin_auth["access_token"]
    print(f"   [OK] Admin Authenticated: {admin_auth['user']['role']}")

    stats_req = urllib.request.Request(
        f"{BASE_URL}/api/v1/admin/stats",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    stats_res = urllib.request.urlopen(stats_req)
    stats = json.loads(stats_res.read().decode("utf-8"))["stats"]
    print(f"   [OK] Live Stats: {stats['total_users']} users, {stats['total_patients']} patients, {stats['total_scans']} scans")

    print("\n" + "=" * 60)
    print("ALL LIVE NETWORK CHECKS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    test_live_site()
