import { joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import { Rhino } from "@picovoice/rhino-node";
import { VoiceBasedChannel } from "discord.js";
import fs from "fs";
import prism from "prism-media";
import { WHITELIST } from "../../index";
import { join } from "../commands/join";
import { leave } from "../commands/leave";
import { play } from "../commands/play";
const models: any = {
    "win32": "dj_en_windows_v2_1_0.rhn"
}
const rhino = new Rhino(fs.readFileSync("./resources/picotoken.txt", {encoding:"utf8"}), "./src/discord/voicecmds/"+models[process.platform]);

export function onJoin(channel: VoiceBasedChannel): VoiceConnection {
    const m = channel.members.find(m=>WHITELIST.has(m.id));
    if (!m) return join(channel);
    const connection = join(channel, false);
    connection.receiver.subscribe(m.id)
    .pipe(new prism.opus.Decoder({
        "frameSize": 960,
        "channels": 2,
        "rate": 48000
    }))
    .pipe(new prism.FFmpeg({
        args: [
            '-f', 's16le',
            '-ar', rhino.sampleRate.toString(),
            '-ac', '1',
        ]
    })).on("data", (sample: Buffer) => {
        console.info("Audio Packet Processed")
        if (rhino.process(new Int16Array(sample))) {
            const inf = rhino.getInference();
            if (!inf.isUnderstood) return;
            switch (inf.intent) {
                case "play":
                    if (!play(channel.guild.id)) console.warn("Voice Command Error: Failed to play.")
                break;
                case "leave":
                    leave(channel.guild.id);
                break;
                default:
                    console.error(`Voice Command Error: Unrecognized Intent [${inf.intent}]`)
            }
        };
    }).on("error", console.error)
    // TODO: stop when no speaking
    return connection;
}