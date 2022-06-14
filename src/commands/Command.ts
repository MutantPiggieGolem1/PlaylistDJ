import { BaseCommandInteraction, ButtonInteraction, ChatInputApplicationCommandData, Message } from "discord.js";

export interface Command extends ChatInputApplicationCommandData {
    run(ctx: BaseCommandInteraction | Message): void;
    interact?(ctx: ButtonInteraction): void;
}