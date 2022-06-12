import { BaseCommandInteraction, Message } from "discord.js";

export async function reply(ctx: BaseCommandInteraction | Message, content: string, eph?: boolean): Promise<void | Message<boolean>> {
    if (eph && ctx instanceof Message) {return ctx.author.send(content).catch(console.warn)}
    return ctx.reply(ctx instanceof BaseCommandInteraction ? {ephemeral: true, content} : content);
}