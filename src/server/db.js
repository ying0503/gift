import mysql from 'mysql2/promise'
import crypto from 'crypto'

let pool

export async function getPool() {
  if (pool) return pool
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gift_album',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  return pool
}

export async function initSchema() {
  const p = await getPool()
  await p.query(`CREATE TABLE IF NOT EXISTS users (
    email VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS albums (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(64),
    batch_id VARCHAR(36),
    image_url TEXT,
    image_urls JSON,
    config JSON,
    prompt TEXT,
    prompts JSON,
    product_count INT DEFAULT 0,
    banner TINYINT(1) DEFAULT 0,
    created_at BIGINT NOT NULL
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS tasks (
    task_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    config JSON,
    prompt TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    image_url TEXT,
    status_text TEXT,
    product_count INT DEFAULT 0,
    maiziai_task_id VARCHAR(64),
    created_at BIGINT NOT NULL
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS batches (
    batch_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    task_ids JSON,
    config JSON,
    prompts JSON,
    created_at BIGINT NOT NULL,
    done TINYINT(1) DEFAULT 0
  )`)
  try { await p.query('DROP TABLE IF EXISTS public_album_data') } catch (e) {}
  const [triggers] = await p.query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE EVENT_OBJECT_TABLE = 'digital_albums'")
  for (const t of triggers) {
    await p.query(`DROP TRIGGER IF EXISTS \`${t.TRIGGER_NAME}\``)
  }
  try {
    const [cols] = await p.query('SHOW COLUMNS FROM digital_albums WHERE Field = "id"')
    if (cols.length === 0) {
      await p.query(`CREATE TABLE digital_albums_new (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        categories JSON,
        banner_url TEXT,
        banner_title TEXT,
        banner_subtitle TEXT,
        updated_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (id, user_id)
      )`)
      await p.query('INSERT INTO digital_albums_new (id, user_id, categories, banner_url, banner_title, banner_subtitle, updated_at, created_at) SELECT UUID(), user_id, categories, banner_url, banner_title, banner_subtitle, updated_at, UNIX_TIMESTAMP()*1000 FROM digital_albums')
      await p.query('DROP TABLE digital_albums')
      await p.query('RENAME TABLE digital_albums_new TO digital_albums')
    }
    const [oldCol] = await p.query("SHOW COLUMNS FROM digital_albums WHERE Field = 'album_title'")
    if (oldCol.length > 0) {
      await p.query('ALTER TABLE digital_albums CHANGE COLUMN album_title banner_title TEXT')
    }
  } catch (e) {
    await p.query(`CREATE TABLE IF NOT EXISTS digital_albums (
      id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      categories JSON,
      banner_url TEXT,
      banner_title TEXT,
      banner_subtitle TEXT,
      updated_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (id, user_id)
    )`)
  }
  await p.query(`CREATE TABLE IF NOT EXISTS user_albums (
    user_id VARCHAR(36) NOT NULL,
    album_id VARCHAR(36) NOT NULL,
    position INT NOT NULL,
    PRIMARY KEY (user_id, album_id)
  )`)
  try {
    await p.query(`ALTER TABLE users ADD COLUMN vip_type VARCHAR(20) DEFAULT NULL`)
  } catch (e) {}
}

export async function getUser(email) {
  const p = await getPool()
  const [rows] = await p.query('SELECT email, user_id, password_hash, vip_type, created_at FROM users WHERE email = ?', [email])
  return rows[0] || null
}

export async function createUser(email, userId, passwordHash, vipType) {
  const p = await getPool()
  await p.query('INSERT INTO users (email, user_id, password_hash, vip_type, created_at) VALUES (?, ?, ?, ?, ?)',
    [email, userId, passwordHash, vipType || null, Date.now()])
}

export async function getSession(token) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM sessions WHERE token = ? AND expires_at > ?', [token, Date.now()])
  return rows[0] || null
}

export async function createSession(token, userId, email) {
  const p = await getPool()
  const now = Date.now()
  await p.query('INSERT INTO sessions (token, user_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    [token, userId, email, now, now + 86400 * 7 * 1000])
}

export async function deleteSession(token) {
  const p = await getPool()
  await p.query('DELETE FROM sessions WHERE token = ?', [token])
}

export async function createAlbum(album) {
  const p = await getPool()
  const imageUrls = album.imageUrls ? (Array.isArray(album.imageUrls) ? JSON.stringify(album.imageUrls) : album.imageUrls) : null
  const config = album.config ? (typeof album.config === 'object' ? JSON.stringify(album.config) : album.config) : null
  const prompts = album.prompts ? (Array.isArray(album.prompts) ? JSON.stringify(album.prompts) : album.prompts) : null
  await p.query(`INSERT INTO albums (id, user_id, task_id, batch_id, image_url, image_urls, config, prompt, prompts, product_count, banner, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [album.id, album.userId, album.taskId || null, album.batchId || null,
     album.imageUrl || null, imageUrls, config, album.prompt || null,
     prompts, album.productCount || 0, album.banner ? 1 : 0, album.createdAt])
}

export async function getAlbum(id) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM albums WHERE id = ?', [id])
  return rows[0] ? rowToAlbum(rows[0]) : null
}

export async function deleteAlbum(albumId, userId) {
  const p = await getPool()
  await p.query('DELETE FROM user_albums WHERE album_id = ? AND user_id = ?', [albumId, userId])
  await p.query('DELETE FROM albums WHERE id = ?', [albumId])
}

export async function addUserAlbum(userId, albumId) {
  const p = await getPool()
  const [rows] = await p.query('SELECT COUNT(*) as cnt FROM user_albums WHERE user_id = ?', [userId])
  const pos = rows[0].cnt
  await p.query('INSERT IGNORE INTO user_albums (user_id, album_id, position) VALUES (?, ?, ?)', [userId, albumId, pos])
}

export async function getUserAlbumsWithBatch(userId) {
  const p = await getPool()
  const [rows] = await p.query(
    `SELECT a.* FROM albums a JOIN user_albums ua ON a.id = ua.album_id
     WHERE ua.user_id = ? AND a.batch_id IS NOT NULL ORDER BY ua.position ASC`, [userId])
  return rows.map(rowToAlbum)
}

function rowToAlbum(row) {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    batchId: row.batch_id,
    imageUrl: row.image_url,
    imageUrls: row.image_urls ? (typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : row.image_urls) : null,
    config: row.config ? (typeof row.config === 'string' ? JSON.parse(row.config) : row.config) : null,
    prompt: row.prompt,
    prompts: row.prompts ? (typeof row.prompts === 'string' ? JSON.parse(row.prompts) : row.prompts) : null,
    productCount: row.product_count,
    banner: !!row.banner,
    createdAt: row.created_at,
  }
}

export async function createTask(task) {
  const p = await getPool()
  const config = task.config ? JSON.stringify(task.config) : null
  await p.query(`INSERT INTO tasks (task_id, user_id, config, prompt, status, image_url, status_text, product_count, maiziai_task_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.taskId, task.userId, config, task.prompt || null,
     task.status || 'PENDING', task.imageUrl || null, task.statusText || null,
     task.productCount || 0, task.maiziaiTaskId || null, task.createdAt])
}

export async function getTask(taskId) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM tasks WHERE task_id = ?', [taskId])
  if (!rows[0]) return null
  const r = rows[0]
  return {
    taskId: r.task_id, userId: r.user_id,
    config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : null, prompt: r.prompt,
    status: r.status, imageUrl: r.image_url, statusText: r.status_text,
    productCount: r.product_count, maiziaiTaskId: r.maiziai_task_id, createdAt: r.created_at,
  }
}

export async function updateTask(taskId, updates) {
  const p = await getPool()
  const fields = []; const values = []
  if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
  if (updates.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(updates.imageUrl) }
  if (updates.statusText !== undefined) { fields.push('status_text = ?'); values.push(updates.statusText) }
  if (fields.length) { values.push(taskId); await p.query(`UPDATE tasks SET ${fields.join(', ')} WHERE task_id = ?`, values) }
}

export async function createBatch(batch) {
  const p = await getPool()
  const config = batch.config ? JSON.stringify(batch.config) : null
  await p.query(`INSERT INTO batches (batch_id, user_id, task_ids, config, prompts, created_at, done)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [batch.batchId, batch.userId, JSON.stringify(batch.taskIds || []),
     config, JSON.stringify(batch.prompts || []),
     batch.createdAt, batch.done ? 1 : 0])
}

export async function getBatch(batchId) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM batches WHERE batch_id = ?', [batchId])
  if (!rows[0]) return null
  const r = rows[0]
  return {
    batchId: r.batch_id, userId: r.user_id,
    taskIds: typeof r.task_ids === 'string' ? JSON.parse(r.task_ids) : r.task_ids,
    config: r.config ? (typeof r.config === 'string' ? JSON.parse(r.config) : r.config) : null,
    prompts: typeof r.prompts === 'string' ? JSON.parse(r.prompts) : r.prompts, createdAt: r.created_at, done: !!r.done,
  }
}

export async function updateBatch(batchId, updates) {
  const p = await getPool()
  if (updates.done !== undefined) {
    await p.query('UPDATE batches SET done = ? WHERE batch_id = ?', [updates.done ? 1 : 0, batchId])
  }
}

export async function getDigitalAlbum(id, userId) {
  const p = await getPool()
  let query = 'SELECT * FROM digital_albums'
  const params = []
  const conditions = []
  if (id) { conditions.push('id = ?'); params.push(id) }
  if (userId) { conditions.push('user_id = ?'); params.push(userId) }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
  const [rows] = await p.query(query, params)
  return rows[0] || null
}

export async function saveDigitalAlbum(userId, data, id) {
  const p = await getPool()
  const now = Date.now()
  const albumId = id || crypto.randomUUID()
  const categories = data.categories ? JSON.stringify(data.categories) : '[]'
  const bannerUrl = data.bannerUrl || null
  const bannerTitle = data.bannerTitle || null
  const bannerSubtitle = data.bannerSubtitle || null
  const sql = 'INSERT INTO digital_albums (id, user_id, categories, banner_url, banner_title, banner_subtitle, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE categories = VALUES(categories), banner_url = VALUES(banner_url), banner_title = VALUES(banner_title), banner_subtitle = VALUES(banner_subtitle), updated_at = VALUES(updated_at)'
  try {
    await p.query(sql, [albumId, userId, categories, bannerUrl, bannerTitle, bannerSubtitle, now, now])
  } catch (e) {
    const [colInfo] = await p.query('SHOW COLUMNS FROM digital_albums')
    const colNames = colInfo.map(c => c.Field).join(', ')
    const err = new Error(`${e.message} | SQL: ${sql} | Columns: [${colNames}]`)
    throw err
  }
  return { id: albumId }
}

export async function listDigitalAlbums(userId) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM digital_albums WHERE user_id = ? ORDER BY updated_at DESC', [userId])
  return rows
}

export async function deleteDigitalAlbum(id, userId) {
  const p = await getPool()
  await p.query('DELETE FROM digital_albums WHERE id = ? AND user_id = ?', [id, userId])
}

export async function getAllUsers() {
  const p = await getPool()
  const [rows] = await p.query('SELECT email, user_id, vip_type, created_at FROM users ORDER BY created_at DESC')
  return rows
}

export async function updateUserVip(userId, vipType) {
  const p = await getPool()
  await p.query('UPDATE users SET vip_type = ? WHERE user_id = ?', [vipType || null, userId])
}
