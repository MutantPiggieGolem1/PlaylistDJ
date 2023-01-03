import { VoiceConnection } from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import { join } from "../commands/join";

export function onJoin(channel: VoiceBasedChannel): VoiceConnection {
    return join(channel);
}