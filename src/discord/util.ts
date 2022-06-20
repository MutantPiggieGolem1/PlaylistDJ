import { AudioPlayer, createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
import { BaseCommandInteraction, ButtonInteraction, Interaction, Message, MessageOptions, MessagePayload } from "discord.js";
import { RealSong } from "../youtube/util";
import { client } from "../index";

export const TRUTHY: string[] = ["true","yes","1","on"]

const players: {[key:string]: {player?:AudioPlayer,playing?:RealSong}} = {}
export function getPlayer(guildid: string)               : {player:AudioPlayer,playing?:RealSong}
export function getPlayer(guildid: string, create: true) : {player:AudioPlayer,playing?:RealSong}
export function getPlayer(guildid: string, create: false): {player?:AudioPlayer,playing?:RealSong}
export function getPlayer(guildid: string, create: boolean = true) {
    if (!players[guildid]) {players[guildid] = {player: create ? createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}}).setMaxListeners(1) : undefined}}
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

export function truncateString(str: string, len: number): string {
    return (str.length > len) ? str.slice(0, len-1)+".." : str;
}