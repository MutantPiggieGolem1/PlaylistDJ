import { ActivityType, ApplicationCommandOptionChoiceData, Client, GatewayIntentBits, Interaction, InteractionType, Message } from "discord.js"
import { scheduleJob } from "node-schedule"
import { Command, Commands } from "./discord/commands/Commands"
import { isWhitelisted } from "./discord/util"
import { saveAllPlaylists } from "./recommendation/interface"
import { Playlist } from "./web/playlist"
export const client: Client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});
export const WHITELIST: Set<string> = new Set(["547624574070816799"]) // Me only at first

function setActivity() {client.user?.setActivity({type: ActivityType.Listening, name: `music in ${client.guilds.cache.size} servers!`})}

client.on("ready", async () => {
    if (!client.user) throw new Error("Couldn't obtain a user for the client.");
    if (!client?.application?.commands) throw new Error("Could not register commands to client.");
    await client.application.commands.set(Commands);
    await Playlist.init();
    setActivity();
    console.info(`Bot Ready! [${client.user.tag}]`);
    
    scheduleJob({hour: "00", minute: "00"}, saveAllPlaylists);
})

client.on("guildCreate", setActivity)
client.on("guildDelete", setActivity)

client.on("messageCreate", (msg: Message) => {
    if (msg.author.id === client.user?.id || !msg.content.startsWith("dj")) return;
    let command: Command | null | undefined = Commands.find(c=>c.name===msg.content.split(" ")[1]);
    if (!command) {msg.reply("Command not recognized."); return;}

    if (!command.public && !isWhitelisted(msg)) {msg.reply("This command requires authorization."); return}    
    command.run(msg).catch(console.error);
})

client.on("interactionCreate", (interaction: Interaction): void => {
    if (interaction.type !== InteractionType.ApplicationCommand) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command) {interaction.reply({"content":"Command not recognized.","ephemeral":true}); return;}

    if (!command.public && !isWhitelisted(interaction)) {interaction.reply({content:"This command requires authorization.",ephemeral:true}); return}
    command.run(interaction).catch(console.error);
})

client.on("interactionCreate", async (interaction: Interaction): Promise<void> => {
    if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command?.ac) return console.warn("Autocomplete not recognized.");
    
    let choices: ApplicationCommandOptionChoiceData[] | Error | null = await command.ac(interaction);
    if (choices === null) return;
    if (choices instanceof Error) return console.warn("Autocomplete failed.\n"+choices);
    interaction.respond(choices.slice(undefined,25)).catch(console.error);
})

client.on("error", console.error);

import { readFileSync } from "fs"
client.login(readFileSync("./resources/token.txt").toString());