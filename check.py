import psycopg2
import json

conn = psycopg2.connect('dbname=zahi_connect_db user=postgres password=postgres host=localhost')
cur = conn.cursor()
cur.execute("SELECT payload FROM hotel_documents WHERE collection = 'rooms'")
rows = cur.fetchall()
for r in rows:
    room = r[0]
    num = room.get('roomNumber')
    urls = room.get('imageUrls', [])
    if urls:
        print(f"Room {num} has {len(urls)} images")
