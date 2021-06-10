import {Request, Response, NextFunction} from "express";
import Model3DModel from "../models/model3d";
import {ClientSession} from "mongoose";
import {Option, some, none} from 'ts-option';

export let postLoadModel3D = (req: Request, res: Response, next: NextFunction) => {

    Model3DModel.findById(req.body.id)
        .exec().then(
        (model) => {
            res.status(200).json((model as any))
        },
        (err) => {
            console.log(err);
        }
    )
};

export let postSaveModel3D = (req: Request, res: Response, next: NextFunction) => {

    saveModel3D(req.body.model, none).then((_id: string) => {
        res.status(200).json({id: _id})
    }).catch(() => {/*TODO: Decide what to do here*/
    })

}

export let saveModel3D = (model: Object, session: Option<ClientSession>): Promise<string> => {

    return new Promise<string>((resolve, reject) => {
        const options = session.map<any>(_session => {
            return {_session}
        }).getOrElse({});
        const model3d = new Model3DModel({
            data: model,
            date: Date.now()
        });

        model3d.save(options).then((doc) => {
            resolve(doc._id);
        }).catch((err) => {
            throw new Error(err)
        });
    });
}
