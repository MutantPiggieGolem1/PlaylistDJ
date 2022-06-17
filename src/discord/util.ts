import { AudioPlayer, createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
import { BaseCommandInteraction, ButtonInteraction, Interaction, Message, MessageOptions, MessagePayload, InteractionUpdateOptions, MessageActionRow, MessageActionRowComponent, MessageButton, MessageSelectMenu, MessageActionRowOptions, MessageFlags } from "discord.js";
import { client } from "../index";

export const TRUTHY: string[] = ["true","yes","1","on"]

const players: {[key:string]: AudioPlayer} = {};
export function getPlayer(guildid: string) {
    if (!players[guildid]) players[guildid] = createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}});
    return players[guildid];
}

export async function reply(ctx: BaseCommandInteraction | ButtonInteraction | Message, content: MessageOptions | string, eph?: boolean): Promise<void | Message<boolean>> {
    if (!ctx.channel) return;
    if (typeof content === "string") content = {content} as MessageOptions;
    content.flags = 64;
    if (ctx instanceof Message) {if (eph) {ctx.author.send(content)} else {ctx.reply(content)}; return;}
    if (ctx.replied) {return editReply(ctx,content)}
    return ctx.reply( MessagePayload.create(ctx,content));
}

export async function editReply(ctx: BaseCommandInteraction | ButtonInteraction | Message, content: MessageOptions | string): Promise<void | Message<boolean>> {
    if (!ctx.channel) return;
    if (typeof content === "string") content = {content} as MessageOptions;
    content.flags = 64;
    if (ctx instanceof Interaction) {
        if (!ctx.replied && !ctx.deferred) {return reply(ctx,content)}
        await ctx.editReply(content)
    } else if (ctx instanceof Message) {
        let m: Message | null | undefined = [...ctx.channel.messages.cache.values()].find(msg => client?.user?.id === msg.author.id && msg.reference?.messageId === ctx.id && Date.now()-msg.createdAt.getTime() < 10*1000)
        if (m?.editable) {return m.edit(MessagePayload.create(m,content))}
        await ctx.reply(content);
    }
}

// function disableButtons(ctx: ButtonInteraction, options?: InteractionUpdateOptions): void {
//     if (ctx.deferred || ctx.message.flags === MessageFlags.FLAGS.EPHEMERAL) return console.warn("Attempted to disable buttons on deferred context.")
//     try {
//         if (!(ctx.message instanceof Message && ctx.message.components && ctx.message.components instanceof Array<MessageActionRow<MessageButton | MessageSelectMenu>>)) return;
//         let jmsg: InteractionUpdateOptions | any = ctx.message;
//         if (ctx.message.nonce === null) jmsg.nonce = undefined;
//         let audited: InteractionUpdateOptions = {};
//         audited = Object.assign(audited,jmsg)
//         if (!options?.components) audited.components = ctx.message.components?.map(a=>{
//             return new MessageActionRow({components: a.components.map(c=>{
//                 c.disabled=true;return c as MessageActionRowComponent
//             })} as MessageActionRowOptions<MessageActionRowComponent>)
//         })
//         if (!options?.attachments) audited.attachments = [...ctx.message.attachments.values()]
//         if (options) audited = Object.assign(audited,options);
//         ctx.update(audited)
//     } catch (e) {
//         console.error(e)
//     }
// }