import { Client, Intents, Interaction, Message } from "discord.js";
import { Command, Commands } from "./discord/commands/Commands";
import { isWhitelisted } from "./discord/util";
import Day from "dayjs"
export const client: Client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});
const PREFIX: string = "kt";
export const WHITELIST: Set<string> = new Set(["547624574070816799"]) // Me only at first

client.on("ready", async () => {
    if (!client.user) throw new Error("Couldn't obtain a user for the client.");
    if (!client?.application?.commands) throw new Error("Could not register commands to client.");
    await client.application.commands.set(Commands);
    client.user.setActivity({type: "LISTENING", name: `To music in ${client.guilds.cache.size} servers!`})
    console.info(`Bot Ready! [${client.user.tag}]`);
})

client.on("messageCreate", (msg: Message) => {
    if (msg.author.id === client.user?.id || !msg.content.startsWith(PREFIX)) return;
    let command: Command | null | undefined = Commands.find(c=>c.name===msg.content.split(" ")[1]);
    if (!command) {msg.reply("Command not recognized."); return;}

    if (!command.public && !isWhitelisted(msg)) {msg.reply("This command requires authorization."); return}    
    console.info(`[${Day().format("DD HH:mm:ss")}] ${msg.author.tag} >> ${command.name}`)
    command.run(msg);
})

client.on("interactionCreate", (interaction: Interaction) => {
    if (!interaction.isCommand() && !interaction.isContextMenu()) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command) return interaction.reply({"content":"Command not recognized.","ephemeral":true});

    if (!command.public && !isWhitelisted(interaction)) {return interaction.reply({content:"This command requires authorization.",ephemeral:true})}
    console.info(`[${Day().format("DD HH:mm:ss")}] ${interaction.user.tag} >> /${command.name}`)
    command.run(interaction);
})

import { readFileSync } from "fs";
client.login(readFileSync("./resources/token.txt").toString());