import * as fs from "fs";
import * as sharp from "sharp";
import { Option, some, none, Some } from "ts-option";

export const loadRescaleAndSave = (input: string, output: string): Promise<sharp.OutputInfo> => {

    return sharp(input).
        rotate().
        resize(200).
        toFormat('jpg').
        toFile(output)

}

export const loadAndRescale =  (path: string): Option<sharp.Sharp> => {

        if(fs.existsSync(path)){
        const readStream = fs.createReadStream(path);
        let transform = sharp().toFormat('jpg').resize(200);
        const retObject = some(readStream.pipe(transform));
        return retObject;
        }else{
            return none;
        }

}

export const rescale = (stream: NodeJS.ReadableStream): Option<sharp.Sharp> => {

    let transform = sharp().rotate().resize(200).toFormat('jpg');
    const retObject = some(stream.pipe(transform));
    return retObject;

}

export const rescaleBuffer = (buffer: Buffer): Promise<Buffer> => {

    return sharp(buffer).rotate().resize(200).toBuffer();

}

export const 