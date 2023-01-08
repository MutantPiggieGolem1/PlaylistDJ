import { AudioPlayer, AudioResource, createAudioPlayer, getVoiceConnection, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import { ApplicationCommandAutocompleteNumericOptionData, ApplicationCommandAutocompleteStringOptionData, ApplicationCommandBooleanOptionData, ApplicationCommandChannelOptionData, ApplicationCommandMentionableOptionData, ApplicationCommandNumericOptionData, ApplicationCommandRoleOptionData, ApplicationCommandStringOptionData, ApplicationCommandUserOptionData, ButtonInteraction, CacheType, CommandInteraction, Message } from "discord.js";
import { isSong } from "src/web/util";
import { Song } from "../constants";
import { WHITELIST } from "../index";

export const ITEMS_PER_PAGE = 25;
export type ApplicationCommandArgumentOptionData =
  | ApplicationCommandChannelOptionData
  | ApplicationCommandAutocompleteNumericOptionData
  | ApplicationCommandAutocompleteStringOptionData
  | ApplicationCommandNumericOptionData
  | ApplicationCommandStringOptionData
  | ApplicationCommandRoleOptionData
  | ApplicationCommandUserOptionData
  | ApplicationCommandMentionableOptionData
  | ApplicationCommandBooleanOptionData;

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
    if (!resource?.metadata || !isSong(resource.metadata)) return;
    return resource.metadata;
}

export function truncateString(str: string, len: number): string {
    return (str.length > len) ? str.slice(0, len-2)+".." : str;
}

export function isWhitelisted(ctx: CommandInteraction<CacheType> | ButtonInteraction<CacheType>) {
    return ctx.user.id === '547624574070816799' || WHITELIST.has(ctx.user.id)
}