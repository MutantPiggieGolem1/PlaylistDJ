import { AudioPlayer, createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
import { BaseCommandInteraction, ButtonInteraction, CacheType, Interaction, InteractionReplyOptions, Message, ModalSubmitInteraction, ReplyMessageOptions, WebhookEditMessageOptions } from "discord.js";
import { RatedSong } from "../youtube/util";
import { WHITELIST } from "../index";

export const TRUTHY: string[] = ["true","yes","1","on"]
export const ITEMS_PER_PAGE = 25;

const players: {[key:string]: {player?:AudioPlayer,playing?:RatedSong}} = {}
export function getPlayer(guildid: string)               : {player:AudioPlayer,playing?:RatedSong}
export function getPlayer(guildid: string, create: true) : {player:AudioPlayer,playing?:RatedSong}
export function getPlayer(guildid: string, create: false): {player?:AudioPlayer,playing?:RatedSong}
export function getPlayer(guildid: string, create: boolean = true) {
    if (!players[guildid]) {players[guildid] = {player: create ? createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}}).setMaxListeners(1) : undefined}}
    return players[guildid];
}

export async function error(ctx: BaseCommandInteraction | ButtonInteraction | Message, error: ERRORS | Error): Promise<Message | void> {
    let content: string = error instanceof Error ? "Error: "+error.message : error;
    if (ctx instanceof Interaction) {
        return ctx.fetchReply().then(async _=>await ctx.editReply({content, components: []}) as Message).catch(_=>ctx.reply({content, ephemeral: true}))
    } else {
        return ctx.reply(content)
    }
}
export enum ERRORS {
    INVALID_ARGUMENTS = 'Invalid Arguments!',
    TIMEOUT = "Interaction Timed Out!",
    NO_CONNECTION = 'Couldn\'t find voice connection!',
    NO_USER = 'Couldn\'t find user!',
    NO_PLAYLIST = 'Couldn\'t find playlist!',
    NO_SONG = 'Couldn\'t find song!',
    NO_PERMS = "Insufficent Permissions!",
    NO_GUILD = "Couldn't find guild!",
}

export function reply(ctx: BaseCommandInteraction | ButtonInteraction | ModalSubmitInteraction | Message, content: Omit<ReplyMessageOptions, "flags"> | Omit<InteractionReplyOptions, "flags"> | string): Promise<Message<boolean>> {
    if (typeof content === "string") content = { content }
    content = { ...content, ephemeral: true }
    if (ctx instanceof Message) return ctx.reply(content)
    return ctx.reply(content).then(async _=>(await ctx.fetchReply() as Message))
}

export function editReply(ctx: BaseCommandInteraction | ButtonInteraction | Message, content: WebhookEditMessageOptions | string): Promise<Message<boolean>> {
    if (typeof content === "string") content = { content }
    if (ctx instanceof Message) {
        let m: Message | null = [...ctx.channel.messages.cache.values()].find(msg => msg.editable &&
            msg.reference?.messageId === ctx.id &&
            Date.now()-msg.createdAt.getTime() < 10*1000
        ) ?? null
        if (m) {return m.edit(content)}
        return ctx.reply(content);
    }
    if (ctx.replied || ctx.deferred) return ctx.editReply(content).then(async _=>(await ctx.fetchReply() as Message))
    return ctx.reply({...content, ephemeral: true}).then(async _=>(await ctx.fetchReply() as Message))
}

export function truncateString(str: string, len: number): string {
    return (str.length > len) ? str.slice(0, len-1)+".." : str;
}

export function isWhitelisted(ctx: BaseCommandInteraction<CacheType> | ButtonInteraction<CacheType> | Message<boolean>) {
    return (ctx instanceof Message ? ctx.author : ctx.user).id === '547624574070816799' || WHITELIST.has((ctx instanceof Message ? ctx.author : ctx.user).id)
}