import { VoiceConnection } from "@discordjs/voice";
import { BuiltinKeyword, Porcupine } from "@picovoice/porcupine-node";
import { VoiceBasedChannel } from "discord.js";
import fs from "fs";
import prism from "prism-media";
import { WHITELIST } from "../../index";
import { join } from "../commands/join";
import { play } from "../commands/play";
const models: any = {
    "win32": "dj-play_en_windows_v2_1_0.ppn"
}
const handle = new Porcupine(
    fs.readFileSync("./resources/picovoice/token.txt", {encoding:"utf8"}),
    ["./resources/picovoice/"+models[process.platform], BuiltinKeyword.JARVIS],
    [0.6, 0.999]);

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
        '-ar', handle.sampleRate.toString(),
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
        while (chunks.length >= handle.frameLength) {
            const res = handle.process(new Int16Array(chunks.slice(0, handle.frameLength)));
            if (res >= 0) play(channel.guild.id)
            chunks = chunks.slice(handle.frameLength)
        }
    })
    return connection;
}