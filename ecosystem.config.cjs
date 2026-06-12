module.exports = {
  apps: [
    {
      name: "isikuy",
      script: "npm",
      args: "run start:vps",
      cwd: "/var/www/isikuy",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
        HOST: "127.0.0.1",
      },
      max_memory_restart: "512M",
      autorestart: true,
      time: true,
    },
  ],
};
