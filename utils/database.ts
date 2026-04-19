import * as SQLite from 'expo-sqlite';

const DB_NAME = 'aequor_nav.db';

export interface DBRoute {
  id: number;
  origin_id: string;
  dest_id: string;
  start_time: string;
  vessel_speed: number;
  is_active: number;
  created_at: string;
}

export interface DBWaypoint {
  id: number;
  route_id: number;
  latitude: number;
  longitude: number;
  eta_hours: number;
  weather_json: string; // Serialized WeatherData
}

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase() {
  if (db) return db;
  
  db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Create tables
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin_id TEXT NOT NULL,
      dest_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      vessel_speed REAL NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS route_waypoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      eta_hours REAL NOT NULL,
      weather_json TEXT,
      FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE
    );
  `);
  
  return db;
}

export async function setActiveRoute(routeId: number) {
  const database = await initDatabase();
  await database.withTransactionAsync(async () => {
    await database.runAsync('UPDATE routes SET is_active = 0');
    await database.runAsync('UPDATE routes SET is_active = 1 WHERE id = ?', [routeId]);
  });
}

export async function saveRoute(
  originId: string,
  destId: string,
  startTime: string,
  speed: number,
  waypoints: Omit<DBWaypoint, 'id' | 'route_id'>[]
) {
  const database = await initDatabase();
  
  return await database.withTransactionAsync(async () => {
    // 1. Deactivate other routes
    await database.runAsync('UPDATE routes SET is_active = 0');
    
    // 2. Insert new route
    const routeResult = await database.runAsync(
      'INSERT INTO routes (origin_id, dest_id, start_time, vessel_speed, is_active) VALUES (?, ?, ?, ?, 1)',
      [originId, destId, startTime, speed]
    );
    const routeId = routeResult.lastInsertRowId;
    
    // 3. Insert waypoints
    for (const wp of waypoints) {
      await database.runAsync(
        'INSERT INTO route_waypoints (route_id, latitude, longitude, eta_hours, weather_json) VALUES (?, ?, ?, ?, ?)',
        [routeId, wp.latitude, wp.longitude, wp.eta_hours, wp.weather_json]
      );
    }
    
    return routeId;
  });
}

export async function getActiveRoute() {
  const database = await initDatabase();
  const route = await database.getFirstAsync<DBRoute>('SELECT * FROM routes WHERE is_active = 1 LIMIT 1');
  if (!route) return null;
  
  const waypoints = await database.getAllAsync<DBWaypoint>(
    'SELECT * FROM route_waypoints WHERE route_id = ? ORDER BY id ASC',
    [route.id]
  );
  
  return { ...route, waypoints };
}

export async function deleteRoute(routeId: number) {
  const database = await initDatabase();
  await database.runAsync('DELETE FROM routes WHERE id = ?', [routeId]);
}
