#!/usr/bin/env node
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const isAdmin = args.includes('--admin') || process.env.REACT_APP_ADMIN === 'true';
const isDelivery = args.includes('--delivery') || process.env.REACT_APP_DELIVERY === 'true';

const env = {
  ...process.env,
  REACT_APP_ADMIN: isAdmin ? 'true' : 'false',
  REACT_APP_DELIVERY: isDelivery ? 'true' : 'false',
};

const child = spawn('react-scripts', ['build'], { stdio: 'inherit', env, shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
