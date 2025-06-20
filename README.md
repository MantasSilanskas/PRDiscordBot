# 🤖 Discord Pull Ruquest Notifier Bot

A Discord bot that automatically checks and notifies your team about active Bitbucket pull requests. Designed to help teams stay on top of open PRs during working hours.

# 🛠 Features

- ✅ Automatically fetches open PRs from Bitbucket;
- 📌 Posts new PRs into a dedicated Discord thread;
- ⏰ Schedules checks every 15 minutes during work hours (08:00–17:00) in given timezone;
- 🚫 Skips checks outside working hours, weekends and on first boot;
- 🧹 Allows deletion of specific messages from the thread using a command;
- 📦 Clean, modular code structure for easy maintenance and scaling

# ⚙️ Configuration

Before running the bot, you need to configure environment variables. These are stored in a .env file located at: `src/config/.env`.

Create the file if it doesn't exist, and add the following values:

```env
# Discord bot token
CLIENT_TOKEN=your-discord-bot-token

# Bitbucket API authorization token
AUTH_TOKEN=your-bitbucket-auth-token

# Discord channel ID where the bot posts pull request updates
CHANNEL_ID=123456789012345678

# Discord role ID to mention in pull request threads
ROLE_ID=987654321098765432

# Timezone used for scheduling checks (e.g., Europe/Vilnius)
TIMEZONE=Europe/Vilnius

# Date format for thread titles or logs (Luxon format)
DATEFORMAT=yyyy-MM-dd

# Discord user ID to whom bot will sent DM when error occurs. 
USER_ID=your-discord-id
```

# 📝 Commands

- !pr — Manually trigger a pull request check. Threads are created in the configured channel (CHANNEL_ID), so this command must be sent in that channel to work properly.
- !deletemsg <messageId> — Delete a specific message from the current thread by message ID. Must be run inside a thread.

# 💻 Technologies

- Node.js
- Discord.js
- Luxon (timezone & scheduling)
- Bitbucket API

# 📄 License

This project is licensed under the [MIT License](./LICENSE).
