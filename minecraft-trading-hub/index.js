require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const express = require("express");

const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

let channel;

client.once("ready", () => {
  console.log("✅ Bot is online!");
  channel = client.channels.cache.get(process.env.CHANNEL_ID);
});

// --- DISCORD COMMAND: /pr <num> <comment> ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("/pr")) {
    const parts = message.content.split(" ");
    const prNumber = parts[1];
    const comment = parts.slice(2).join(" ");

    if (!prNumber || !comment) {
      return message.reply("Usage: /pr <number> <comment>");
    }

    try {
      await axios.post(
        `https://api.github.com/repos/${process.env.OWNER}/${process.env.REPO}/issues/${prNumber}/comments`,
        { body: comment },
        { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }
      );
      message.reply(`✅ Comment added to PR #${prNumber} on GitHub!`);
    } catch (err) {
      console.error(err.message);
      message.reply("❌ Failed to post comment. Check your GITHUB_TOKEN or PR number.");
    }
  }
});

app.post("/github", (req, res) => {
  const event = req.headers["x-github-event"];
  const data = req.body;

  if (!channel) return res.sendStatus(200);

  if (event === "pull_request" && data.action === "opened") {
    channel.send(`🆕 **${data.sender.login}** opened PR #${data.number}\n🚨 **Needs approval!**\n🔗 ${data.pull_request.html_url}`);
  }

  if (event === "pull_request" && data.action === "closed" && data.pull_request.merged) {
    channel.send(`🚀 **PR #${data.number} MERGED** into \`${data.pull_request.base.ref}\` by ${data.sender.login}!`);
  }

  if (event === "pull_request_review") {
    const status = data.review.state === "approved" ? "✅ APPROVED" : "❌ CHANGES REQUESTED";
    channel.send(`${status} on PR #${data.pull_request.number} by **${data.sender.login}**`);
  }

  res.sendStatus(200);
});

app.listen(3001, () => console.log("🚀 Webhook server running on port 3001"));

client.login(process.env.DISCORD_TOKEN);