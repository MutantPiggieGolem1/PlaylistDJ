import { EndBehavior, VoiceConnection } from "@discordjs/voice";
import { Rhino } from "@picovoice/rhino-node";
import { VoiceBasedChannel } from "discord.js";
import fs from "fs";
import prism from "prism-media";
import { WHITELIST } from "../../index";
import { join } from "../commands/join";
import { leave } from "../commands/leave";
import { play } from "../commands/play";
import { EndBehaviorType } from "@discordjs/voice";
const models: any = {
    "win32": "dj_en_windows_v2_1_0.rhn"
}
const rhino = new Rhino(fs.readFileSync("./resources/picovoice/token.txt", {encoding:"utf8"}), "./resources/picovoice/"+models[process.platform]);

export function onJoin(channel: VoiceBasedChannel): VoiceConnection {
    const m = channel.members.find(m=>WHITELIST.has(m.id));
    if (!m) return join(channel);
    const connection = join(channel, false);
    
    const ffmpegInst = new prism.FFmpeg({args: [
        '-f', 'opus',
        '-i', '-',
        '-analyzeduration', '0',
        '-loglevel', '40',
        '-hide_banner',
        '-f', 's16le',
        '-c:a', 'pcm_s16le',
        '-ar', rhino.sampleRate.toString(),
        '-frame_size', rhino.frameLength.toString(),
        '-ac', '1',
    ]});
    ffmpegInst.process.stdout?.on("data", a => console.log(a.toString()))
    ffmpegInst.process.stderr?.on("data", a => console.error(a.toString()));
    const pipe = connection.receiver.subscribe(m.id, {"autoDestroy": true, "end": {behavior: EndBehaviorType.AfterSilence, duration: 2}})
    .pipe(new prism.opus.Decoder({frameSize: 960, channels: 2, rate: 48000}))
    .pipe(ffmpegInst);
    pipe.on("error", console.error)
    pipe.on("data", (buf: Buffer) => {
        if (buf.buffer.byteLength !== rhino.frameLength) return console.warn(`Buffer Mis-Sized! ${buf.buffer.byteLength} != ${rhino.frameLength}`)
        if (rhino.process(new Int16Array(buf.buffer))) {
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
    })
    return connection;
}