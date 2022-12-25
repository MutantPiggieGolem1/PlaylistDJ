import { VoiceConnection } from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
// import { } from "rhino-node";

export function onJoin(channel: VoiceBasedChannel, connection: VoiceConnection): VoiceConnection {
    return connection;
} // TODO: Implement Voice Commands