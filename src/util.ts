import { BaseCommandInteraction, InteractionReplyOptions, Message, MessageEmbed, MessagePayload } from "discord.js";
import { client } from "./index";

export async function reply(ctx: BaseCommandInteraction | Message, content: string, eph?: boolean): Promise<void | Message<boolean>> {
    if (eph && ctx instanceof Message) {return ctx.author.send(content).catch(console.warn)}
    return ctx.reply(ctx instanceof BaseCommandInteraction ? {ephemeral: true, content} : content);
}

export async function editReply(ctx: BaseCommandInteraction | Message, content: Message | string): Promise<void | Message<boolean>> {
    if (content instanceof Message && content.embeds.length < 1 && !content.content) content.content = "-"
    if (ctx instanceof BaseCommandInteraction) {
        let audited: any;
        if (content instanceof Message) {audited = content; audited.attachments = content.attachments.values(); return ctx.reply(audited as InteractionReplyOptions)}
        await ctx.editReply(content);
        return;
    } else if (ctx instanceof Message) {
        let m: Message | null | undefined = [...ctx.channel.messages.cache.values()].find(msg => client?.user?.id === msg.author.id && msg.reference?.messageId === ctx.id && Date.now()-msg.createdAt.getTime() < 10*1000)
        if (m?.editable) {
            let audited: any;
            if (content instanceof Message) {audited = content; audited.attachments = content.attachments.values()}
            return m.edit(audited as MessagePayload ?? content);
        }
        let audited: any;
        if (content instanceof Message) {audited = content; audited.flags = null}
        return ctx.reply(audited as MessagePayload ?? content);
    }
}
