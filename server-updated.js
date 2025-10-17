require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const cors = require('cors');
const archiver = require('archiver');
const pass = require('stream').PassThrough;
const axios = require('axios');
const ExifReader = require('exifreader'); // Add this package

const app = express();

// Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'photo_app',
  port: Number(process.env.DB_PORT) || 3306,
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const PORT = process.env.PORT || 3232;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const CLIP_SERVICE_URL = process.env.CLIP_SERVICE_URL || 'http://localhost:5000';

const corsOptions = {
  origin: ['http://192.168.2.128', 'http://192.168.2.130', 'http://localhost:5173', 'http://localhost:3000', 'http://phototheque.oss'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection pool
let pool;

// ==================== METADATA EXTRACTION ====================

function extractMetadata(buffer) {
  try {
    const tags = ExifReader.load(buffer);

    const metadata = {
      camera_make: null,
      camera_model: null,
      lens_model: null,
      focal_length: null,
      aperture: null,
      iso: null,
      shutter_speed: null,
      date_taken: null,
      gps_latitude: null,
      gps_longitude: null,
      gps_location_name: null,
      orientation: null,
      software: null,
      copyright: null,
      artist: null,
      description: null
    };

    // Camera info
    if (tags.Make) metadata.camera_make = tags.Make.description;
    if (tags.Model) metadata.camera_model = tags.Model.description;
    if (tags.LensModel) metadata.lens_model = tags.LensModel.description;

    // Photography settings
    if (tags.FocalLength) {
      metadata.focal_length = tags.FocalLength.description;
    }
    if (tags.FNumber) {
      metadata.aperture = `f/${tags.FNumber.description}`;
    }
    if (tags.ISOSpeedRatings) {
      metadata.iso = tags.ISOSpeedRatings.description;
    }
    if (tags.ExposureTime) {
      metadata.shutter_speed = tags.ExposureTime.description;
    }

    // Date and time - Check multiple possible EXIF tags
    let exifDate = null;
    
    // Try different date tags in order of preference
    if (tags.DateTimeOriginal) {
      exifDate = tags.DateTimeOriginal.description;
    } else if (tags.CreateDate) {
      exifDate = tags.CreateDate.description;
    } else if (tags.DateTimeDigitized) {
      exifDate = tags.DateTimeDigitized.description;
    } else if (tags.DateTime) {
      exifDate = tags.DateTime.description;
    } else if (tags.ModifyDate) {
      exifDate = tags.ModifyDate.description;
    }
    
    // Parse and format the date
    if (exifDate) {
      try {
        // Handle different EXIF date formats:
        // Format 1: "2023:12:25 15:30:45" (standard EXIF format)
        // Format 2: "2023-12-25T15:30:45" (ISO format)
        // Format 3: "2023/12/25 15:30:45" (alternative format)
        
        let parsedDate;
        
        if (exifDate.includes(':') && exifDate.includes(' ') && exifDate.split(':')[0].length === 4) {
          // Standard EXIF format: "2023:12:25 15:30:45"
          const [datePart, timePart] = exifDate.split(' ');
          const [year, month, day] = datePart.split(':');
          parsedDate = new Date(`${year}-${month}-${day}T${timePart}`);
        } else if (exifDate.includes('T')) {
          // ISO format: "2023-12-25T15:30:45"
          parsedDate = new Date(exifDate);
        } else if (exifDate.includes('/')) {
          // Alternative format: "2023/12/25 15:30:45"
          const [datePart, timePart] = exifDate.split(' ');
          const [year, month, day] = datePart.split('/');
          parsedDate = new Date(`${year}-${month}-${day}T${timePart}`);
        } else {
          // Try to parse as-is
          parsedDate = new Date(exifDate);
        }
        
        if (!isNaN(parsedDate.getTime())) {
          // Format as ISO string for database storage
          metadata.date_taken = parsedDate.toISOString();
        } else {
          metadata.date_taken = exifDate; // Store original if parsing fails
        }
        
        console.log('📅 EXIF Date found:', exifDate, 'Parsed:', metadata.date_taken);
      } catch (error) {
        console.warn('⚠️ Error parsing EXIF date:', error.message);
        metadata.date_taken = exifDate; // Store original if parsing fails
      }
    } else {
      console.log('📅 No EXIF date found in image');
    }

    // GPS data
    if (tags.GPSLatitude && tags.GPSLongitude) {
      metadata.gps_latitude = tags.GPSLatitude.description;
      metadata.gps_longitude = tags.GPSLongitude.description;

      // Combine lat/long into a searchable location string
      metadata.gps_location_name = `${metadata.gps_latitude}, ${metadata.gps_longitude}`;
    }

    // Other metadata
    if (tags.Orientation) metadata.orientation = tags.Orientation.description;
    if (tags.Software) metadata.software = tags.Software.description;
    if (tags.Copyright) metadata.copyright = tags.Copyright.description;
    if (tags.Artist) metadata.artist = tags.Artist.description;
    if (tags.ImageDescription) metadata.description = tags.ImageDescription.description;

    console.log('📋 Extracted metadata:', metadata);
    return metadata;
  } catch (error) {
    console.warn('⚠️ Could not extract metadata:', error.message);
    return {
      camera_make: null,
      camera_model: null,
      lens_model: null,
      focal_length: null,
      aperture: null,
      iso: null,
      shutter_speed: null,
      date_taken: null,
      gps_latitude: null,
      gps_longitude: null,
      gps_location_name: null,
      orientation: null,
      software: null,
      copyright: null,
      artist: null,
      description: null
    };
  }
}

// ==================== EMBEDDING QUEUE ====================

class EmbeddingQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.stats = {
      processed: 0,
      failed: 0,
      pending: 0,
      currentBatch: []
    };
  }

  add(imageId, filePath) {
    this.queue.push({ imageId, filePath, addedAt: Date.now() });
    this.stats.pending = this.queue.length;
    console.log(`📥 Added image ${imageId} to embedding queue (${this.queue.length} pending)`);

    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log('🔄 Starting embedding queue processor...');

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 5);
      this.stats.currentBatch = batch.map(item => item.imageId);
      this.stats.pending = this.queue.length;

      console.log(`📊 Processing batch: [${this.stats.currentBatch.join(', ')}] (${this.queue.length} remaining)`);

      const results = await Promise.allSettled(
        batch.map(item => this.generateEmbedding(item.imageId, item.filePath))
      );

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.stats.processed++;
          console.log(`✅ Embedding generated for image ${batch[index].imageId}`);
        } else {
          this.stats.failed++;
          console.error(`❌ Failed to generate embedding for image ${batch[index].imageId}:`, result.reason);
        }
      });

      if (this.queue.length > 0) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.stats.currentBatch = [];
    this.stats.pending = 0;
    this.processing = false;
    console.log(`✅ Queue processing completed. Processed: ${this.stats.processed}, Failed: ${this.stats.failed}`);
  }

  async generateEmbedding(imageId, filePath) {
    try {
      const result = await callClipService('/embed-image', { image_path: filePath }, 30000);

      await pool.query(
        'UPDATE images SET clip_embedding = ? WHERE id = ?',
        [JSON.stringify(result.embedding), imageId]
      );

      return result.embedding;
    } catch (error) {
      console.error(`Failed to generate CLIP embedding for image ${imageId}:`, error.message);
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      processing: this.processing,
      queueLength: this.queue.length
    };
  }

  clear() {
    this.queue = [];
    this.stats.pending = 0;
    console.log('🗑️ Queue cleared');
  }
}

const embeddingQueue = new EmbeddingQueue();

// ==================== CLIP SERVICE INTEGRATION ====================

async function callClipService(endpoint, data, timeout = 30000) {
  try {
    const response = await axios.post(`${CLIP_SERVICE_URL}${endpoint}`, data, {
      timeout,
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('CLIP service is not running');
    }
    console.error(`CLIP service error (${endpoint}):`, error.message);
    throw new Error('Failed to communicate with CLIP service');
  }
}

async function checkClipService() {
  try {
    const response = await axios.get(`${CLIP_SERVICE_URL}/health`, { timeout: 5000 });
    return response.data.model_loaded;
  } catch (error) {
    console.warn('⚠️ CLIP service not available. Search functionality will be limited.');
    return false;
  }
}

// ==================== DATABASE INITIALIZATION ====================

async function initDB() {
  try {
    pool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'uploader') NOT NULL DEFAULT 'uploader',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_name (name),
        INDEX idx_email (email)
      )
    `);

    // Create login_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_created_at (created_at),
        INDEX idx_success (success)
      )
    `);

    // Create themes table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_name (name)
      )
    `);

    // Create tags table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_name (name)
      )
    `);

    // Create images table with metadata fields
    await connection.query(`
      CREATE TABLE IF NOT EXISTS images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(50) NOT NULL,
        size BIGINT NOT NULL,
        width INT,
        height INT,
        uploaded_by INT,
        file_path VARCHAR(500) NOT NULL,
        clip_embedding JSON,
        country VARCHAR(100),
        camera_make VARCHAR(100),
        camera_model VARCHAR(100),
        lens_model VARCHAR(100),
        focal_length VARCHAR(50),
        aperture VARCHAR(50),
        iso VARCHAR(50),
        shutter_speed VARCHAR(50),
        date_taken VARCHAR(100),
        gps_latitude VARCHAR(100),
        gps_longitude VARCHAR(100),
        gps_location_name VARCHAR(255),
        orientation VARCHAR(50),
        software VARCHAR(100),
        copyright VARCHAR(255),
        artist VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_uploaded_by (uploaded_by),
        INDEX idx_created_at (created_at),
        INDEX idx_camera_make (camera_make),
        INDEX idx_camera_model (camera_model),
        INDEX idx_gps_location (gps_location_name),
        INDEX idx_date_taken (date_taken)
      )
    `);

    // Create image_themes junction table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS image_themes (
        image_id INT NOT NULL,
        theme_id INT NOT NULL,
        PRIMARY KEY (image_id, theme_id),
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE
      )
    `);

    // Create image_tags junction table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS image_tags (
        image_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (image_id, tag_id),
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Create activity_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      )
    `);

    connection.release();

    await checkClipService();
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

async function initStorage() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    console.log('✅ Upload directory initialized');
  } catch (error) {
    console.error('❌ Storage initialization error:', error);
    throw error;
  }
}

async function logActivity(userId, action, resourceType = null, resourceId = null) {
  const loggedActions = [
    'IMAGE_CREATED', 'IMAGE_DELETED',
    'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
    'THEME_CREATED', 'THEME_UPDATED', 'THEME_DELETED',
    'TAG_CREATED', 'TAG_UPDATED', 'TAG_DELETED'
  ];

  if (!loggedActions.includes(action)) {
    return;
  }

  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, resource_type, resource_id) VALUES (?, ?, ?, ?)',
      [userId, action, resourceType, resourceId]
    );
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
  }
}

// Helper function to log login attempts
async function logLoginAttempt(email, success) {
  try {
    await pool.query(
      'INSERT INTO login_logs (email, success) VALUES (?, ?)',
      [email, success]
    );
  } catch (error) {
    console.error('❌ Failed to log login attempt:', error);
  }
}

// ==================== MIDDLEWARE ====================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/heif', 'image/heic'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, TIFF, HEIF, and HEIC images are allowed.'));
    }
  }
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!['admin', 'uploader'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    await logActivity(req.user.id, 'USER_CREATED', 'user', result.insertId);

    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get client IP endpoint
app.get('/api/auth/client-ip', authenticateToken, (req, res) => {
  try {
    // Get the real client IP from various sources in order of preference
    // This is optimized for Kubernetes and internal network setups
    let clientIP = 
      // Check for Kubernetes Ingress headers
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      req.headers['x-original-forwarded-for'] ||
      // Check for other proxy headers
      req.headers['x-client-ip'] ||
      req.headers['x-forwarded'] ||
      req.headers['forwarded-for'] ||
      req.headers['forwarded'] ||
      // Direct connection (fallback)
      req.connection.remoteAddress || 
      req.socket.remoteAddress || 
      req.connection.socket.remoteAddress ||
      req.info?.remoteAddress;
    
    // Handle forwarded IPs (comma-separated list) - take the first one
    if (clientIP && typeof clientIP === 'string') {
      clientIP = clientIP.split(',')[0].trim();
    }
    
    // Remove port if present (e.g., "192.168.1.100:8080")
    if (clientIP && typeof clientIP === 'string') {
      clientIP = clientIP.split(':')[0];
    }
    
    // Normalize IPv6 localhost to IPv4
    if (clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
      clientIP = '127.0.0.1';
    }
    
    // Handle IPv6-mapped IPv4 addresses
    if (clientIP && clientIP.startsWith('::ffff:')) {
      clientIP = clientIP.substring(7);
    }
    
    // Validate that it's a valid IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (clientIP && ipRegex.test(clientIP)) {
      // Check if it's a private/internal IP
      const isPrivateIP = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(clientIP);
      
      console.log('Client IP detected:', clientIP, 'Internal:', isPrivateIP);
      
      res.json({ 
        ip: clientIP,
        isInternal: isPrivateIP
      });
    } else {
      // Fallback for invalid IP
      console.log('Invalid IP detected, using fallback:', clientIP);
      res.json({ 
        ip: 'unknown-internal',
        isInternal: true
      });
    }
  } catch (error) {
    console.error('Error getting client IP:', error);
    res.status(500).json({ error: 'Failed to get client IP' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (users.length === 0) {
      // Log failed login attempt
      await logLoginAttempt(email, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      // Log failed login attempt
      await logLoginAttempt(email, false);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Log successful login
    await logLoginAttempt(email, true);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change password endpoint - PUT method (for frontend compatibility)
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('📝 Password change request from user:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, users[0].password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    console.log('✅ Password changed successfully for user:', userId);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Change password endpoint - POST method (alternative)
app.post('/api/users/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('📝 Password change request from user:', userId);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, users[0].password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    console.log('✅ Password changed successfully for user:', userId);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Get current user profile (for uploaders to see their own info)
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at, is_active FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ==================== LOGIN LOGS ROUTES ====================

app.get('/api/admin/login-logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const { email, start_date, end_date } = req.query;

    let query = 'SELECT id, email, success, created_at FROM login_logs WHERE 1=1';
    let params = [];

    if (email) {
      query += ' AND email = ?';
      params.push(email);
    }

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    // Get total count for pagination
    const countQuery = query.replace('SELECT * FROM', 'SELECT COUNT(*) as total FROM');
    
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated logs
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [logs] = await pool.query(query, params);

    res.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get login logs error:', error);
    res.status(500).json({ error: 'Failed to fetch login logs' });
  }
});

// Export login logs to CSV (admin only)
app.get('/api/admin/login-logs/export', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { email, start_date, end_date } = req.query;

    let query = 'SELECT id, email, success, created_at FROM login_logs WHERE 1=1';
    let params = [];

    if (email) {
      query += ' AND email = ?';
      params.push(email);
    }

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';

    const [logs] = await pool.query(query, params);

    // Generate CSV
    const csvHeader = 'Email,Date,Adresse IP,Statut,User Agent\n';
    const csvContent = logs.map(log => 
      `${log.email},"${log.created_at}",${log.ip_address || 'N/A'},${log.success ? 'Succès' : 'Échec'},"${log.user_agent || 'N/A'}"`
    ).join('\n');

    const csv = csvHeader + csvContent;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="login-logs-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export login logs error:', error);
    res.status(500).json({ error: 'Failed to export login logs' });
  }
});

// ==================== USER STATS ROUTES ====================

app.get('/api/users/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user statistics
    const [imageCount] = await pool.query(
      'SELECT COUNT(*) as total_images, SUM(size) as total_storage FROM images WHERE uploaded_by = ?',
      [userId]
    );

    const [tagCount] = await pool.query(
      'SELECT COUNT(*) as total_tags FROM tags WHERE created_by = ?',
      [userId]
    );

    const [themeCount] = await pool.query(
      'SELECT COUNT(*) as total_themes FROM themes WHERE created_by = ?',
      [userId]
    );

    res.json({
      total_images: imageCount[0].total_images || 0,
      total_tags: tagCount[0].total_tags || 0,
      total_themes: themeCount[0].total_themes || 0,
      total_storage: imageCount[0].total_storage || 0
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

app.get('/api/users/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let query, params;
    
    if (isAdmin) {
      // Admin can see all activity
      query = `
        SELECT al.*, u.name 
        FROM activity_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        ORDER BY al.created_at DESC 
        LIMIT 50
      `;
      params = [];
    } else {
      // Regular users can only see their own activity
      query = `
        SELECT al.*, u.name 
        FROM activity_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        WHERE al.user_id = ? 
        ORDER BY al.created_at DESC 
        LIMIT 50
      `;
      params = [userId];
    }

    const [logs] = await pool.query(query, params);

    res.json({ logs });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================

app.get('/api/users', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at, is_active FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at, is_active FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, is_active } = req.body;
    const userId = req.params.id;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role !== undefined) {
      if (!['admin', 'uploader'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    await logActivity(req.user.id, 'USER_UPDATED', 'user', userId);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId == req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await pool.query('UPDATE images SET uploaded_by = NULL WHERE uploaded_by = ?', [userId]);
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);

    await logActivity(req.user.id, 'USER_DELETED', 'user', userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ==================== THEMES ROUTES ====================

app.get('/api/themes', authenticateToken, async (req, res) => {
  try {
    const [themes] = await pool.query(`
      SELECT t.id, t.name, t.created_at, t.created_by, u.name as created_by_name
      FROM themes t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.name ASC
    `);
    res.json({ themes });
  } catch (error) {
    console.error('Get themes error:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

app.post('/api/themes', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Theme name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO themes (name, created_by) VALUES (?, ?)',
      [name.trim(), req.user.id]
    );

    await logActivity(req.user.id, 'THEME_CREATED', 'theme', result.insertId);

    res.status(201).json({
      message: 'Theme created successfully',
      theme: { id: result.insertId, name: name.trim(), created_by: req.user.id }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Theme already exists' });
    }
    console.error('Create theme error:', error);
    res.status(500).json({ error: 'Failed to create theme' });
  }
});

app.put('/api/themes/:id', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const { name } = req.body;
    const themeId = req.params.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Theme name is required' });
    }

    const [themes] = await pool.query('SELECT * FROM themes WHERE id = ?', [themeId]);

    if (themes.length === 0) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    const theme = themes[0];

    if (req.user.role !== 'admin' && theme.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own themes' });
    }

    await pool.query('UPDATE themes SET name = ? WHERE id = ?', [name.trim(), themeId]);

    await logActivity(req.user.id, 'THEME_UPDATED', 'theme', themeId);

    res.json({ message: 'Theme updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Theme name already exists' });
    }
    console.error('Update theme error:', error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

app.delete('/api/themes/:id', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const themeId = req.params.id;

    const [themes] = await pool.query('SELECT * FROM themes WHERE id = ?', [themeId]);

    if (themes.length === 0) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    const theme = themes[0];

    if (req.user.role !== 'admin' && theme.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own themes' });
    }

    await pool.query('DELETE FROM themes WHERE id = ?', [themeId]);

    await logActivity(req.user.id, 'THEME_DELETED', 'theme', themeId);

    res.json({ message: 'Theme deleted successfully' });
  } catch (error) {
    console.error('Delete theme error:', error);
    res.status(500).json({ error: 'Failed to delete theme' });
  }
});

// ==================== TAGS ROUTES ====================

app.get('/api/tags', authenticateToken, async (req, res) => {
  try {
    const [tags] = await pool.query(`
      SELECT t.id, t.name, t.created_at, t.created_by, u.name as created_by_name
      FROM tags t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.name ASC
    `);
    res.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

app.post('/api/tags', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO tags (name, created_by) VALUES (?, ?)',
      [name.trim(), req.user.id]
    );

    await logActivity(req.user.id, 'TAG_CREATED', 'tag', result.insertId);

    res.status(201).json({
      message: 'Tag created successfully',
      tag: { id: result.insertId, name: name.trim(), created_by: req.user.id }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Tag already exists' });
    }
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

app.put('/api/tags/:id', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const { name } = req.body;
    const tagId = req.params.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const [tags] = await pool.query('SELECT * FROM tags WHERE id = ?', [tagId]);

    if (tags.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const tag = tags[0];

    if (req.user.role !== 'admin' && tag.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own tags' });
    }

    await pool.query('UPDATE tags SET name = ? WHERE id = ?', [name.trim(), tagId]);

    await logActivity(req.user.id, 'TAG_UPDATED', 'tag', tagId);

    res.json({ message: 'Tag updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

app.delete('/api/tags/:id', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const tagId = req.params.id;

    const [tags] = await pool.query('SELECT * FROM tags WHERE id = ?', [tagId]);

    if (tags.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const tag = tags[0];

    if (req.user.role !== 'admin' && tag.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own tags' });
    }

    await pool.query('DELETE FROM tags WHERE id = ?', [tagId]);

    await logActivity(req.user.id, 'TAG_DELETED', 'tag', tagId);

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// ==================== IMAGE ROUTES ====================

app.post('/api/images/upload', authenticateToken, authorize('uploader'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { themes, tags, country, date_taken } = req.body;
    const themeIds = themes ? (typeof themes === 'string' ? JSON.parse(themes) : themes) : [];
    const tagIds = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];

    // Extract metadata from image
    const metadata = extractMetadata(req.file.buffer);

    // If no EXIF date was found, try to get file creation date
    if (!metadata.date_taken) {
      try {
        const stats = await fs.stat(req.file.path);
        const fileDate = new Date(stats.birthtime || stats.ctime || stats.mtime);
        if (!isNaN(fileDate.getTime())) {
          metadata.date_taken = fileDate.toISOString();
          console.log('📅 Using file creation date:', metadata.date_taken);
        }
      } catch (error) {
        console.warn('⚠️ Could not get file creation date:', error.message);
      }
    }

    // Override date_taken if provided by user
    if (date_taken) {
      metadata.date_taken = date_taken;
    }

    // Final fallback: if still no date, use current time but log it
    if (!metadata.date_taken) {
      metadata.date_taken = new Date().toISOString();
      console.log('📅 Using current date as fallback:', metadata.date_taken);
    }

    const fileExtension = path.extname(req.file.originalname);
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    const imageBuffer = await sharp(req.file.buffer)
      .withMetadata()
      .toBuffer();

    const sharpMetadata = await sharp(imageBuffer).metadata();
    await fs.writeFile(filePath, imageBuffer);

    // Insert image with metadata
    const [result] = await pool.query(
      `INSERT INTO images (
        filename, original_name, mime_type, size, width, height, uploaded_by, file_path, country,
        camera_make, camera_model, lens_model, focal_length, aperture, iso, shutter_speed,
        date_taken, gps_latitude, gps_longitude, gps_location_name, orientation, software,
        copyright, artist, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uniqueFilename, req.file.originalname, req.file.mimetype, imageBuffer.length,
        sharpMetadata.width, sharpMetadata.height, req.user.id, filePath, country || null,
        metadata.camera_make, metadata.camera_model, metadata.lens_model, metadata.focal_length,
        metadata.aperture, metadata.iso, metadata.shutter_speed, metadata.date_taken,
        metadata.gps_latitude, metadata.gps_longitude, metadata.gps_location_name,
        metadata.orientation, metadata.software, metadata.copyright, metadata.artist,
        metadata.description
      ]
    );

    const imageId = result.insertId;

    if (themeIds.length > 0) {
      const themeValues = themeIds.map(themeId => [imageId, themeId]);
      await pool.query('INSERT INTO image_themes (image_id, theme_id) VALUES ?', [themeValues]);
    }

    if (tagIds.length > 0) {
      const tagValues = tagIds.map(tagId => [imageId, tagId]);
      await pool.query('INSERT INTO image_tags (image_id, tag_id) VALUES ?', [tagValues]);
    }

    embeddingQueue.add(imageId, filePath);

    await logActivity(req.user.id, 'IMAGE_CREATED', 'image', imageId);

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: {
        id: imageId,
        filename: uniqueFilename,
        originalName: req.file.originalname,
        size: imageBuffer.length,
        width: sharpMetadata.width,
        height: sharpMetadata.height,
        country: country || null,
        date_taken: metadata.date_taken,
        metadata: metadata
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

app.get('/api/images', authenticateToken, async (req, res) => {
  try {
    const [images] = await pool.query(`
      SELECT
        i.id,
        i.filename,
        i.original_name,
        i.mime_type,
        i.size,
        i.width,
        i.height,
        i.created_at,
        i.country,
        i.camera_make,
        i.camera_model,
        i.lens_model,
        i.focal_length,
        i.aperture,
        i.iso,
        i.shutter_speed,
        i.date_taken,
        i.gps_latitude,
        i.gps_longitude,
        i.gps_location_name,
        i.orientation,
        i.software,
        i.copyright,
        i.artist,
        i.description,
        u.name as uploaded_by_name,
        IF(i.clip_embedding IS NOT NULL, TRUE, FALSE) as has_embedding
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.id
      ORDER BY i.created_at DESC
    `);

    for (let image of images) {
      const [themes] = await pool.query(`
        SELECT t.id, t.name
        FROM themes t
        JOIN image_themes it ON t.id = it.theme_id
        WHERE it.image_id = ?
      `, [image.id]);

      const [tags] = await pool.query(`
        SELECT t.id, t.name
        FROM tags t
        JOIN image_tags it ON t.id = it.tag_id
        WHERE it.image_id = ?
      `, [image.id]);

      image.themes = themes;
      image.tags = tags;
    }

    res.json({ images });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.get('/api/images/:id', authenticateToken, async (req, res) => {
  try {
    const [images] = await pool.query(`
      SELECT
        i.id,
        i.filename,
        i.original_name,
        i.mime_type,
        i.size,
        i.width,
        i.height,
        i.created_at,
        i.country,
        i.camera_make,
        i.camera_model,
        i.lens_model,
        i.focal_length,
        i.aperture,
        i.iso,
        i.shutter_speed,
        i.date_taken,
        i.gps_latitude,
        i.gps_longitude,
        i.gps_location_name,
        i.orientation,
        i.software,
        i.copyright,
        i.artist,
        i.description,
        u.name as uploaded_by_name,
        IF(i.clip_embedding IS NOT NULL, TRUE, FALSE) as has_embedding
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.id
      WHERE i.id = ?
    `, [req.params.id]);

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];

    const [themes] = await pool.query(`
      SELECT t.id, t.name
      FROM themes t
      JOIN image_themes it ON t.id = it.theme_id
      WHERE it.image_id = ?
    `, [image.id]);

    const [tags] = await pool.query(`
      SELECT t.id, t.name
      FROM tags t
      JOIN image_tags it ON t.id = it.tag_id
      WHERE it.image_id = ?
    `, [image.id]);

    image.themes = themes;
    image.tags = tags;

    res.json({ image });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

app.put('/api/images/:id', authenticateToken, authorize('uploader'), async (req, res) => {
  // This endpoint is now disabled - images cannot be updated
  return res.status(403).json({
    error: 'Images cannot be updated. Please delete and re-upload if changes are needed.'
  });
});

app.get('/api/images/:id/preview', authenticateToken, async (req, res) => {
  try {
    const { width = 400, quality = 70 } = req.query;

    const [images] = await pool.query('SELECT * FROM images WHERE id = ?', [req.params.id]);

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];

    try {
      await fs.access(image.file_path);
    } catch {
      return res.status(404).json({ error: 'Image file not found on server' });
    }

    const imageBuffer = await fs.readFile(image.file_path);

    const previewBuffer = await sharp(imageBuffer)
      .resize(parseInt(width), null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: parseInt(quality) })
      .toBuffer();

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', previewBuffer.length);

    res.send(previewBuffer);
  } catch (error) {
    console.error('Preview generation error:', error);
    res.status(500).json({ error: 'Failed to generate image preview' });
  }
});

app.get('/api/images/:id/download', authenticateToken, async (req, res) => {
  try {
    const [images] = await pool.query('SELECT * FROM images WHERE id = ?', [req.params.id]);

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];

    try {
      await fs.access(image.file_path);
    } catch {
      return res.status(404).json({ error: 'Image file not found on server' });
    }

    res.setHeader('Content-Type', image.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${image.original_name}"`);
    res.setHeader('Content-Length', image.size);

    const fileStream = require('fs').createReadStream(image.file_path);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download image' });
  }
});

app.post('/api/images/bulk-download', authenticateToken, async (req, res) => {
  try {
    const { imageIds } = req.body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'No image IDs provided' });
    }

    const placeholders = imageIds.map(() => '?').join(',');
    const [images] = await pool.query(
      `SELECT * FROM images WHERE id IN (${placeholders})`,
      imageIds
    );

    if (images.length === 0) {
      return res.status(404).json({ error: 'No valid images found' });
    }

    const folderName = `photo_telechargé_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${folderName}.zip"`);

    const passThrough = new pass();
    passThrough.pipe(res);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(passThrough);

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create ZIP file' });
      }
    });

    for (const image of images) {
      try {
        await fs.access(image.file_path);
        archive.file(image.file_path, { name: image.original_name });
      } catch (error) {
        console.error(`Failed to access file ${image.file_path}:`, error);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Bulk download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create download package' });
    }
  }
});

app.delete('/api/images/:id', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const [images] = await pool.query('SELECT * FROM images WHERE id = ?', [req.params.id]);

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];

    if (req.user.role !== 'admin' && image.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own images' });
    }

    try {
      await fs.unlink(image.file_path);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }

    await pool.query('DELETE FROM images WHERE id = ?', [req.params.id]);

    await logActivity(req.user.id, 'IMAGE_DELETED', 'image', image.id);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// ==================== METADATA SEARCH ROUTES ====================

app.get('/api/images/search', authenticateToken, async (req, res) => {
  try {
    const {
      theme, tag, country,
      camera_make, camera_model,
      location,
      date_from, date_to,
      focal_length_min, focal_length_max,
      iso_min, iso_max
    } = req.query;

    let query = `
      SELECT DISTINCT
        i.id,
        i.filename,
        i.original_name,
        i.mime_type,
        i.size,
        i.width,
        i.height,
        i.created_at,
        i.country,
        i.camera_make,
        i.camera_model,
        i.lens_model,
        i.focal_length,
        i.aperture,
        i.iso,
        i.shutter_speed,
        i.date_taken,
        i.gps_latitude,
        i.gps_longitude,
        i.gps_location_name,
        u.name as uploaded_by_name
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.id
    `;

    const conditions = [];
    const params = [];
    const joins = [];

    if (theme) {
      joins.push('JOIN image_themes it ON i.id = it.image_id');
      conditions.push('it.theme_id = ?');
      params.push(theme);
    }

    if (tag) {
      joins.push('JOIN image_tags itag ON i.id = itag.image_id');
      conditions.push('itag.tag_id = ?');
      params.push(tag);
    }

    // Add joins
    if (joins.length > 0) {
      query += ' ' + joins.join(' ');
    }

    // Country filter
    if (country) {
      conditions.push('i.country = ?');
      params.push(country);
    }

    // Camera filters
    if (camera_make) {
      conditions.push('i.camera_make LIKE ?');
      params.push(`%${camera_make}%`);
    }

    if (camera_model) {
      conditions.push('i.camera_model LIKE ?');
      params.push(`%${camera_model}%`);
    }

    // Location filter (GPS)
    if (location) {
      conditions.push('(i.gps_location_name LIKE ? OR i.gps_latitude LIKE ? OR i.gps_longitude LIKE ?)');
      params.push(`%${location}%`, `%${location}%`, `%${location}%`);
    }

    // Date range filter
    if (date_from) {
      conditions.push('i.date_taken >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('i.date_taken <= ?');
      params.push(date_to);
    }

    // Focal length range
    if (focal_length_min) {
      conditions.push('CAST(SUBSTRING_INDEX(i.focal_length, " ", 1) AS DECIMAL) >= ?');
      params.push(focal_length_min);
    }

    if (focal_length_max) {
      conditions.push('CAST(SUBSTRING_INDEX(i.focal_length, " ", 1) AS DECIMAL) <= ?');
      params.push(focal_length_max);
    }

    // ISO range
    if (iso_min) {
      conditions.push('CAST(i.iso AS UNSIGNED) >= ?');
      params.push(iso_min);
    }

    if (iso_max) {
      conditions.push('CAST(i.iso AS UNSIGNED) <= ?');
      params.push(iso_max);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY i.created_at DESC`;

    const [images] = await pool.query(query, params);

    for (let image of images) {
      const [themes] = await pool.query(`
        SELECT t.id, t.name
        FROM themes t
        JOIN image_themes it ON t.id = it.theme_id
        WHERE it.image_id = ?
      `, [image.id]);

      const [tags] = await pool.query(`
        SELECT t.id, t.name
        FROM tags t
        JOIN image_tags it ON t.id = it.tag_id
        WHERE it.image_id = ?
      `, [image.id]);

      image.themes = themes;
      image.tags = tags;
    }

    res.json({ images, total: images.length });
  } catch (error) {
    console.error('Search images error:', error);
    res.status(500).json({ error: 'Failed to search images' });
  }
});

// Get unique metadata values for filters
app.get('/api/metadata/filters', authenticateToken, async (req, res) => {
  try {
    const [cameraMakes] = await pool.query(
      'SELECT DISTINCT camera_make FROM images WHERE camera_make IS NOT NULL ORDER BY camera_make'
    );

    const [cameraModels] = await pool.query(
      'SELECT DISTINCT camera_model FROM images WHERE camera_model IS NOT NULL ORDER BY camera_model'
    );

    const [locations] = await pool.query(
      'SELECT DISTINCT gps_location_name FROM images WHERE gps_location_name IS NOT NULL ORDER BY gps_location_name'
    );

    res.json({
      camera_makes: cameraMakes.map(r => r.camera_make),
      camera_models: cameraModels.map(r => r.camera_model),
      locations: locations.map(r => r.gps_location_name)
    });
  } catch (error) {
    console.error('Get metadata filters error:', error);
    res.status(500).json({ error: 'Failed to fetch metadata filters' });
  }
});

// ==================== CLIP SEARCH ROUTES ====================

app.post('/api/images/clip-search', authenticateToken, async (req, res) => {
  try {
    const { query, top_k = 20 } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const [images] = await pool.query(`
      SELECT id, filename, original_name, clip_embedding, file_path
      FROM images
      WHERE clip_embedding IS NOT NULL
    `);

    if (images.length === 0) {
      return res.json({
        message: 'No images with embeddings found',
        results: []
      });
    }

    const imageEmbeddings = {};

    for (const img of images) {
      try {
        // Handle different possible types of clip_embedding
        let embedding;

        if (typeof img.clip_embedding === 'string') {
          // If it's a string, parse it as JSON
          embedding = JSON.parse(img.clip_embedding);
        } else if (Array.isArray(img.clip_embedding)) {
          // If it's already an array, use it directly
          embedding = img.clip_embedding;
        } else {
          console.error(`Unexpected embedding type for image ${img.id}: ${typeof img.clip_embedding}`);
          continue;
        }

        // Verify it's an array of numbers
        if (Array.isArray(embedding) &&
            embedding.length > 0 &&
            typeof embedding[0] === 'number') {
          imageEmbeddings[img.id] = embedding;
        } else {
          console.error(`Invalid embedding format for image ${img.id}: Not an array of numbers`);
        }
      } catch (e) {
        console.error(`Failed to process embedding for image ${img.id}:`, e.message);
      }
    }

    if (Object.keys(imageEmbeddings).length === 0) {
      return res.json({
        message: 'No valid embeddings found. Images may need to be re-processed.',
        results: []
      });
    }

    console.log(`Sending ${Object.keys(imageEmbeddings).length} valid embeddings to CLIP service for search`);

    const searchResult = await callClipService('/search', {
      query: query.trim(),
      image_embeddings: imageEmbeddings,
      top_k: parseInt(top_k)
    });

    const imageIds = searchResult.results.map(r => r.image_id);

    if (imageIds.length === 0) {
      return res.json({ results: [], query: query.trim() });
    }

    const placeholders = imageIds.map(() => '?').join(',');
    const [fullImages] = await pool.query(`
      SELECT
        i.id,
        i.filename,
        i.original_name,
        i.mime_type,
        i.size,
        i.width,
        i.height,
        i.created_at,
        i.country,
        i.camera_make,
        i.camera_model,
        i.gps_location_name,
        u.name as uploaded_by_name
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.id
      WHERE i.id IN (${placeholders})
    `, imageIds);

    for (let image of fullImages) {
      const [themes] = await pool.query(`
        SELECT t.id, t.name
        FROM themes t
        JOIN image_themes it ON t.id = it.theme_id
        WHERE it.image_id = ?
      `, [image.id]);

      const [tags] = await pool.query(`
        SELECT t.id, t.name
        FROM tags t
        JOIN image_tags it ON t.id = it.tag_id
        WHERE it.image_id = ?
      `, [image.id]);

      image.themes = themes;
      image.tags = tags;

      const searchItem = searchResult.results.find(r => r.image_id == image.id);
      if (searchItem) {
        image.similarity = searchItem.similarity;
      }
    }

    fullImages.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

    res.json({
      query: query.trim(),
      results: fullImages,
      total: fullImages.length
    });

  } catch (error) {
    console.error('CLIP search error:', error);
    if (error.message === 'CLIP service is not running') {
      return res.status(503).json({
        error: 'CLIP search service is unavailable. Please ensure the Python service is running.'
      });
    }
    res.status(500).json({ error: 'Failed to perform CLIP search' });
  }
});
app.get('/api/images/debug-embedding/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [images] = await pool.query(
      'SELECT id, filename, clip_embedding FROM images WHERE id = ?',
      [req.params.id]
    );

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];
    const debugInfo = {
      id: image.id,
      filename: image.filename,
      embeddingType: typeof image.clip_embedding,
      embeddingLength: typeof image.clip_embedding === 'string' ?
                       image.clip_embedding.length :
                       JSON.stringify(image.clip_embedding).length
    };

    // Try to parse if it's a string
    if (typeof image.clip_embedding === 'string') {
      try {
        debugInfo.parsedEmbedding = JSON.parse(image.clip_embedding);
        debugInfo.parseSuccess = true;
      } catch (e) {
        debugInfo.parseError = e.message;
        debugInfo.parseSuccess = false;
      }
    } else {
      debugInfo.parsedEmbedding = image.clip_embedding;
      debugInfo.parseSuccess = true;
    }

    // Check if it's a valid array of numbers
    if (debugInfo.parseSuccess) {
      debugInfo.isArray = Array.isArray(debugInfo.parsedEmbedding);
      debugInfo.arrayLength = debugInfo.isArray ? debugInfo.parsedEmbedding.length : 0;
      debugInfo.firstElementType = debugInfo.isArray && debugInfo.arrayLength > 0 ?
                                   typeof debugInfo.parsedEmbedding[0] : 'N/A';

      // Sample values
      if (debugInfo.isArray && debugInfo.arrayLength > 0) {
        debugInfo.sampleValues = debugInfo.parsedEmbedding.slice(0, 5);
      }
    }

    res.json(debugInfo);
  } catch (error) {
    console.error('Debug embedding error:', error);
    res.status(500).json({ error: 'Failed to debug embedding' });
  }
});
app.post('/api/images/:id/regenerate-embedding', authenticateToken, authorize('uploader'), async (req, res) => {
  try {
    const imageId = req.params.id;

    const [images] = await pool.query('SELECT * FROM images WHERE id = ?', [imageId]);

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];

    if (req.user.role !== 'admin' && image.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only regenerate embeddings for your own images' });
    }

    try {
      await fs.access(image.file_path);
    } catch {
      return res.status(404).json({ error: 'Image file not found on server' });
    }

    embeddingQueue.add(imageId, image.file_path);

    res.json({
      message: 'Image added to embedding queue',
      imageId: imageId
    });

  } catch (error) {
    console.error('Regenerate embedding error:', error);
    res.status(500).json({ error: 'Failed to regenerate embedding' });
  }
});

app.post('/api/images/regenerate-all-embeddings', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [images] = await pool.query('SELECT id, file_path FROM images');

    if (images.length === 0) {
      return res.json({ message: 'No images found', queued: 0 });
    }

    for (const image of images) {
      try {
        await fs.access(image.file_path);
        embeddingQueue.add(image.id, image.file_path);
      } catch (error) {
        console.error(`Skipping image ${image.id}: file not found`);
      }
    }

    res.json({
      message: 'All images added to embedding queue',
      total: images.length,
      queued: embeddingQueue.getStats().queueLength + embeddingQueue.getStats().currentBatch.length
    });

  } catch (error) {
    console.error('Batch regenerate error:', error);
    res.status(500).json({ error: 'Failed to queue embeddings' });
  }
});

app.get('/api/images/embedding-stats', authenticateToken, async (req, res) => {
  try {
    const [totalCount] = await pool.query('SELECT COUNT(*) as count FROM images');
    const [embeddedCount] = await pool.query('SELECT COUNT(*) as count FROM images WHERE clip_embedding IS NOT NULL');
    let clipServiceStatus = false;

    try {
      await axios.get(`${CLIP_SERVICE_URL}/health`, { timeout: 3000 });
      clipServiceStatus = true;
    } catch (error) {
      clipServiceStatus = false;
    }

    const queueStats = embeddingQueue.getStats();

    res.json({
      total_images: totalCount[0].count,
      images_with_embeddings: embeddedCount[0].count,
      images_without_embeddings: totalCount[0].count - embeddedCount[0].count,
      clip_service_available: clipServiceStatus,
      queue: {
        pending: queueStats.pending,
        processing: queueStats.processing,
        processed: queueStats.processed,
        failed: queueStats.failed,
        current_batch: queueStats.currentBatch
      }
    });

  } catch (error) {
    console.error('Embedding stats error:', error);
    res.status(500).json({ error: 'Failed to fetch embedding statistics' });
  }
});

// ==================== QUEUE MANAGEMENT ROUTES ====================

app.get('/api/queue/stats', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    res.json(embeddingQueue.getStats());
  } catch (error) {
    console.error('Queue stats error:', error);
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

app.post('/api/queue/clear', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    embeddingQueue.clear();
    res.json({ message: 'Queue cleared successfully' });
  } catch (error) {
    console.error('Clear queue error:', error);
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

// ==================== ACTIVITY LOGS ROUTES ====================

app.get('/api/logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [logs] = await pool.query(`
      SELECT
        al.id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.created_at,
        u.name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM activity_logs');
    const totalLogs = countResult[0].total;

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total: totalLogs,
        totalPages: Math.ceil(totalLogs / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

app.get('/api/logs/user/:userId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT
        al.id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.created_at,
        u.name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
    `, [req.params.userId]);

    res.json({ logs });
  } catch (error) {
    console.error('Get user logs error:', error);
    res.status(500).json({ error: 'Failed to fetch user activity logs' });
  }
});

app.get('/api/logs/action/:action', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [logs] = await pool.query(`
      SELECT
        al.id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.created_at,
        u.name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.action = ?
      ORDER BY al.created_at DESC
    `, [req.params.action]);

    res.json({ logs });
  } catch (error) {
    console.error('Get action logs error:', error);
    res.status(500).json({ error: 'Failed to fetch action logs' });
  }
});

// ==================== STATISTICS ROUTES ====================

app.get('/api/stats', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [imageCount] = await pool.query('SELECT COUNT(*) as count FROM images');
    const [totalSize] = await pool.query('SELECT SUM(size) as total FROM images');
    const [themeCount] = await pool.query('SELECT COUNT(*) as count FROM themes');
    const [tagCount] = await pool.query('SELECT COUNT(*) as count FROM tags');
    const [embeddedCount] = await pool.query('SELECT COUNT(*) as count FROM images WHERE clip_embedding IS NOT NULL');
    const [metadataCount] = await pool.query('SELECT COUNT(*) as count FROM images WHERE camera_make IS NOT NULL OR gps_location_name IS NOT NULL');
    const [recentLogs] = await pool.query(`
      SELECT
        al.action,
        al.created_at,
        u.name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    res.json({
      statistics: {
        totalUsers: userCount[0].count,
        totalImages: imageCount[0].count,
        totalStorageUsed: totalSize[0].total || 0,
        totalThemes: themeCount[0].count,
        totalTags: tagCount[0].count,
        imagesWithEmbeddings: embeddedCount[0].count,
        imagesWithMetadata: metadataCount[0].count,
        recentActivity: recentLogs
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', async (req, res) => {
  const clipStatus = await checkClipService();
  const queueStats = embeddingQueue.getStats();

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    clipServiceAvailable: clipStatus,
    embeddingQueue: queueStats
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 50MB' });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await initDB();
    await initStorage();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on: http://localhost:${PORT}`);
      console.log(`📊 CLIP Service URL: ${CLIP_SERVICE_URL}`);
      console.log(`🔄 Embedding queue initialized and ready`);
      console.log(`📋 Metadata extraction enabled`);
      console.log(`🔐 Login tracking enabled`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();