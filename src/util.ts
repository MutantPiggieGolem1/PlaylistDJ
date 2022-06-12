import { BaseCommandInteraction, Message } from "discord.js";

export async function reply(ctx: BaseCommandInteraction | Message, content: string): Promise<void | Message<boolean>> {
    return ctx.reply(ctx instanceof BaseCommandInteraction ? {ephemeral: true, content} : content);
}