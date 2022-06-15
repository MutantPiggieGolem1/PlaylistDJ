import { Client , Intents, Interaction, Message } from "discord.js";
import { readFileSync } from "fs";
import { Command, Commands } from "./commands/Commands";
export const client: Client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES,Intents.FLAGS.GUILD_MESSAGES,Intents.FLAGS.GUILD_MESSAGE_REACTIONS]});
const TOKEN: string = readFileSync("./resources/token.txt").toString();
const PREFIX: string = "dj";

client.on("ready", async () => {
    if (!client.user) throw new Error("Could not obtain a user for the client.");
    if (!client?.application?.commands) throw new Error("Could not register commands to client.");
    await client.application.commands.set(Commands);
    console.info(`Bot Ready! [${client.user.tag}]`);
})

client.on("messageCreate", (msg: Message) => {
    if (msg.author.id === client.user?.id) return;
    if (!(msg.content.startsWith(PREFIX) || ( client.user && msg.content.startsWith(client.user.toString())))) return;
    let command: Command | null | undefined = Commands.find(c=>c.name===msg.content.split(" ")[1]);
    if (!command) {msg.reply("Command not recognized."); return;}

    command.run(msg);
})

client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isCommand() && !interaction.isContextMenu()) return;
    let command: Command | undefined | null = Commands.find(c=>c.name===interaction.commandName);
    if (!command) return interaction.reply({"content":"Command not recognized.","ephemeral":true});

    command.run(interaction);
});

client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isButton() && !interaction.isSelectMenu()) return;
    if (interaction.message instanceof Message && interaction.message.reference && interaction.user.id !== (await interaction.message.fetchReference())?.author?.id) return interaction.reply({"content":"'This menu is not for you' - Dank Memer","ephemeral":true})
    if (interaction.customId === "cancel") {
        if (interaction.replied) interaction.deleteReply()
        if (interaction.message instanceof Message && interaction.message.deletable) interaction.message.delete()
        return;
    } else if (interaction.customId === "disable") return;
    let command: Command | undefined | null = Commands.find(c=>interaction.customId.startsWith("c"+c.name))
    if (!command || !command.interact) return;

    command.interact(interaction);
});

client.login(TOKEN);