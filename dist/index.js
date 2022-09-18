"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WHITELIST = exports.client = void 0;
const discord_js_1 = require("discord.js");
const node_schedule_1 = require("node-schedule");
const Commands_1 = require("./discord/commands/Commands");
const util_1 = require("./discord/util");
const interface_1 = require("./recommendation/interface");
exports.client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildVoiceStates, discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.MessageContent] });
const PREFIX = "dj";
exports.WHITELIST = new Set(["547624574070816799"]);
function setActivity() { exports.client.user?.setActivity({ type: discord_js_1.ActivityType.Listening, name: `music in ${exports.client.guilds.cache.size} servers!\no7 Techno` }); }
exports.client.on("ready", async () => {
    if (!exports.client.user)
        throw new Error("Couldn't obtain a user for the client.");
    if (!exports.client?.application?.commands)
        throw new Error("Could not register commands to client.");
    await exports.client.application.commands.set(Commands_1.Commands);
    setActivity();
    console.info(`Bot Ready! [${exports.client.user.tag}]`);
    (0, node_schedule_1.scheduleJob)({ hour: "00", minute: "00" }, interface_1.saveAllPlaylists);
});
exports.client.on("guildCreate", setActivity);
exports.client.on("guildDelete", setActivity);
exports.client.on("messageCreate", (msg) => {
    if (msg.author.id === exports.client.user?.id || !msg.content.startsWith(PREFIX))
        return;
    let command = Commands_1.Commands.find(c => c.name === msg.content.split(" ")[1]);
    if (!command) {
        msg.reply("Command not recognized.");
        return;
    }
    if (!command.public && !(0, util_1.isWhitelisted)(msg)) {
        msg.reply("This command requires authorization.");
        return;
    }
    command.run(msg);
});
exports.client.on("interactionCreate", (interaction) => {
    if (interaction.type !== discord_js_1.InteractionType.ApplicationCommand)
        return;
    let command = Commands_1.Commands.find(c => c.name === interaction.commandName);
    if (!command) {
        interaction.reply({ "content": "Command not recognized.", "ephemeral": true });
        return;
    }
    if (!command.public && !(0, util_1.isWhitelisted)(interaction)) {
        interaction.reply({ content: "This command requires authorization.", ephemeral: true });
        return;
    }
    command.run(interaction);
});
exports.client.on("interactionCreate", async (interaction) => {
    if (interaction.type !== discord_js_1.InteractionType.ApplicationCommandAutocomplete)
        return;
    let command = Commands_1.Commands.find(c => c.name === interaction.commandName);
    if (!command?.ac)
        return console.error("Autocomplete not recognized.");
    let choices = await command.ac(interaction);
    if (choices instanceof Error)
        return console.error("Autocomplete failed.\n" + choices);
    interaction.respond(choices.slice(undefined, 25));
});
exports.client.on("error", console.error);
const fs_1 = require("fs");
exports.client.login((0, fs_1.readFileSync)("./resources/token.txt").toString());
