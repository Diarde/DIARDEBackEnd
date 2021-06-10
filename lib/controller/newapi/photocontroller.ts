import FotoModel from "../../models/foto";
import { ClientSession, Document } from "mongoose";
import { Option } from "ts-option";

export const addPhoto = (
    filename: string, 
    session: Option<ClientSession>
) => {

    const foto = new FotoModel({
        filename: filename,
        date: Date.now(),
        owner: null,
        metadata: { x: 0, y: 0 }
    });
    
    const options = session.map<any>(_session => { return { _session } }).getOrElse({});
    return foto.save(options);

}

export const addPhotos = (
    filenames: string[],
    session: Option<ClientSession>
):Promise<Document[]> => {

    return Promise.all(
        (filenames as Array<string>).map((filename) => {
            const foto = new FotoModel({
                filename: filename,
                date: Date.now(),
                owner: null,
                metadata: { x: 0, y: 0 }
            });
            const options = session.map<any>(_session => { return { _session } }).getOrElse({});
            return foto.save(options);
        })
    )

}

