module.exports = {
  apps: [
    {
      name: 'sms-backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '400M',
      autorestart: true,
    },
  ],
};
