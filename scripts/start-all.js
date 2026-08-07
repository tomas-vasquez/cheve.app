#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const localBin = path.join(__dirname, '..', 'node_modules', '.bin');

const modes = [
  { name: 'Tienda', port: 3000, admin: 'false', delivery: 'false' },
  { name: 'Admin', port: 3001, admin: 'true', delivery: 'false' },
  { name: 'Reparto', port: 3002, admin: 'false', delivery: 'true' },
];

const children = modes.map((mode) => {
  const env = {
    ...process.env,
    PATH: `${localBin}${path.delimiter}${process.env.PATH || ''}`,
    PORT: String(mode.port),
    REACT_APP_ADMIN: mode.admin,
    REACT_APP_DELIVERY: mode.delivery,
  };
  console.log(`[${mode.name}] iniciando en http://localhost:${mode.port}`);
  const child = spawn('react-scripts', ['start'], { stdio: 'inherit', env, shell: true });
  child.on('exit', (code) => {
    console.log(`\n[${mode.name}] terminó con código ${code ?? 0}`);
    children.forEach((c) => c.kill());
    process.exit(code ?? 0);
  });
  return child;
});

const shutdown = () => {
  children.forEach((c) => c.kill());
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
