import { VoiceConnection } from "@discordjs/voice";
import { VoiceBasedChannel } from "discord.js";
import { join } from "../commands/join";

export function onJoin(channel: VoiceBasedChannel): VoiceConnection {
    const connection = join(channel);
    connection.on("error", console.warn)
    return connection;
}