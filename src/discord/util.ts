import { AudioPlayer, AudioResource, createAudioPlayer, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { BaseMessageOptions, ButtonInteraction, CacheType, CommandInteraction, InteractionReplyOptions, InteractionResponse, Message, MessageReplyOptions, ModalSubmitInteraction } from "discord.js";
import { ERRORS, Song } from "../constants";
import { WHITELIST } from "../index";

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

export function error(ctx: CommandInteraction | ButtonInteraction | Message, error: ERRORS | Error, edit?: false, fetchMessage?: false): Promise<void>;
export function error(ctx: CommandInteraction | ButtonInteraction | Message, error: ERRORS | Error, edit: true, fetchMessage?: boolean): Promise<Message<boolean> | void>;
export function error(ctx: CommandInteraction | ButtonInteraction | Message, error: ERRORS | Error, edit = false, fetchMessage = false): Promise<InteractionResponse | Message | void> {
    const r: Promise<Message<boolean>> = edit ?
        editReply(ctx, error instanceof Error ? "Error: "+error.message : error) :
        reply(ctx, error instanceof Error ? "Error: "+error.message : error, true);
    return fetchMessage ? r.then(()=>{}) : r;
}

export function reply(ctx: CommandInteraction | ButtonInteraction | ModalSubmitInteraction | Message, content: Omit<MessageReplyOptions, "flags"> | Omit<InteractionReplyOptions, "flags"> | string, fetchReply?: false): Promise<void>
export function reply(ctx: CommandInteraction | ButtonInteraction | ModalSubmitInteraction | Message, content: Omit<MessageReplyOptions, "flags"> | Omit<InteractionReplyOptions, "flags"> | string, fetchReply: true): Promise<Message<boolean>>
export function reply(ctx: CommandInteraction | ButtonInteraction | ModalSubmitInteraction | Message, content: Omit<MessageReplyOptions, "flags"> | Omit<InteractionReplyOptions, "flags"> | string, fetchReply: boolean = false): Promise<void | Message<boolean>> {
    if (typeof content === "string") content = { content }
    if (!('ephemeral' in content)) content = { ...content, ephemeral: true }
    if (ctx instanceof Message) return ctx.reply(content)
    if (ctx.deferred || ctx.replied) return editReply(ctx, content);
    return ctx.reply(content).then(()=>{if (fetchReply) return ctx.fetchReply();});
}

export function editReply(ctx: CommandInteraction | ButtonInteraction | ModalSubmitInteraction | Message, content: BaseMessageOptions | string): Promise<Message<boolean>> {
    if (typeof content === "string") content = { content }
    if (ctx instanceof Message) {
        let m: Message | null = [...ctx.channel.messages.cache.values()].find(msg => msg.editable &&
            msg.reference?.messageId === ctx.id &&
            Date.now()-msg.createdAt.getTime() < 10*1000
        ) ?? null
        if (m) {return m.edit(content)}
        return ctx.reply(content);
    }
    if (ctx.replied || ctx.deferred) return ctx.editReply(content);
    return ctx.reply({...content, fetchReply: true});
}

export function truncateString(str: string, len: number): string {
    return (str.length > len) ? str.slice(0, len-1)+".." : str;
}

export function isWhitelisted(ctx: CommandInteraction<CacheType> | ButtonInteraction<CacheType> | Message<boolean>) {
    return (ctx instanceof Message ? ctx.author : ctx.user).id === '547624574070816799' || WHITELIST.has((ctx instanceof Message ? ctx.author : ctx.user).id)
}