import { Client , Intents, Interaction, Message } from "discord.js";
import { readFileSync } from "fs";
import { Command } from "./commands/Command";
import { Commands } from "./commands/Commands";
const client: Client = new Client({intents: [Intents.FLAGS.GUILD_VOICE_STATES,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});
const TOKEN: string = readFileSync("./resources/token.txt").toString();
const PREFIX: string = "dj";

client.on("ready", async () => {
    if (!client?.application?.commands) throw new Error("Could not register commands to client.");
    await client.application.commands.set(Commands);
    console.log("Bot Ready!");
})

client.on("messageCreate", (msg: Message) => {
    if (!msg.content.startsWith(PREFIX) && client.user && !msg.content.startsWith(client.user.toString())) return;
    console.log("detected command")

    let command: Command | null | undefined = Commands.find(c=>c.name===msg.content.split(" ")[1]);
    if (!command) {msg.reply("Command not recognized."); return;}

    command.run(client, msg.content.split(" ").slice(2), msg);
})

client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isCommand() && !interaction.isContextMenu()) return;
    let command: Command | null | undefined = Commands.find(c=>c.name===interaction.commandName);
    if (!command) return interaction.reply({"content":"Command not recognized.","ephemeral":true});

    command.run(client,interaction);
});

client.login(TOKEN);