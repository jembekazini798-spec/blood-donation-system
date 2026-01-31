-- Create database
CREATE DATABASE IF NOT EXISTS blood_donation_db;
USE blood_donation_db;

-- Users table for authentication
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'hospital', 'donor') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Donors table
CREATE TABLE donors (
    donor_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    last_donation_date DATE,
    availability_status ENUM('available', 'unavailable', 'recently_donated') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Hospitals table
CREATE TABLE hospitals (
    hospital_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE,
    hospital_name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Blood requests table
CREATE TABLE blood_requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    quantity_units INT NOT NULL CHECK (quantity_units > 0),
    urgency_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'matched', 'fulfilled', 'cancelled') DEFAULT 'pending',
    hospital_id INT NOT NULL,
    notes TEXT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id) ON DELETE CASCADE
);

-- Matching table
CREATE TABLE matching (
    match_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    donor_id INT NOT NULL,
    match_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    match_status ENUM('pending', 'contacted', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
    UNIQUE KEY unique_match (request_id, donor_id)
);

-- Donation history table
CREATE TABLE donation_history (
    donation_id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT NOT NULL,
    request_id INT,
    donation_date DATE NOT NULL,
    quantity_units INT NOT NULL,
    hospital_id INT,
    notes TEXT,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES blood_requests(request_id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
);


-- Create indexes for performance
CREATE INDEX idx_donor_blood_group ON donors(blood_group);
CREATE INDEX idx_donor_availability ON donors(availability_status);
CREATE INDEX idx_request_status ON blood_requests(status);
CREATE INDEX idx_request_blood_group ON blood_requests(blood_group);


        ---- ADMIN CREATION -------

UPDATE users SET role = 'admin' WHERE email = 'seuripusindawa@gmail.com';
-- Verify the admin was created
SELECT user_id, username, email, role, created_at FROM users WHERE role = 'admin';

UPDATE users SET role = 'admin' WHERE email = 'seuripusindawa@gmail.com';