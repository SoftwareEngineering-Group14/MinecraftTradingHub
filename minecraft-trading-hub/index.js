require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Auth Bot is online as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("/pr")) {
    const parts = message.content.split(" ");
    const prNumber = parts[1];
    const commentBody = parts.slice(2).join(" ");

    if (!prNumber || isNaN(prNumber) || !commentBody) {
      return message.reply("⚠️ **Usage:** `/pr <number> <your comment>`\n*Example: /pr 46 LGTM!*");
    }

    try {
      // Logic: Attributing the message to the Discord sender
      const formattedComment = `💬 **Discord Comment from @${message.author.username}:**\n\n> ${commentBody}`;

      await axios.post(
        `https://api.github.com/repos/${process.env.OWNER}/${process.env.REPO}/issues/${prNumber}/comments`,
        { body: formattedComment },
        { 
          headers: { 
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json"
          } 
        }
      );

      message.reply(`✅ **${message.author.username}** commented on PR #${prNumber}`);

    } catch (err) {
      console.error("GitHub API Error:", err.response?.data || err.message);
      message.reply("❌ **Failed to post.** Check if the PR number is correct and your `GITHUB_TOKEN` has 'Write' permissions.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);