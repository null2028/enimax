const dotenv = require("dotenv");
const { Client, GatewayIntentBits } = require("discord.js");
const path = require("path");

dotenv.config();

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

async function ini(token, channelID, branch) {
    try {
        await discordClient.login(token);
        const channel = await discordClient.channels.fetch(channelID);
        await channel.send({
            content: `${branch} was updated: ${process.env.MESSAGE}`,
            files: [
                path.join(__dirname, "../../app-release.apk"),
            ]
        });

    } catch (err) {
        console.error("Something went wrong");
    } finally {
        process.exit();
    }
}

ini(process.env.TOKEN, process.env.CHANNELID, process.env.BRANCH);