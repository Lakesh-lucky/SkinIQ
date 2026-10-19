import pymysql
import sys

def setup_mysql():
    print("Testing connection to XAMPP MySQL...")
    passwords_to_try = ['', 'root', 'admin', 'password']
    connected_pwd = None
    
    for pwd in passwords_to_try:
        try:
            conn = pymysql.connect(host='localhost', port=3306, user='root', password=pwd, connect_timeout=5)
            connected_pwd = pwd
            print(f"[PASS] Successfully connected to XAMPP MySQL with user='root', password='{pwd}'")
            with conn.cursor() as cursor:
                cursor.execute("CREATE DATABASE IF NOT EXISTS dermaclass_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                cursor.execute("SHOW DATABASES;")
                dbs = [row[0] for row in cursor.fetchall()]
                print(f"[PASS] Databases in MySQL: {dbs}")
                if "dermaclass_db" in dbs:
                    print("[PASS] Database 'dermaclass_db' successfully verified!")
            conn.close()
            break
        except Exception as e:
            print(f"Failed with password '{pwd}': {e}")

    if connected_pwd is None:
        print("[ERROR] Could not connect to MySQL on localhost:3306. Is XAMPP MySQL running?")
        sys.exit(1)

    print(f"RECOMMENDED_DATABASE_URL=mysql+pymysql://root:{connected_pwd}@localhost:3306/dermaclass_db")
    return connected_pwd

if __name__ == "__main__":
    setup_mysql()
