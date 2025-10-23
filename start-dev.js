const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting GrainHero Development Servers...\n');

// Start Backend
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'farmHomeBackend-main'),
  stdio: 'inherit',
  shell: true
});

// Start Frontend
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'farmHomeFrontend-main'),
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  process.exit(0);
});

console.log('✅ Both servers are starting...');
console.log('📱 Frontend: http://localhost:3000');
console.log('🔧 Backend: http://localhost:5000');
console.log('\nPress Ctrl+C to stop both servers\n');
