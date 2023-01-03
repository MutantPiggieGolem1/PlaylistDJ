import { ActivityType, ApplicationCommandOptionChoiceData, ApplicationCommandOptionData, ApplicationCommandOptionType, Client, CommandInteraction, GatewayIntentBits, GuildBasedChannel, Interaction, InteractionType } from "discord.js"
import { scheduleJob } from "node-schedule"
import { ERRORS } from "./constants"
import { Command, Commands } from "./discord/commands/Commands"
import { ApplicationCommandArgumentOptionData, isWhitelisted } from "./discord/util"
import { saveAllPlaylists } from "./recommendation/interface"
import { Playlist } from "./web/playlist"
export const client: Client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]});
export const WHITELIST: Set<string> = new Set(["547624574070816799"]) // Me only at first

function setActivity() {client.user?.setActivity({type: ActivityType.Listening, name: `music for ${client.guilds.cache.size} servers!`})}
export function getArguments(interaction: CommandInteraction, opts?: ApplicationCommandOptionData[]) {
    if (!opts) return {};
    const options = opts.filter((opt): opt is ApplicationCommandArgumentOptionData => opt.type !== ApplicationCommandOptionType.Subcommand && opt.type !== ApplicationCommandOptionType.SubcommandGroup)
    return Object.fromEntries(options.map(opt=>{
        const option = interaction.options.get(opt.name, opt.required);
        if (!option) {
            if (opt.required) {console.warn("No command was found for "+opt.name)}
            return;
        }
        if (!option.value && opt.required) return console.warn(ERRORS.INVALID_ARGUMENTS);
        switch (opt.type) {
            case ApplicationCommandOptionType.String:
                return [option.name, option.value?.toString()];
            case ApplicationCommandOptionType.Number:
                return [option.name, option.value ? Number.parseInt(option.value.toString()) : 0]; // int not float
            case ApplicationCommandOptionType.Boolean:
                return [option.name, !!option.value];
            case ApplicationCommandOptionType.Channel:
                return [option.name, option.channel as GuildBasedChannel];
            case ApplicationCommandOptionType.User:
                return [option.name, option.user];
            default:
                console.warn("No argument processing exists for "+opt.type);
        }
    }).filter((n: any): n is any => !!n && n[1] !== null));
}
client.on("ready", async () => {
    if (!client.user) throw new Error("Couldn't obtain a user for the client.");
    if (!client?.application?.commands) throw new Error("Could not register commands to client.");
    await client.application.commands.set(Commands);
    Playlist.init();
    setActivity();
    console.info(`Bot Ready! [${client.user.tag}] <@${client.user.id}>`);
    
    scheduleJob({hour: "00", minute: "00"}, saveAllPlaylists);
})

client.on("guildCreate", setActivity)
client.on("guildDelete", setActivity)

client.on("interactionCreate", (interaction: Interaction): void => {
    if (interaction.type !== InteractionType.ApplicationCommand) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command) return console.warn("Command not recognized: "+interaction.commandName);

    if (!command.public && !isWhitelisted(interaction)) {interaction.reply({content:"This command requires authorization.",ephemeral:true}); return}
    
    command.run(interaction, getArguments(interaction, 
        command.options?.filter((opt): opt is ApplicationCommandArgumentOptionData => opt.type !== ApplicationCommandOptionType.Subcommand && opt.type !== ApplicationCommandOptionType.SubcommandGroup)
    )).catch(console.warn);
})

client.on("interactionCreate", async (interaction: Interaction): Promise<void> => {
    if (interaction.type !== InteractionType.ApplicationCommandAutocomplete) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command?.ac) return console.warn("Autocomplete not recognized.");
    
    let choices: ApplicationCommandOptionChoiceData[] | Error | null = await command.ac(interaction);
    if (choices === null) return;
    if (choices instanceof Error) return console.warn("Autocomplete failed.\n"+choices);
    interaction.respond(choices.slice(undefined,25)).catch(console.warn);
})

client.on("error", console.error);

import { readFileSync } from "fs"
client.login(readFileSync("./resources/token.txt").toString());