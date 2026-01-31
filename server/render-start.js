// render-start.js - Simple start script for Render
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Blood Donation Portal on Render...');
console.log(`📁 Current directory: ${process.cwd()}`);

// Check if nodemon exists
const fs = require('fs');
const nodemonPath = path.join(process.cwd(), 'node_modules', '.bin', 'nodemon');

if (fs.existsSync(nodemonPath)) {
    console.log('✅ Nodemon found, starting with nodemon...');
    const nodemon = spawn(nodemonPath, ['server.js'], {
        stdio: 'inherit',
        env: process.env
    });
    
    nodemon.on('close', (code) => {
        console.log(`Nodemon exited with code ${code}`);
        process.exit(code);
    });
} else {
    console.log('⚠️ Nodemon not found, starting with node...');
    const node = spawn('node', ['server.js'], {
        stdio: 'inherit',
        env: process.env
    });
    
    node.on('close', (code) => {
        console.log(`Node exited with code ${code}`);
        process.exit(code);
    });
}