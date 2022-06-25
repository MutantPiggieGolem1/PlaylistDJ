import { AudioPlayer, createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
import { BaseCommandInteraction, ButtonInteraction, CacheType, Interaction, InteractionReplyOptions, Message, MessageEditOptions, WebhookEditMessageOptions } from "discord.js";
import { RatedSong } from "../youtube/util";
import { WHITELIST } from "../index";

export const TRUTHY: string[] = ["true","yes","1","on"]

const players: {[key:string]: {player?:AudioPlayer,playing?:RatedSong}} = {}
export function getPlayer(guildid: string)               : {player:AudioPlayer,playing?:RatedSong}
export function getPlayer(guildid: string, create: true) : {player:AudioPlayer,playing?:RatedSong}
export function getPlayer(guildid: string, create: false): {player?:AudioPlayer,playing?:RatedSong}
export function getPlayer(guildid: string, create: boolean = true) {
    if (!players[guildid]) {players[guildid] = {player: create ? createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}}).setMaxListeners(1) : undefined}}
    return players[guildid];
}

export async function error(ctx: BaseCommandInteraction | ButtonInteraction | Message, error: ERRORS | Error) {
    let content: string = error instanceof Error ? "Error: "+error.message : error;
    if (ctx instanceof Interaction) return ctx.reply({content, ephemeral: true})
    return ctx.reply(content)
}
export enum ERRORS {
    INVALID_ARGUMENTS = 'Invalid Arguments!',
    NO_CONNECTION = 'Couldn\'t find voice connection!',
    NO_USER = 'Couldn\'t find user!',
    NO_PLAYLIST = 'Couldn\'t find playlist!',
    NO_SONG = 'Couldn\'t find song!',
    NO_PERMS = "Insufficent Permissions!"
}

export async function editReply(ctx: BaseCommandInteraction | Message, content: WebhookEditMessageOptions | string) {
    if (!ctx.channel) return;
    if (ctx instanceof Message) {
        let m: Message | null = [...ctx.channel.messages.cache.values()].find(msg => msg.editable &&
            msg.reference?.messageId === ctx.id &&
            Date.now()-msg.createdAt.getTime() < 10*1000
        ) ?? null
        if (m) {return m.edit(content)}
        return ctx.reply(content);
    }
    if (ctx.replied) return ctx.editReply(content)
    return ctx.reply(typeof content === "string" ? {content, "ephemeral": true} : {...content,"ephemeral": true})
}

export function truncateString(str: string, len: number): string {
    return (str.length > len) ? str.slice(0, len-1)+".." : str;
}

export function isWhitelisted(ctx: BaseCommandInteraction<CacheType> | ButtonInteraction<CacheType> | Message<boolean>) {
    return WHITELIST.has((ctx instanceof Message ? ctx.author : ctx.user).id)
}