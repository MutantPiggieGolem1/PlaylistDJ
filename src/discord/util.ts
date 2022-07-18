import { AudioPlayer, AudioResource, createAudioPlayer, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice"
import { CommandInteraction, ButtonInteraction, CacheType, InteractionReplyOptions, Message, ModalSubmitInteraction, ReplyMessageOptions, TextBasedChannel, WebhookEditMessageOptions, BaseInteraction, InteractionResponse } from "discord.js"
import { Song } from "../youtube/util"
import { WHITELIST } from "../index"

export const ITEMS_PER_PAGE = 25;

export function getPlayer(guildid: string)               : AudioPlayer
export function getPlayer(guildid: string, create: true) : AudioPlayer
export function getPlayer(guildid: string, create: false): AudioPlayer | undefined
export function getPlayer(guildid: string, create: boolean = true) {
    const a: VoiceConnection | undefined = getVoiceConnection(guildid);
    if (!a || !("subscription" in a.state) || !a.state.subscription) {
        if (!create) return;
        return createAudioPlayer({behaviors: {noSubscriber: NoSubscriberBehavior.Pause}}).setMaxListeners(1);
    }
    return a.state.subscription.player;
}
export function getPlaying(player?: AudioPlayer): Song | undefined {
    if (!player || !('resource' in player.state)) return;
    const resource: AudioResource = player.state.resource;
    if (!resource?.metadata) return;
    return resource.metadata as Song;
}

export async function error(ctx: CommandInteraction | ButtonInteraction | Message | TextBasedChannel, error: ERRORS | Error): Promise<InteractionResponse | Message | void> {
    let content: string = error instanceof Error ? "Error: "+error.message : error;
    if (ctx instanceof BaseInteraction) {
        if (ctx.replied) return await ctx.editReply({content, components: []})
        return ctx.reply({content, ephemeral: true})
    } else if (ctx instanceof Message) {
        return ctx.reply(content)
    } else {
        return ctx.send(content)
    }
}
export enum ERRORS {
    INVALID_ARGUMENTS = 'Invalid Arguments!',
    TIMEOUT = "Interaction Timed Out!",
    NO_PERMS = "Insufficent Permissions!",
    NO_CONNECTION = 'Couldn\'t find voice connection!',
    NO_USER = 'Couldn\'t find user!',
    NO_PLAYLIST = 'Couldn\'t find playlist!',
    NO_SONG = 'Couldn\'t find song!',
    NO_GUILD = 'Couldn\'t find guild!',
}

export function reply(ctx: CommandInteraction | ButtonInteraction | ModalSubmitInteraction | Message, content: Omit<ReplyMessageOptions, "flags"> | Omit<InteractionReplyOptions, "flags"> | string): Promise<Message<boolean>> {
    if (typeof content === "string") content = { content }
    if (!('ephemeral' in content)) content = { ...content, ephemeral: true }
    if (ctx instanceof Message) return ctx.reply(content)
    return ctx.reply(content).then(async _=>(await ctx.fetchReply() as Message))
}

export function editReply(ctx: CommandInteraction | ButtonInteraction | Message, content: WebhookEditMessageOptions | string): Promise<Message<boolean>> {
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

export function isWhitelisted(ctx: CommandInteraction<CacheType> | ButtonInteraction<CacheType> | Message<boolean>) {
    return (ctx instanceof Message ? ctx.author : ctx.user).id === '547624574070816799' || WHITELIST.has((ctx instanceof Message ? ctx.author : ctx.user).id)
}