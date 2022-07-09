import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionData, Client, Intents, Interaction, Message } from "discord.js";
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
    client.user.setActivity({name: "Rest in peace Technoblade.", type: "PLAYING"})
    // client.user.setActivity({type: "LISTENING", name: `To music in ${client.guilds.cache.size} servers!`})
    console.info(`Bot Ready! [${client.user.tag}]`);
})

client.on("messageCreate", (msg: Message) => {
    if (msg.author.id === client.user?.id || !msg.content.startsWith(PREFIX)) return;
    let command: Command | null | undefined = Commands.find(c=>c.name===msg.content.split(" ")[1]);
    if (!command) {msg.reply("Command not recognized."); return;}

    if (!command.public && !isWhitelisted(msg)) {msg.reply("This command requires authorization."); return}    
    console.info(`[${Day().format("DD HH:mm:ss")}] ${msg.author.tag} >> ${command.name} ${msg.content.slice(3+command.name.length)}`)
    command.run(msg);
})

client.on("interactionCreate", (interaction: Interaction) => {
    if (!interaction.isCommand() && !interaction.isContextMenu()) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command) return interaction.reply({"content":"Command not recognized.","ephemeral":true});

    if (!command.public && !isWhitelisted(interaction)) {return interaction.reply({content:"This command requires authorization.",ephemeral:true})}
    console.info(`[${Day().format("DD HH:mm:ss")}] ${interaction.user.tag} >> /${command.name} ${interaction.options.data.map(o=>o.name+":"+o.value).join(" ")}`)
    command.run(interaction);
})

client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isAutocomplete()) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command?.ac) return console.error("Autocomplete not recognized.");
    
    let choices: ApplicationCommandOptionChoiceData[] | Error = await command.ac(interaction);
    if (choices instanceof Error) return console.error("Autocomplete failed.\n"+choices)
    interaction.respond(choices.slice(undefined,25));
})

import { readFileSync } from "fs";
client.login(readFileSync("./resources/token.txt").toString());