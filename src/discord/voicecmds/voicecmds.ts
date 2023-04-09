import { VoiceConnection } from "@discordjs/voice";
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
const rhino = new Rhino(fs.readFileSync("./resources/picovoice/token.txt", {encoding:"utf8"}), "./resources/picovoice/"+models[process.platform]);

export function onJoin(channel: VoiceBasedChannel): VoiceConnection {
    const m = channel.members.find(m=>WHITELIST.has(m.id));
    if (!m) return join(channel);
    const connection = join(channel, false);
    
    const ffmpegInst = new prism.FFmpeg({args: [
        '-f', 's16le',
        '-i', '-',
        '-analyzeduration', '0',
        '-loglevel', 'fatal',
        '-hide_banner',
        '-f', 's16le',
        '-c:a', 'pcm_s16le',
        '-ar', rhino.sampleRate.toString(),
        '-ac', '1',
    ]});
    ffmpegInst.process.stderr?.on("data", a => console.error(a.toString()))
    const pipe = connection.receiver.subscribe(m.id)
    .pipe(new prism.opus.Decoder({frameSize: 960, channels: 2, rate: 48000}))
    .pipe(ffmpegInst);
    pipe.on("error", console.error)
    let chunks: Uint16Array;
    pipe.on("data", (chunk: Buffer) => {
        chunks = new Uint16Array([...(chunks??[]), ...new Uint16Array(chunk.buffer)]);
        while (chunks.length > rhino.frameLength) {
            onData(new Int16Array(chunks.slice(0, rhino.frameLength)), channel.guild.id)
            chunks = chunks.slice(rhino.frameLength)
        }
    })
    return connection;
}

function onData(arr: Int16Array, guildID: string) {
    if (rhino.process(arr)) {
        const inf = rhino.getInference();
        if (!inf.isUnderstood) return console.error("Voice Command Error: Misunderstood "+inf.intent);
        switch (inf.intent) {
            case "play":
                if (!play(guildID)) console.warn("Voice Command Error: Failed to play.")
            break;
            case "leave":
                leave(guildID);
            break;
            default:
                console.error(`Voice Command Error: Unrecognized Intent [${inf.intent}]`)
        }
    };
}