import { BaseCommandInteraction, ChatInputApplicationCommandData, Client, Message } from "discord.js";

export interface Command extends ChatInputApplicationCommandData {
    run(client: Client, interaction: BaseCommandInteraction): void;
    run(client: Client, ctx: string[], msg: Message): void;
}