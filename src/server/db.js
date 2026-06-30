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
      title_bg_from VARCHAR(20) DEFAULT '',
      title_bg_to VARCHAR(20) DEFAULT '',
      menu_bg_from VARCHAR(20) DEFAULT '',
      menu_bg_to VARCHAR(20) DEFAULT '',
      updated_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (id, user_id)
    )`)
  }
  await p.query(`CREATE TABLE IF NOT EXISTS templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(10) DEFAULT '📄',
    description VARCHAR(200) DEFAULT '',
    categories JSON,
    enabled TINYINT(1) DEFAULT 1,
    cover VARCHAR(500) DEFAULT '',
    banner VARCHAR(500) DEFAULT '',
    title_bg_from VARCHAR(20) DEFAULT '',
    title_bg_to VARCHAR(20) DEFAULT '',
    menu_bg_from VARCHAR(20) DEFAULT '',
    menu_bg_to VARCHAR(20) DEFAULT '',
    sort_order INT DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS user_albums (
    user_id VARCHAR(36) NOT NULL,
    album_id VARCHAR(36) NOT NULL,
    position INT NOT NULL,
    PRIMARY KEY (user_id, album_id)
  )`)
  await p.query(`CREATE TABLE IF NOT EXISTS global_config (
    \`key\` VARCHAR(64) PRIMARY KEY,
    \`value\` TEXT NOT NULL
  )`)
  try {
    await p.query(`ALTER TABLE users ADD COLUMN is_admin TINYINT(1) DEFAULT 0`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE users ADD COLUMN vip_type VARCHAR(20) DEFAULT NULL`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE templates ADD COLUMN cover VARCHAR(500) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE templates ADD COLUMN banner VARCHAR(500) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE templates ADD COLUMN title_bg_from VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE templates ADD COLUMN title_bg_to VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE digital_albums ADD COLUMN title_bg_from VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE digital_albums ADD COLUMN title_bg_to VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE digital_albums ADD COLUMN menu_bg_from VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE digital_albums ADD COLUMN menu_bg_to VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE templates ADD COLUMN menu_bg_from VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE templates ADD COLUMN menu_bg_to VARCHAR(20) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`ALTER TABLE templates ADD COLUMN template_name VARCHAR(100) DEFAULT ''`)
  } catch (e) {}
  try {
    await p.query(`CREATE TABLE IF NOT EXISTS gifts (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(200) DEFAULT '',
      image_urls JSON,
      spec VARCHAR(200) DEFAULT '',
      price VARCHAR(50) DEFAULT '',
      net_content VARCHAR(100) DEFAULT '',
      shelf_life VARCHAR(100) DEFAULT '',
      tips TEXT,
      first_image_url TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`)
    console.log('Gifts table ready')
  } catch (e) { console.error('Failed to create gifts table:', e.message) }
}

export async function bootstrapAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return
  const p = await getPool()
  await p.query('UPDATE users SET is_admin = 1 WHERE email = ?', [adminEmail])
}

export async function getUser(email) {
  const p = await getPool()
  const [rows] = await p.query('SELECT email, user_id, password_hash, vip_type, is_admin, created_at FROM users WHERE email = ?', [email])
  return rows[0] || null
}

export async function setUserAdmin(email) {
  const p = await getPool()
  await p.query('UPDATE users SET is_admin = 1 WHERE email = ?', [email])
}

export async function setUserAdminById(userId) {
  const p = await getPool()
  await p.query('UPDATE users SET is_admin = 1 WHERE user_id = ?', [userId])
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
  const titleBgFrom = data.titleBgFrom ?? null
  const titleBgTo = data.titleBgTo ?? null
  const menuBgFrom = data.menuBgFrom ?? null
  const menuBgTo = data.menuBgTo ?? null
  const sql = 'INSERT INTO digital_albums (id, user_id, categories, banner_url, banner_title, banner_subtitle, title_bg_from, title_bg_to, menu_bg_from, menu_bg_to, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE categories = VALUES(categories), banner_url = VALUES(banner_url), banner_title = VALUES(banner_title), banner_subtitle = VALUES(banner_subtitle), title_bg_from = VALUES(title_bg_from), title_bg_to = VALUES(title_bg_to), menu_bg_from = VALUES(menu_bg_from), menu_bg_to = VALUES(menu_bg_to), updated_at = VALUES(updated_at)'
  try {
    await p.query(sql, [albumId, userId, categories, bannerUrl, bannerTitle, bannerSubtitle, titleBgFrom, titleBgTo, menuBgFrom, menuBgTo, now, now])
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

export async function countUserAlbums(userId) {
  const p = await getPool()
  const [rows] = await p.query('SELECT COUNT(*) as cnt FROM albums a JOIN user_albums ua ON a.id = ua.album_id WHERE ua.user_id = ?', [userId])
  return rows[0].cnt
}

export async function deleteDigitalAlbum(id, userId) {
  const p = await getPool()
  await p.query('DELETE FROM digital_albums WHERE id = ? AND user_id = ?', [id, userId])
}

export async function listTemplates() {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM templates ORDER BY sort_order ASC, created_at ASC')
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    templateName: r.template_name || '',
    icon: r.icon,
    description: r.description,
    cover: r.cover || '',
    banner: r.banner || '',
    titleBgFrom: r.title_bg_from || '',
    titleBgTo: r.title_bg_to || '',
    menuBgFrom: r.menu_bg_from || '',
    menuBgTo: r.menu_bg_to || '',
    categories: typeof r.categories === 'string' ? JSON.parse(r.categories) : (r.categories || []),
    enabled: !!r.enabled,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function getTemplate(id) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM templates WHERE id = ?', [id])
  if (!rows[0]) return null
  const r = rows[0]
  return {
    id: r.id, name: r.name, templateName: r.template_name || '', icon: r.icon, description: r.description, cover: r.cover || '', banner: r.banner || '',
    titleBgFrom: r.title_bg_from || '', titleBgTo: r.title_bg_to || '',
    menuBgFrom: r.menu_bg_from || '', menuBgTo: r.menu_bg_to || '',
    categories: typeof r.categories === 'string' ? JSON.parse(r.categories) : (r.categories || []),
    enabled: !!r.enabled, sortOrder: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export async function createTemplate(data) {
  const p = await getPool()
  const id = crypto.randomUUID()
  const now = Date.now()
  await p.query(
    'INSERT INTO templates (id, name, icon, description, cover, banner, title_bg_from, title_bg_to, menu_bg_from, menu_bg_to, template_name, categories, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.icon || '📄', data.description || '', data.cover || '', data.banner || '', data.titleBgFrom || '', data.titleBgTo || '', data.menuBgFrom || '', data.menuBgTo || '', data.templateName || '', JSON.stringify(data.categories || []), data.enabled !== false ? 1 : 0, data.sortOrder || 0, now, now]
  )
  return id
}

export async function updateTemplate(id, data) {
  const p = await getPool()
  const now = Date.now()
  const sets = []; const vals = []
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
  if (data.icon !== undefined) { sets.push('icon = ?'); vals.push(data.icon) }
  if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description) }
  if (data.cover !== undefined) { sets.push('cover = ?'); vals.push(data.cover) }
  if (data.banner !== undefined) { sets.push('banner = ?'); vals.push(data.banner) }
  if (data.titleBgFrom !== undefined) { sets.push('title_bg_from = ?'); vals.push(data.titleBgFrom) }
  if (data.titleBgTo !== undefined) { sets.push('title_bg_to = ?'); vals.push(data.titleBgTo) }
  if (data.menuBgFrom !== undefined) { sets.push('menu_bg_from = ?'); vals.push(data.menuBgFrom) }
  if (data.menuBgTo !== undefined) { sets.push('menu_bg_to = ?'); vals.push(data.menuBgTo) }
  if (data.categories !== undefined) { sets.push('categories = ?'); vals.push(JSON.stringify(data.categories)) }
  if (data.enabled !== undefined) { sets.push('enabled = ?'); vals.push(data.enabled ? 1 : 0) }
  if (data.sortOrder !== undefined) { sets.push('sort_order = ?'); vals.push(data.sortOrder) }
  if (data.templateName !== undefined) { sets.push('template_name = ?'); vals.push(data.templateName) }
  if (sets.length) { sets.push('updated_at = ?'); vals.push(now); vals.push(id); await p.query(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`, vals) }
}

export async function deleteTemplate(id) {
  const p = await getPool()
  await p.query('DELETE FROM templates WHERE id = ?', [id])
}

export async function getGlobalConfig() {
  const p = await getPool()
  const [rows] = await p.query('SELECT `key`, `value` FROM global_config')
  const cfg = {}
  for (const r of rows) cfg[r.key] = r.value
  return cfg
}

export async function setGlobalConfig(data) {
  const p = await getPool()
  for (const [key, value] of Object.entries(data)) {
    await p.query('INSERT INTO global_config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, value])
  }
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

export async function createGift(userId, data) {
  const p = await getPool()
  const id = crypto.randomUUID()
  const now = Date.now()
  const imageUrls = data.imageUrls ? JSON.stringify(data.imageUrls) : '[]'
  const firstImageUrl = data.firstImageUrl || null
  await p.query(
    'INSERT INTO gifts (id, user_id, name, image_urls, spec, price, net_content, shelf_life, tips, first_image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, data.name || '', imageUrls, data.spec || '', data.price || '', data.netContent || '', data.shelfLife || '', data.tips || '', firstImageUrl, now, now]
  )
  return id
}

export async function updateGift(id, userId, data) {
  const p = await getPool()
  const now = Date.now()
  const sets = []; const vals = []
  if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name) }
  if (data.imageUrls !== undefined) { sets.push('image_urls = ?'); vals.push(JSON.stringify(data.imageUrls)) }
  if (data.firstImageUrl !== undefined) { sets.push('first_image_url = ?'); vals.push(data.firstImageUrl) }
  if (data.spec !== undefined) { sets.push('spec = ?'); vals.push(data.spec) }
  if (data.price !== undefined) { sets.push('price = ?'); vals.push(data.price) }
  if (data.netContent !== undefined) { sets.push('net_content = ?'); vals.push(data.netContent) }
  if (data.shelfLife !== undefined) { sets.push('shelf_life = ?'); vals.push(data.shelfLife) }
  if (data.tips !== undefined) { sets.push('tips = ?'); vals.push(data.tips) }
  if (sets.length) { sets.push('updated_at = ?'); vals.push(now); vals.push(id); vals.push(userId); await p.query(`UPDATE gifts SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, vals) }
}

export async function deleteGift(id, userId) {
  const p = await getPool()
  await p.query('DELETE FROM gifts WHERE id = ? AND user_id = ?', [id, userId])
}

export async function listGifts(userId) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM gifts WHERE user_id = ? ORDER BY updated_at DESC', [userId])
  return rows.map(rowToGift)
}

export async function getGift(id, userId) {
  const p = await getPool()
  const [rows] = await p.query('SELECT * FROM gifts WHERE id = ? AND user_id = ?', [id, userId])
  return rows[0] ? rowToGift(rows[0]) : null
}

function rowToGift(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    imageUrls: typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : (row.image_urls || []),
    firstImageUrl: row.first_image_url,
    spec: row.spec,
    price: row.price,
    netContent: row.net_content,
    shelfLife: row.shelf_life,
    tips: row.tips,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
