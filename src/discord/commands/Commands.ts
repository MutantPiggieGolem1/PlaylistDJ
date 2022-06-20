import { BaseCommandInteraction, ChatInputApplicationCommandData, Message, MessageComponentInteraction } from "discord.js";
import { Auth } from "./auth";
import { Delete } from "./delete";
import { Download } from "./download";
import { Edit } from "./edit";
import { Join } from "./join";
import { Leave } from "./leave";
import { List } from "./list";
import { Play } from "./play";
import { Rickroll } from "./rickroll";
import { Vote } from "./vote";

export interface Command extends ChatInputApplicationCommandData {
    public: boolean;
    run(ctx: BaseCommandInteraction | Message): void;
    interact?(ctx: MessageComponentInteraction): void;
}
export const Commands: Command[] = [Auth,Delete,Download,Edit,Join,Leave,List,Play,Rickroll,Vote]; // Pause