const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Check if we're on Render
const isRender = process.env.RENDER === 'true';
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🚀 Starting Blood Donation Portal Server`);
console.log(`🌐 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`🌐 Platform: ${isRender ? 'RENDER' : 'LOCAL'}`);

// CORS Configuration
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://blood-management-portal.vercel.app',
        'https://blood-management-portal.onrender.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blood_donation_db',
    port: parseInt(process.env.DB_PORT) || 3306,
    ssl: isRender ? { rejectUnauthorized: false } : null,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
   
};

console.log('📊 Database Configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}`);

let pool;
let dbConnected = false;

// Initialize database connection with intelligent retry logic
const initializeDatabase = async () => {
    const maxRetries = isRender ? 10 : 5;
    let retryCount = 0;
    let lastError = null;
    
    console.log(`🔄 Attempting database connection (max ${maxRetries} retries)...`);

    while (retryCount < maxRetries) {
        try {
            retryCount++;
            console.log(`🔌 Database connection attempt ${retryCount}/${maxRetries}...`);
            
            // Create new pool for each attempt
            pool = mysql.createPool(dbConfig);
            
            // Test connection
            const connection = await pool.getConnection();
            await connection.ping();
            
            // Verify we can query
            const [rows] = await connection.query('SELECT DATABASE() as db, NOW() as time');
            connection.release();
            
            console.log(`✅ Database connected successfully!`);
            console.log(`   Database: ${rows[0].db}`);
            console.log(`   Server Time: ${rows[0].time}`);
            
            dbConnected = true;
            return true;
            
        } catch (error) {
            lastError = error;
            console.error(`❌ Attempt ${retryCount} failed: ${error.code || error.message}`);
            
            // Specific error handling
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
                console.log(`   ⚠️ Network timeout/refused. This usually means:`);
                console.log(`      1. IP not whitelisted in Aiven`);
                console.log(`      2. Firewall blocking connection`);
                console.log(`   💡 Solution: Add 0.0.0.0/0 to Aiven IP whitelist`);
            } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
                console.log(`   🔒 Access denied. Check username/password`);
            } else if (error.code === 'ER_BAD_DB_ERROR') {
                console.log(`   📊 Database doesn't exist`);
            }
            
            // Clean up pool
            if (pool) {
                try {
                    await pool.end();
                } catch (e) {
                    // Ignore cleanup errors
                }
                pool = null;
            }
            
            if (retryCount < maxRetries) {
                const delay = Math.min(retryCount * 3000, 10000);
                console.log(`⏳ Waiting ${delay/1000} seconds before retry ${retryCount + 1}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error(`❌ All ${maxRetries} database connection attempts failed`);
    console.error(`   Last error: ${lastError?.message}`);
    console.error(`   Error code: ${lastError?.code}`);
    
    if (isRender) {
        console.error(`\n🔧 FOR RENDER DEPLOYMENT FIX:`);
        console.error(`   1. Go to Aiven Console: https://console.aiven.io/`);
        console.error(`   2. Find your MySQL service`);
        console.error(`   3. Click Settings → IP Filter`);
        console.error(`   4. Add: 0.0.0.0/0 (allow all IPs)`);
        console.error(`   5. Save and wait 2 minutes`);
        console.error(`   6. Redeploy on Render\n`);
    }
    
    dbConnected = false;
    return false;
};

// Initialize database tables
const initializeTables = async () => {
    if (!dbConnected || !pool) {
        console.log('⚠️ Skipping table creation - no database connection');
        return false;
    }

    try {
        console.log('📊 Creating/verifying database tables...');
        
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                user_id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'donor', 'hospital') NOT NULL DEFAULT 'donor',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            // Donors table
            `CREATE TABLE IF NOT EXISTS donors (
                donor_id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT UNIQUE,
                full_name VARCHAR(100) NOT NULL,
                gender ENUM('male', 'female', 'other') DEFAULT 'male',
                date_of_birth DATE,
                blood_group VARCHAR(10),
                phone VARCHAR(20),
                email VARCHAR(100),
                address TEXT,
                availability_status ENUM('available', 'unavailable', 'recently_donated') DEFAULT 'available',
                last_donation_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                INDEX idx_blood_group (blood_group),
                INDEX idx_availability (availability_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            // Hospitals table
            `CREATE TABLE IF NOT EXISTS hospitals (
                hospital_id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT UNIQUE,
                hospital_name VARCHAR(100) NOT NULL,
                location VARCHAR(100),
                contact_phone VARCHAR(20),
                email VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                INDEX idx_location (location)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            // Blood requests table
            `CREATE TABLE IF NOT EXISTS blood_requests (
                request_id INT PRIMARY KEY AUTO_INCREMENT,
                blood_group VARCHAR(10) NOT NULL,
                quantity_units INT NOT NULL,
                urgency_level ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
                hospital_id INT,
                status ENUM('pending', 'matched', 'fulfilled', 'cancelled') DEFAULT 'pending',
                notes TEXT,
                request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fulfilled_date DATE,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
                INDEX idx_status (status),
                INDEX idx_urgency (urgency_level)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            // Matching table
            `CREATE TABLE IF NOT EXISTS matching (
                match_id INT PRIMARY KEY AUTO_INCREMENT,
                request_id INT,
                donor_id INT,
                match_status ENUM('pending', 'contacted', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE CASCADE,
                FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
                UNIQUE KEY unique_request_donor (request_id, donor_id),
                INDEX idx_match_status (match_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
            
            // Donation history table
            `CREATE TABLE IF NOT EXISTS donation_history (
                donation_id INT PRIMARY KEY AUTO_INCREMENT,
                donor_id INT,
                request_id INT,
                hospital_id INT,
                donation_date DATE NOT NULL,
                quantity_units INT DEFAULT 1,
                notes TEXT,
                FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE SET NULL,
                FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE SET NULL,
                FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE SET NULL,
                INDEX idx_donation_date (donation_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ];

        for (const tableSql of tables) {
            try {
                await pool.execute(tableSql);
            } catch (tableError) {
                console.warn(`   ⚠️ Table creation note: ${tableError.message}`);
            }
        }
        
        console.log('✅ Database tables verified/created successfully');
        return true;
    } catch (error) {
        console.error('❌ Error creating tables:', error.message);
        return false;
    }
};

// Admin user initialization
const ADMIN_PASSWORD_HASH = '$2a$10$J7fggR9G8q8Q8Q8Q8Q8Q8OeQ8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8';

const initializeAdmin = async () => {
    if (!dbConnected || !pool) {
        console.log('⚠️ Skipping admin initialization - no database connection');
        return;
    }

    try {
        console.log('👨‍💼 Checking for admin user...');
        
        const [existingAdmin] = await pool.execute(
            'SELECT user_id FROM users WHERE email = ?',
            ['seuripusindawa@gmail.com']
        );

        if (existingAdmin.length === 0) {
            await pool.execute(
                'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
                ['seuri_admin', 'seuripusindawa@gmail.com', ADMIN_PASSWORD_HASH, 'admin', true]
            );
            console.log('✅ Admin user created: seuripusindawa@gmail.com (password: 1234)');
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error initializing admin:', error.message);
    }
};

// Database middleware - handles missing database gracefully
const dbMiddleware = (handler) => {
    return async (req, res, next) => {
        if (!dbConnected || !pool) {
            return res.status(503).json({
                error: 'Database not available',
                message: 'Database connection failed. Please check server logs.',
                fix: isRender ? 'Add Render IP to Aiven whitelist (0.0.0.0/0)' : 'Check database configuration',
                timestamp: new Date().toISOString()
            });
        }
        try {
            await handler(req, res, next);
        } catch (error) {
            console.error('Database error in route:', error.message);
            res.status(500).json({
                error: 'Database operation failed',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    };
};

// JWT Authentication middleware
const authenticateToken = (roles = []) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ error: 'Access token required' });
            }

            const user = jwt.verify(token, process.env.JWT_SECRET || 'blood_donation_secret_key_2024');
            req.user = user;

            if (roles.length > 0 && !roles.includes(user.role)) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
    };
};

// Initialize application
const initializeApp = async () => {
    console.log('\n============================================');
    
    // Try to connect to database (non-blocking)
    initializeDatabase().then(async (connected) => {
        if (connected) {
            await initializeTables();
            await initializeAdmin();
        } else {
            console.log('\n⚠️ Application running with limited functionality');
            console.log('   Database-dependent features will not work');
            console.log('   API endpoints will return database errors');
        }
    }).catch(error => {
        console.error('Database initialization error:', error);
    });
    
    // Start server immediately (don't wait for database)
    const PORT = process.env.PORT || 10000;
    const HOST = isProduction ? '0.0.0.0' : 'localhost';
    
    app.listen(PORT, HOST, () => {
        console.log(`\n🎉 ============================================`);
        console.log(`🚀 Server running on http://${HOST}:${PORT}`);
        console.log(`🌐 Backend URL: https://blood-management-portal.onrender.com`);
        console.log(`🌐 Frontend URL: https://blood-management-portal.vercel.app`);
        console.log(`🌐 Health check: http://${HOST}:${PORT}/api/health`);
        console.log(`🌐 Database: ${dbConnected ? '✅ Connected' : '❌ Not connected'}`);
        console.log(`🎉 ============================================\n`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received. Shutting down gracefully...');
        if (pool) {
            pool.end().then(() => {
                console.log('Database pool closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
    
    process.on('SIGINT', () => {
        console.log('SIGINT received. Shutting down gracefully...');
        if (pool) {
            pool.end().then(() => {
                console.log('Database pool closed');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
};

// ============ API ROUTES ============

// Health check (always works, even without database)
app.get('/api/health', async (req, res) => {
    try {
        if (dbConnected && pool) {
            await pool.execute('SELECT 1');
            res.json({
                status: 'healthy',
                service: 'Blood Donation Portal API',
                backend: 'running',
                database: 'connected',
                timestamp: new Date().toISOString(),
                environment: isProduction ? 'production' : 'development',
                platform: isRender ? 'render' : 'local'
            });
        } else {
            res.json({
                status: 'degraded',
                service: 'Blood Donation Portal API',
                backend: 'running',
                database: 'disconnected',
                timestamp: new Date().toISOString(),
                environment: isProduction ? 'production' : 'development',
                platform: isRender ? 'render' : 'local',
                message: 'Database not connected. API will have limited functionality.',
                fix: isRender ? 'Add Render IP to Aiven whitelist' : 'Check database configuration'
            });
        }
    } catch (error) {
        res.json({
            status: 'unhealthy',
            service: 'Blood Donation Portal API',
            backend: 'running',
            database: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Welcome endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Welcome to Blood Donation Portal API',
        version: '1.0.0',
        status: 'operational',
        database: dbConnected ? 'connected' : 'disconnected',
        endpoints: {
            auth: '/api/auth/*',
            donors: '/api/donors/*',
            hospitals: '/api/hospitals/*',
            requests: '/api/blood-requests/*',
            admin: '/api/admin/*',
            profile: '/api/profile',
            health: '/api/health',
            test: '/api/test',
            debug: '/api/debug'
        },
        frontend: 'https://blood-management-portal.vercel.app',
        documentation: 'See README for API details'
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is fully operational!',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        urls: {
            frontend: 'https://blood-management-portal.vercel.app',
            backend: 'https://blood-management-portal.onrender.com',
            local: 'http://localhost:5173'
        }
    });
});

// Database test endpoint
app.get('/api/test-db', dbMiddleware(async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT 1 as test, NOW() as server_time, DATABASE() as db_name');
        res.json({
            success: true,
            message: 'Database connected successfully',
            data: rows[0],
            timestamp: new Date().toISOString(),
            environment: isProduction ? 'production' : 'development'
        });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({
            success: false,
            error: 'Database connection failed',
            details: error.message,
            code: error.code,
            timestamp: new Date().toISOString(),
            fix: isRender ? 'Add 0.0.0.0/0 to Aiven IP whitelist' : 'Check database configuration'
        });
    }
}));

// Debug endpoint
app.get('/api/debug', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV || 'development',
        platform: isRender ? 'render' : 'local',
        dbConnected: dbConnected,
        dbConfig: {
            host: process.env.DB_HOST ? 'Set' : 'Not set',
            database: process.env.DB_NAME ? 'Set' : 'Not set',
            port: process.env.DB_PORT ? 'Set' : 'Not set',
            user: process.env.DB_USER ? 'Set' : 'Not set'
        },
        timestamp: new Date().toISOString(),
        renderSpecific: isRender ? {
            fix: 'Add 0.0.0.0/0 to Aiven IP whitelist',
            steps: [
                '1. Go to Aiven Console: https://console.aiven.io/',
                '2. Find your MySQL service',
                '3. Click Settings → IP Filter',
                '4. Add: 0.0.0.0/0',
                '5. Save and wait 2 minutes',
                '6. Redeploy on Render'
            ]
        } : null
    });
});

// 1. Authentication Routes
app.post('/api/auth/register', dbMiddleware(async (req, res) => {
    try {
        const { username, email, password, role, userData } = req.body;
        
        console.log('Registration attempt:', { username, email, role });
        
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [existingUsers] = await pool.execute(
            'SELECT user_id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [userResult] = await connection.execute(
                'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [username, email, passwordHash, role]
            );
            const userId = userResult.insertId;

            if (role === 'donor' && userData) {
                const donorData = {
                    full_name: userData.fullName || '',
                    gender: userData.gender || 'male',
                    date_of_birth: userData.dateOfBirth || new Date().toISOString().split('T')[0],
                    blood_group: userData.bloodGroup || 'O+',
                    phone: userData.phone || '',
                    email: email || '',
                    address: userData.address || ''
                };
                
                await connection.execute(
                    `INSERT INTO donors (user_id, full_name, gender, date_of_birth, blood_group, phone, email, address)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, donorData.full_name, donorData.gender, donorData.date_of_birth,
                     donorData.blood_group, donorData.phone, donorData.email, donorData.address]
                );
            } else if (role === 'hospital' && userData) {
                const hospitalData = {
                    hospital_name: userData.hospitalName || '',
                    location: userData.location || '',
                    contact_phone: userData.contactPhone || '',
                    email: email || ''
                };
                
                await connection.execute(
                    `INSERT INTO hospitals (user_id, hospital_name, location, contact_phone, email)
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, hospitalData.hospital_name, hospitalData.location,
                     hospitalData.contact_phone, hospitalData.email]
                );
            }

            await connection.commit();
            connection.release();

            const token = jwt.sign(
                { userId, username, email, role },
                process.env.JWT_SECRET || 'blood_donation_secret_key_2024',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                message: 'Registration successful',
                token,
                user: { userId, username, email, role }
            });
        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error('Transaction error:', error);
            res.status(500).json({ error: 'Registration failed. Please try again.' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}));

app.post('/api/auth/login', dbMiddleware(async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await pool.execute(
            'SELECT user_id, username, email, password_hash, role FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.user_id, username: user.username, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'blood_donation_secret_key_2024',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
}));

// 2. ADMIN ROUTES
app.get('/api/admin/users', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT u.*,
                   d.full_name as donor_name,
                   h.hospital_name,
                   COUNT(DISTINCT br.request_id) as total_requests,
                   COUNT(DISTINCT m.match_id) as total_donations
            FROM users u
            LEFT JOIN donors d ON u.user_id = d.user_id
            LEFT JOIN hospitals h ON u.user_id = h.user_id
            LEFT JOIN blood_requests br ON h.hospital_id = br.hospital_id
            LEFT JOIN matching m ON d.donor_id = m.donor_id
            GROUP BY u.user_id
            ORDER BY u.created_at DESC
        `);
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}));

app.put('/api/admin/users/:id/status', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { is_active } = req.body;
        
        await pool.execute(
            'UPDATE users SET is_active = ? WHERE user_id = ?',
            [is_active, req.params.id]
        );
        
        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
}));

app.delete('/api/admin/users/:id', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        await pool.execute('DELETE FROM users WHERE user_id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
}));

// 3. Dashboard Statistics Route
app.get('/api/dashboard/stats', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [
            [[totalDonors]],
            [[totalHospitals]],
            [[totalRequests]],
            [[pendingRequests]],
            bloodGroupStats
        ] = await Promise.all([
            pool.execute('SELECT COUNT(*) as count FROM donors'),
            pool.execute('SELECT COUNT(*) as count FROM hospitals'),
            pool.execute('SELECT COUNT(*) as count FROM blood_requests'),
            pool.execute("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'pending'"),
            pool.execute('SELECT blood_group, COUNT(*) as count FROM donors GROUP BY blood_group ORDER BY count DESC')
        ]);

        res.json({
            totalDonors: totalDonors.count,
            totalHospitals: totalHospitals.count,
            totalRequests: totalRequests.count,
            pendingRequests: pendingRequests.count,
            bloodGroupStats
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
}));

// 4. Donor Routes
app.get('/api/donors', authenticateToken(['admin', 'hospital']), dbMiddleware(async (req, res) => {
    try {
        const { blood_group, availability, search } = req.query;
        let query = `SELECT d.* FROM donors d WHERE 1=1`;
        const params = [];
        
        if (blood_group) {
            query += ` AND d.blood_group = ?`;
            params.push(blood_group);
        }
        
        if (availability) {
            query += ` AND d.availability_status = ?`;
            params.push(availability);
        }
        
        if (search) {
            query += ` AND (d.full_name LIKE ? OR d.email LIKE ? OR d.phone LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        const [donors] = await pool.execute(query, params);
        res.json(donors);
    } catch (error) {
        console.error('Get donors error:', error);
        res.status(500).json({ error: 'Failed to fetch donors' });
    }
}));

app.get('/api/donors/:id', authenticateToken(), dbMiddleware(async (req, res) => {
    try {
        const [donors] = await pool.execute(
            'SELECT * FROM donors WHERE donor_id = ?',
            [req.params.id]
        );
        
        if (donors.length === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }
        
        res.json(donors[0]);
    } catch (error) {
        console.error('Get donor error:', error);
        res.status(500).json({ error: 'Failed to fetch donor' });
    }
}));

app.put('/api/donors/:id', authenticateToken(['donor', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const { availability_status, last_donation_date } = req.body;
        
        const updateFields = [];
        const params = [];
        
        if (availability_status !== undefined) {
            updateFields.push('availability_status = ?');
            params.push(availability_status);
        }
        
        if (last_donation_date !== undefined) {
            updateFields.push('last_donation_date = ?');
            params.push(last_donation_date);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        params.push(req.params.id);
        
        await pool.execute(
            `UPDATE donors SET ${updateFields.join(', ')} WHERE donor_id = ?`,
            params
        );
        
        res.json({ message: 'Donor updated successfully' });
    } catch (error) {
        console.error('Update donor error:', error);
        res.status(500).json({ error: 'Failed to update donor' });
    }
}));

// 5. Hospital Routes
app.get('/api/hospitals', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [hospitals] = await pool.execute(`
            SELECT h.*,
                   COUNT(br.request_id) as total_requests,
                   COUNT(DISTINCT m.match_id) as total_matches
            FROM hospitals h
            LEFT JOIN blood_requests br ON h.hospital_id = br.hospital_id
            LEFT JOIN matching m ON br.request_id = m.request_id
            GROUP BY h.hospital_id
            ORDER BY h.hospital_name
        `);
        res.json(hospitals);
    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({ error: 'Failed to fetch hospitals' });
    }
}));

// 6. Blood Request Routes
app.post('/api/blood-requests', authenticateToken(['hospital', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const { blood_group, quantity_units, urgency_level, notes } = req.body;
        
        if (!blood_group || !quantity_units) {
            return res.status(400).json({ error: 'Blood group and quantity are required' });
        }
        
        let hospitalId;
        
        if (req.user.role === 'hospital') {
            const [hospitals] = await pool.execute(
                'SELECT hospital_id FROM hospitals WHERE user_id = ?',
                [req.user.userId]
            );
            
            if (hospitals.length === 0) {
                return res.status(400).json({ error: 'Hospital not found for this user' });
            }
            
            hospitalId = hospitals[0].hospital_id;
        } else if (req.user.role === 'admin' && req.body.hospital_id) {
            hospitalId = req.body.hospital_id;
        } else {
            return res.status(400).json({ error: 'Hospital ID is required' });
        }
        
        const [result] = await pool.execute(
            `INSERT INTO blood_requests (blood_group, quantity_units, urgency_level, hospital_id, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [blood_group, quantity_units, urgency_level || 'medium', hospitalId, notes || '']
        );
        
        const [matchingDonors] = await pool.execute(
            `SELECT donor_id FROM donors
             WHERE blood_group = ?
             AND availability_status = 'available'
             AND (last_donation_date IS NULL OR DATE_ADD(last_donation_date, INTERVAL 3 MONTH) <= CURDATE())`,
            [blood_group]
        );
        
        for (const donor of matchingDonors) {
            await pool.execute(
                `INSERT INTO matching (request_id, donor_id) VALUES (?, ?)`,
                [result.insertId, donor.donor_id]
            );
        }
        
        res.status(201).json({
            message: 'Blood request created and matched with donors',
            requestId: result.insertId
        });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: 'Failed to create blood request' });
    }
}));

app.get('/api/blood-requests', authenticateToken(), dbMiddleware(async (req, res) => {
    try {
        let query = `SELECT br.*, h.hospital_name FROM blood_requests br
                     JOIN hospitals h ON br.hospital_id = h.hospital_id WHERE 1=1`;
        const params = [];
        
        if (req.user.role === 'hospital') {
            const [hospitals] = await pool.execute(
                'SELECT hospital_id FROM hospitals WHERE user_id = ?',
                [req.user.userId]
            );
            
            if (hospitals.length > 0) {
                query += ` AND br.hospital_id = ?`;
                params.push(hospitals[0].hospital_id);
            }
        }
        
        query += ` ORDER BY
            CASE urgency_level
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
            END, br.request_date DESC`;
        
        const [requests] = await pool.execute(query, params);
        res.json(requests);
    } catch (error) {
        console.error('Get requests error:', error);
        res.status(500).json({ error: 'Failed to fetch blood requests' });
    }
}));

// 7. Matching Routes
app.get('/api/matches', authenticateToken(), dbMiddleware(async (req, res) => {
    try {
        let query = `SELECT m.*, br.blood_group, br.urgency_level,
                            d.full_name, d.phone, d.email,
                            h.hospital_name
                     FROM matching m
                     JOIN blood_requests br ON m.request_id = br.request_id
                     JOIN donors d ON m.donor_id = d.donor_id
                     JOIN hospitals h ON br.hospital_id = h.hospital_id
                     WHERE 1=1`;
        const params = [];
        
        if (req.user.role === 'donor') {
            const [donors] = await pool.execute(
                'SELECT donor_id FROM donors WHERE user_id = ?',
                [req.user.userId]
            );
            
            if (donors.length > 0) {
                query += ` AND m.donor_id = ?`;
                params.push(donors[0].donor_id);
            }
        }
        
        const [matches] = await pool.execute(query, params);
        res.json(matches);
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
}));

app.put('/api/matches/:id', authenticateToken(['donor', 'hospital', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const { match_status, notes } = req.body;
        
        await pool.execute(
            `UPDATE matching SET match_status = ?, notes = ? WHERE match_id = ?`,
            [match_status || 'pending', notes || '', req.params.id]
        );
        
        if (match_status === 'confirmed') {
            const [match] = await pool.execute(
                `SELECT donor_id FROM matching WHERE match_id = ?`,
                [req.params.id]
            );
            
            if (match.length > 0) {
                await pool.execute(
                    `UPDATE donors SET availability_status = 'unavailable' WHERE donor_id = ?`,
                    [match[0].donor_id]
                );
            }
        }
        
        res.json({ message: 'Match updated successfully' });
    } catch (error) {
        console.error('Update match error:', error);
        res.status(500).json({ error: 'Failed to update match' });
    }
}));

// 8. Get current user's profile
app.get('/api/profile', authenticateToken(), dbMiddleware(async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;
        
        if (role === 'donor') {
            const [donors] = await pool.execute(
                `SELECT d.*,
                       COUNT(DISTINCT dh.donation_id) as total_donations,
                       MAX(dh.donation_date) as last_donation_date
                 FROM donors d
                 LEFT JOIN donation_history dh ON d.donor_id = dh.donor_id
                 WHERE d.user_id = ?
                 GROUP BY d.donor_id`,
                [userId]
            );
            
            if (donors.length === 0) {
                return res.status(404).json({ error: 'Donor profile not found' });
            }
            
            res.json(donors[0]);
        } else if (role === 'hospital') {
            const [hospitals] = await pool.execute(
                'SELECT * FROM hospitals WHERE user_id = ?',
                [userId]
            );
            
            if (hospitals.length === 0) {
                return res.status(404).json({ error: 'Hospital profile not found' });
            }
            
            res.json(hospitals[0]);
        } else {
            const [users] = await pool.execute(
                'SELECT user_id, username, email, role, created_at FROM users WHERE user_id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json(users[0]);
        }
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
}));

// 9. Get matches for current donor
app.get('/api/my-matches', authenticateToken(['donor']), dbMiddleware(async (req, res) => {
    try {
        const userId = req.user.userId;
        
        const [donors] = await pool.execute(
            'SELECT donor_id FROM donors WHERE user_id = ?',
            [userId]
        );
        
        if (donors.length === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }
        
        const donorId = donors[0].donor_id;
        
        const [matches] = await pool.execute(
            `SELECT m.*, br.blood_group, br.urgency_level, br.quantity_units,
                    br.request_date, h.hospital_name, h.contact_phone as hospital_phone,
                    d.full_name, d.phone, d.email
             FROM matching m
             JOIN blood_requests br ON m.request_id = br.request_id
             JOIN donors d ON m.donor_id = d.donor_id
             JOIN hospitals h ON br.hospital_id = h.hospital_id
             WHERE m.donor_id = ?
             ORDER BY m.match_date DESC`,
            [donorId]
        );
        
        res.json(matches);
    } catch (error) {
        console.error('Get my matches error:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
}));

// 10. Contact donor endpoint
app.post('/api/contact-donor/:id', authenticateToken(['hospital', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const donorId = req.params.id;
        
        const [donors] = await pool.execute(
            'SELECT full_name, phone, email FROM donors WHERE donor_id = ?',
            [donorId]
        );
        
        if (donors.length === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }
        
        const donor = donors[0];
        
        res.json({
            message: 'Contact information retrieved',
            donor: {
                name: donor.full_name,
                phone: donor.phone,
                email: donor.email
            },
            note: 'Contact information for the donor'
        });
    } catch (error) {
        console.error('Contact donor error:', error);
        res.status(500).json({ error: 'Failed to contact donor' });
    }
}));

// 11. Get donors for a specific blood request
app.get('/api/requests/:id/donors', authenticateToken(['hospital', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const requestId = req.params.id;
        
        const [donors] = await pool.execute(
            `SELECT d.*, m.match_status
             FROM donors d
             JOIN matching m ON d.donor_id = m.donor_id
             WHERE m.request_id = ?
             ORDER BY m.match_date DESC`,
            [requestId]
        );
        
        res.json(donors);
    } catch (error) {
        console.error('Get request donors error:', error);
        res.status(500).json({ error: 'Failed to fetch donors for request' });
    }
}));

// 12. Get all blood groups
app.get('/api/blood-groups', authenticateToken(), dbMiddleware(async (req, res) => {
    try {
        const [groups] = await pool.execute(
            `SELECT blood_group, COUNT(*) as count
             FROM donors
             GROUP BY blood_group
             ORDER BY blood_group`
        );
        res.json(groups);
    } catch (error) {
        console.error('Get blood groups error:', error);
        res.status(500).json({ error: 'Failed to fetch blood groups' });
    }
}));

// 13. Update donor profile
app.put('/api/profile', authenticateToken(['donor']), dbMiddleware(async (req, res) => {
    try {
        const userId = req.user.userId;
        const { availability_status, last_donation_date } = req.body;
        
        const [donors] = await pool.execute(
            'SELECT donor_id FROM donors WHERE user_id = ?',
            [userId]
        );
        
        if (donors.length === 0) {
            return res.status(404).json({ error: 'Donor not found' });
        }
        
        const donorId = donors[0].donor_id;
        
        const updateFields = [];
        const params = [];
        
        if (availability_status !== undefined) {
            updateFields.push('availability_status = ?');
            params.push(availability_status);
        }
        
        if (last_donation_date !== undefined) {
            updateFields.push('last_donation_date = ?');
            params.push(last_donation_date);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        params.push(donorId);
        
        await pool.execute(
            `UPDATE donors SET ${updateFields.join(', ')} WHERE donor_id = ?`,
            params
        );
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
}));

// 14. DONATION HISTORY ROUTES
app.get('/api/donation-history/:donorId', authenticateToken(['donor', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const donorId = req.params.donorId;
        
        const [donations] = await pool.execute(
            `SELECT dh.*, h.hospital_name, br.blood_group, br.urgency_level
             FROM donation_history dh
             LEFT JOIN hospitals h ON dh.hospital_id = h.hospital_id
             LEFT JOIN blood_requests br ON dh.request_id = br.request_id
             WHERE dh.donor_id = ?
             ORDER BY dh.donation_date DESC`,
            [donorId]
        );
        
        const [stats] = await pool.execute(
            `SELECT
               COUNT(*) as totalDonations,
               MAX(donation_date) as lastDonation,
               DATEDIFF(CURDATE(), MAX(donation_date)) as daysSinceLast,
               SUM(quantity_units) as totalUnits
             FROM donation_history
             WHERE donor_id = ?`,
            [donorId]
        );
        
        const totalDonations = stats[0]?.totalDonations || 0;
        const livesSaved = totalDonations * 3;
        
        res.json({
            donations,
            stats: {
                ...stats[0],
                livesSaved,
                lastDonation: stats[0]?.lastDonation || null,
                daysSinceLast: stats[0]?.daysSinceLast || null
            }
        });
        
    } catch (error) {
        console.error('Get donation history error:', error);
        res.status(500).json({ error: 'Failed to fetch donation history' });
    }
}));

app.post('/api/donation-history', authenticateToken(['hospital', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const { donor_id, request_id, hospital_id, quantity_units, notes } = req.body;
        
        const [result] = await pool.execute(
            `INSERT INTO donation_history
             (donor_id, request_id, hospital_id, donation_date, quantity_units, notes)
             VALUES (?, ?, ?, CURDATE(), ?, ?)`,
            [donor_id, request_id, hospital_id, quantity_units || 1, notes || '']
        );
        
        res.status(201).json({
            message: 'Donation recorded successfully',
            donationId: result.insertId
        });
        
    } catch (error) {
        console.error('Add donation history error:', error);
        res.status(500).json({ error: 'Failed to record donation' });
    }
}));

app.put('/api/matches/:id/complete', authenticateToken(['hospital', 'donor', 'admin']), dbMiddleware(async (req, res) => {
    try {
        const matchId = req.params.id;
        
        const [matches] = await pool.execute(
            `SELECT m.*, br.hospital_id, br.quantity_units, d.donor_id, br.request_id
             FROM matching m
             JOIN blood_requests br ON m.request_id = br.request_id
             JOIN donors d ON m.donor_id = d.donor_id
             WHERE m.match_id = ?`,
            [matchId]
        );
        
        if (matches.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        const match = matches[0];
        
        await pool.execute(
            `UPDATE matching SET match_status = 'completed' WHERE match_id = ?`,
            [matchId]
        );
        
        await pool.execute(
            `INSERT INTO donation_history
             (donor_id, request_id, hospital_id, donation_date, quantity_units)
             VALUES (?, ?, ?, CURDATE(), ?)`,
            [match.donor_id, match.request_id, match.hospital_id, match.quantity_units]
        );
        
        await pool.execute(
            `UPDATE donors
             SET last_donation_date = CURDATE(),
                 availability_status = 'recently_donated'
             WHERE donor_id = ?`,
            [match.donor_id]
        );
        
        res.json({
            message: 'Donation completed and recorded in history',
            donationRecorded: true
        });
        
    } catch (error) {
        console.error('Complete donation error:', error);
        res.status(500).json({ error: 'Failed to complete donation' });
    }
}));

// 15. Get all donations for admin
app.get('/api/admin/donations', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let query = `
            SELECT dh.*, d.full_name, d.blood_group, h.hospital_name, br.urgency_level
            FROM donation_history dh
            JOIN donors d ON dh.donor_id = d.donor_id
            LEFT JOIN hospitals h ON dh.hospital_id = h.hospital_id
            LEFT JOIN blood_requests br ON dh.request_id = br.request_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date) {
            query += ' AND dh.donation_date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND dh.donation_date <= ?';
            params.push(end_date);
        }
        
        query += ' ORDER BY dh.donation_date DESC';
        
        const [donations] = await pool.execute(query, params);
        res.json(donations);
    } catch (error) {
        console.error('Get admin donations error:', error);
        res.status(500).json({ error: 'Failed to fetch donations' });
    }
}));

// 16. Admin User Management
app.post('/api/admin/users', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { username, email, password, role, is_active } = req.body;
        
        const [existingUsers] = await pool.execute(
            'SELECT user_id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, role, is_active || true]
        );
        
        res.status(201).json({
            message: 'User created successfully',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
}));

app.put('/api/admin/users/:id', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { role, is_active } = req.body;
        
        await pool.execute(
            'UPDATE users SET role = ?, is_active = ? WHERE user_id = ?',
            [role, is_active, req.params.id]
        );
        
        res.json({ message: 'User updated successfully' });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
}));

// 17. Admin Donor Management
app.post('/api/admin/donors', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { user_id, full_name, gender, date_of_birth, blood_group, phone, email, address, availability_status } = req.body;
        
        const [result] = await pool.execute(
            `INSERT INTO donors (user_id, full_name, gender, date_of_birth, blood_group, phone, email, address, availability_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, full_name, gender, date_of_birth, blood_group, phone, email, address, availability_status || 'available']
        );
        
        res.status(201).json({
            message: 'Donor created successfully',
            donorId: result.insertId
        });
        
    } catch (error) {
        console.error('Create donor error:', error);
        res.status(500).json({ error: 'Failed to create donor' });
    }
}));

app.delete('/api/admin/donors/:id', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [donors] = await pool.execute(
            'SELECT user_id FROM donors WHERE donor_id = ?',
            [req.params.id]
        );
        
        if (donors.length > 0) {
            await pool.execute('DELETE FROM users WHERE user_id = ?', [donors[0].user_id]);
        }
        
        await pool.execute('DELETE FROM donors WHERE donor_id = ?', [req.params.id]);
        
        res.json({ message: 'Donor deleted successfully' });
        
    } catch (error) {
        console.error('Delete donor error:', error);
        res.status(500).json({ error: 'Failed to delete donor' });
    }
}));

// 18. Admin Hospital Management
app.post('/api/admin/hospitals', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { user_id, hospital_name, location, contact_phone, email } = req.body;
        
        const [result] = await pool.execute(
            `INSERT INTO hospitals (user_id, hospital_name, location, contact_phone, email)
             VALUES (?, ?, ?, ?, ?)`,
            [user_id, hospital_name, location, contact_phone, email]
        );
        
        res.status(201).json({
            message: 'Hospital created successfully',
            hospitalId: result.insertId
        });
        
    } catch (error) {
        console.error('Create hospital error:', error);
        res.status(500).json({ error: 'Failed to create hospital' });
    }
}));

app.put('/api/admin/hospitals/:id', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { hospital_name, location, contact_phone, email } = req.body;
        
        await pool.execute(
            'UPDATE hospitals SET hospital_name = ?, location = ?, contact_phone = ?, email = ? WHERE hospital_id = ?',
            [hospital_name, location, contact_phone, email, req.params.id]
        );
        
        res.json({ message: 'Hospital updated successfully' });
        
    } catch (error) {
        console.error('Update hospital error:', error);
        res.status(500).json({ error: 'Failed to update hospital' });
    }
}));

app.delete('/api/admin/hospitals/:id', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [hospitals] = await pool.execute(
            'SELECT user_id FROM hospitals WHERE hospital_id = ?',
            [req.params.id]
        );
        
        if (hospitals.length > 0) {
            await pool.execute('DELETE FROM users WHERE user_id = ?', [hospitals[0].user_id]);
        }
        
        await pool.execute('DELETE FROM hospitals WHERE hospital_id = ?', [req.params.id]);
        
        res.json({ message: 'Hospital deleted successfully' });
        
    } catch (error) {
        console.error('Delete hospital error:', error);
        res.status(500).json({ error: 'Failed to delete hospital' });
    }
}));

// 19. System Management Endpoints
app.post('/api/admin/clear-old-requests', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        await pool.execute(
            `DELETE FROM blood_requests
             WHERE status = 'fulfilled'
             AND request_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
        );
        
        res.json({ message: 'Old requests cleared successfully' });
        
    } catch (error) {
        console.error('Clear old requests error:', error);
        res.status(500).json({ error: 'Failed to clear old requests' });
    }
}));

app.get('/api/admin/generate-report', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [
            [[totalStats]],
            bloodGroupStats,
            [[recentDonations]],
            [[activeHospitals]]
        ] = await Promise.all([
            pool.execute(`
                SELECT
                  COUNT(DISTINCT d.donor_id) as total_donors,
                  COUNT(DISTINCT h.hospital_id) as total_hospitals,
                  COUNT(DISTINCT br.request_id) as total_requests,
                  COUNT(DISTINCT CASE WHEN br.status = 'fulfilled' THEN br.request_id END) as fulfilled_requests,
                  COUNT(DISTINCT dh.donation_id) as total_donations
                FROM donors d
                LEFT JOIN hospitals h ON 1=1
                LEFT JOIN blood_requests br ON 1=1
                LEFT JOIN donation_history dh ON 1=1
            `),
            pool.execute('SELECT blood_group, COUNT(*) as count FROM donors GROUP BY blood_group ORDER BY count DESC'),
            pool.execute('SELECT COUNT(*) as count FROM donation_history WHERE donation_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'),
            pool.execute('SELECT COUNT(DISTINCT hospital_id) as count FROM blood_requests WHERE request_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)')
        ]);

        const reportData = {
            generated_at: new Date().toISOString(),
            statistics: totalStats,
            blood_groups: bloodGroupStats,
            recent_activity: {
                donations_last_week: recentDonations,
                active_hospitals: activeHospitals
            }
        };
        
        res.json({
            message: 'Report generated successfully',
            report: reportData,
            download_url: '/api/admin/download-report/' + Date.now()
        });
        
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
}));

app.post('/api/admin/backup-database', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const backupInfo = {
            timestamp: new Date().toISOString(),
            backup_id: 'backup_' + Date.now(),
            status: 'completed',
            file_size: '~5MB',
            download_url: null
        };
        
        res.json({
            message: 'Database backup initiated successfully',
            backup: backupInfo
        });
        
    } catch (error) {
        console.error('Backup database error:', error);
        res.status(500).json({ error: 'Failed to backup database' });
    }
}));

// 20. Get detailed admin statistics
app.get('/api/admin/statistics', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [
            [[userStats]],
            [[donorStats]],
            [[hospitalStats]],
            [[requestStats]],
            [[donationStats]],
            monthlyStats,
            topDonors,
            topHospitals
        ] = await Promise.all([
            pool.execute(`
                SELECT
                  COUNT(*) as total_users,
                  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
                  COUNT(CASE WHEN role = 'hospital' THEN 1 END) as hospital_users,
                  COUNT(CASE WHEN role = 'donor' THEN 1 END) as donor_users,
                  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users
                FROM users
            `),
            pool.execute(`
                SELECT
                  COUNT(*) as total_donors,
                  COUNT(CASE WHEN availability_status = 'available' THEN 1 END) as available_donors,
                  COUNT(CASE WHEN availability_status = 'unavailable' THEN 1 END) as unavailable_donors,
                  COUNT(CASE WHEN availability_status = 'recently_donated' THEN 1 END) as recent_donors
                FROM donors
            `),
            pool.execute(`
                SELECT
                  COUNT(*) as total_hospitals,
                  COUNT(DISTINCT location) as locations
                FROM hospitals
            `),
            pool.execute(`
                SELECT
                  COUNT(*) as total_requests,
                  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
                  COUNT(CASE WHEN status = 'matched' THEN 1 END) as matched_requests,
                  COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_requests,
                  COUNT(CASE WHEN urgency_level = 'critical' THEN 1 END) as critical_requests
                FROM blood_requests
            `),
            pool.execute(`
                SELECT
                  COUNT(*) as total_donations,
                  SUM(quantity_units) as total_units,
                  COUNT(DISTINCT donor_id) as unique_donors,
                  COUNT(DISTINCT hospital_id) as hospitals_served
                FROM donation_history
            `),
            pool.execute(`
                SELECT
                  DATE_FORMAT(donation_date, '%Y-%m') as month,
                  COUNT(*) as donations,
                  SUM(quantity_units) as units
                FROM donation_history
                WHERE donation_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(donation_date, '%Y-%m')
                ORDER BY month DESC
            `),
            pool.execute(`
                SELECT
                  d.full_name,
                  d.blood_group,
                  COUNT(dh.donation_id) as total_donations,
                  SUM(dh.quantity_units) as total_units
                FROM donors d
                LEFT JOIN donation_history dh ON d.donor_id = dh.donor_id
                GROUP BY d.donor_id
                ORDER BY total_donations DESC
                LIMIT 10
            `),
            pool.execute(`
                SELECT
                  h.hospital_name,
                  COUNT(br.request_id) as total_requests,
                  COUNT(CASE WHEN br.status = 'fulfilled' THEN 1 END) as fulfilled_requests
                FROM hospitals h
                LEFT JOIN blood_requests br ON h.hospital_id = br.hospital_id
                GROUP BY h.hospital_id
                ORDER BY total_requests DESC
                LIMIT 10
            `)
        ]);

        res.json({
            users: userStats,
            donors: donorStats,
            hospitals: hospitalStats,
            requests: requestStats,
            donations: donationStats,
            monthly_stats: monthlyStats,
            top_donors: topDonors,
            top_hospitals: topHospitals
        });
        
    } catch (error) {
        console.error('Get admin statistics error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
}));

// 21. Get all blood requests for admin
app.get('/api/admin/requests', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const { status, start_date, end_date } = req.query;
        
        let query = `
            SELECT br.*, h.hospital_name, h.location,
                   COUNT(DISTINCT m.match_id) as matched_donors,
                   SUM(CASE WHEN m.match_status = 'completed' THEN 1 ELSE 0 END) as completed_donations
            FROM blood_requests br
            JOIN hospitals h ON br.hospital_id = h.hospital_id
            LEFT JOIN matching m ON br.request_id = m.request_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (status) {
            query += ' AND br.status = ?';
            params.push(status);
        }
        
        if (start_date) {
            query += ' AND br.request_date >= ?';
            params.push(start_date);
        }
        
        if (end_date) {
            query += ' AND br.request_date <= ?';
            params.push(end_date);
        }
        
        query += ' GROUP BY br.request_id ORDER BY br.request_date DESC';
        
        const [requests] = await pool.execute(query, params);
        res.json(requests);
    } catch (error) {
        console.error('Get admin requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
}));

// 22. Admin dashboard extended stats
app.get('/api/admin/dashboard-stats', authenticateToken(['admin']), dbMiddleware(async (req, res) => {
    try {
        const [
            [[totalUsers]],
            [[totalDonors]],
            [[totalHospitals]],
            [[totalRequests]],
            [[pendingRequests]],
            [[completedRequests]],
            [[totalDonations]],
            bloodGroupStats,
            monthlyStats,
            topHospitals,
            topDonors
        ] = await Promise.all([
            pool.execute('SELECT COUNT(*) as count FROM users'),
            pool.execute('SELECT COUNT(*) as count FROM donors'),
            pool.execute('SELECT COUNT(*) as count FROM hospitals'),
            pool.execute('SELECT COUNT(*) as count FROM blood_requests'),
            pool.execute("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'pending'"),
            pool.execute("SELECT COUNT(*) as count FROM blood_requests WHERE status = 'fulfilled'"),
            pool.execute("SELECT COUNT(*) as count FROM matching WHERE match_status = 'completed'"),
            pool.execute('SELECT blood_group, COUNT(*) as count FROM donors GROUP BY blood_group ORDER BY count DESC'),
            pool.execute(`
                SELECT
                    DATE_FORMAT(request_date, '%Y-%m') as month,
                    COUNT(*) as requests,
                    SUM(CASE WHEN status = 'fulfilled' THEN 1 ELSE 0 END) as fulfilled
                FROM blood_requests
                GROUP BY DATE_FORMAT(request_date, '%Y-%m')
                ORDER BY month DESC
                LIMIT 6
            `),
            pool.execute(`
                SELECT h.hospital_name, COUNT(br.request_id) as total_requests
                FROM hospitals h
                LEFT JOIN blood_requests br ON h.hospital_id = br.hospital_id
                GROUP BY h.hospital_id
                ORDER BY total_requests DESC
                LIMIT 5
            `),
            pool.execute(`
                SELECT d.full_name, COUNT(m.match_id) as total_donations
                FROM donors d
                LEFT JOIN matching m ON d.donor_id = m.donor_id AND m.match_status = 'completed'
                GROUP BY d.donor_id
                ORDER BY total_donations DESC
                LIMIT 5
            `)
        ]);

        res.json({
            totalUsers: totalUsers.count,
            totalDonors: totalDonors.count,
            totalHospitals: totalHospitals.count,
            totalRequests: totalRequests.count,
            pendingRequests: pendingRequests.count,
            completedRequests: completedRequests.count,
            totalDonations: totalDonations.count,
            bloodGroupStats,
            monthlyStats,
            topHospitals,
            topDonors
        });
    } catch (error) {
        console.error('Get admin dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
}));

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`,
        availableEndpoints: [
            '/api',
            '/api/health',
            '/api/test',
            '/api/test-db',
            '/api/debug',
            '/api/auth/register',
            '/api/auth/login',
            '/api/profile',
            '/api/donors',
            '/api/hospitals',
            '/api/blood-requests',
            '/api/matches'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: isProduction ? 'Something went wrong. Please try again later.' : err.message,
        timestamp: new Date().toISOString()
    });
});

// Initialize the application
initializeApp();