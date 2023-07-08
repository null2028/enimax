const dotenv = require("dotenv");
const { Client, GatewayIntentBits } = require("discord.js");
const path = require("path");
const fs = require("fs");

dotenv.config();

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "./data.json")));

async function ini(token, channelID, branch) {
    try {
        await discordClient.login(token);
        const channel = await discordClient.channels.fetch(channelID);

        if (process.env.RELEASE === "true") {
            await channel.send({
                content: `${data.shouldPing ? "@everyone " : ""} https://github.com/enimax-anime/enimax/releases/latest \n A new version has been released!  : \n\n ${fs.readFileSync(path.join(__dirname, "./releasenotes.txt"), "utf-8")}`,
                files: [
                    path.join(__dirname, "../../app-release.apk"),
                ]
            });
        } else if (process.env.isBeta === "true"){
            await channel.send({
                content: `${data.shouldPing ? "@everyone " : ""} A new beta version has been released!\n\n${fs.readFileSync(path.join(__dirname, "./releasenotes.txt"), "utf-8")}`,
                files: [
                    path.join(__dirname, "../../app-release.apk"),
                ]
            });
        }else {
            await channel.send({
                content: `${branch} was updated: ${process.env.MESSAGE}`,
                files: [
                    path.join(__dirname, "../../app-release.apk"),
                ]
            });
        }

    } catch (err) {
        console.error(err)
        console.error("Something went wrong");
    } finally {
        process.exit();
    }
}

ini(process.env.TOKEN, process.env.CHANNELID, process.env.BRANCH);