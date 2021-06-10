import { Request, Response, NextFunction } from "express";
import GeometryModel from "../models/geometry";
import * as RoomController from "./roomcontroller";
import { saveModel3D } from "./model3dcontroller";
import { Option, none, some } from "ts-option";
import { ClientSession } from 'mongoose';
import { startSessionAndTransaction } from "../utility/sessionManager";
import GeometryRevisionModel from "../models/geometryrevision";
import GeometryVersionModel from "../models/geometryversion";
import RoomModel from "../models/rooms";
import { Roles } from "../utility/enums";
import ProjectModel from "../models/project";
import * as HttpStatus from "http-status-codes";



export let postLoadGeometry = (req: Request, res: Response, next: NextFunction) => {

    GeometryVersionModel.findById(req.body.id).
        populate({
            path: 'revisions', select: '_id date data', options: {
                limit: 1
            }
        }).exec().then(
            (geometry) => { res.status(200).json((geometry as any)) },
            (err) => { console.log(err); }
        )
};

export let postSaveGeometry = (req: Request, res: Response, next: NextFunction) => {

    saveRevision(req.body.name, req.body.room_id, req.user._id, req.body.geometry, none, none).
        then((_id: string) => { res.status(200).send({ id: _id }) }).
        catch((err) => { console.log(err); })

}

export let postLoadRevisionList = (req: Request, res: Response, next: NextFunction) => {

    GeometryVersionModel.findById(req.body.id).
        populate({
            path: 'revisions',
            select: '_id date author comment model',
            populate: {
                path: 'author',
                select: 'email'
            }
        }).exec().then(
            (geometry) => { res.status(200).json((geometry as any)) },
            (err) => { console.log(err); }
        )
}

export let postLoadRevision = (req: Request, res: Response, next: NextFunction) => {

    GeometryRevisionModel.findById(req.body.id).exec().then(
            (geometry) => { res.status(200).json((geometry as any)) },
            (err) => { console.log(err); }
        )

}

export let postLoadAllRevisions = (req: Request, res: Response, next: NextFunction) => {

    GeometryVersionModel.findById(req.body.id).
        populate({
            path: 'revisions', select: '_id date data'
        }).exec().then(
            (geometry) => { res.status(200).json((geometry as any)) },
            (err) => { console.log(err); }
        )
};

export let postSaveGeometryAndModel = (req: Request, res: Response, next: NextFunction) => {

    const name = req.body.name;
    const room_id = req.body.room_id;
    const geometry = req.body.geometry;
    const model = req.body.model;

    startSessionAndTransaction().then(session => {

        return saveModel3D(model, session).then((model_id: string) => {
            return saveRevision(name, room_id, req.user._id, geometry, some(model_id), session).then((id: string) => {
                session.map(_session => {
                    _session.commitTransaction();
                    _session.endSession();
                })
                res.status(200).send({ id: id })
            });
        }).catch((err) => {
            session.map(_session => {
                _session.abortTransaction();
                _session.endSession();
            })
            console.log(err);
        });

    });

};

let saveGeometry = (name: string, room_id: string, geometry: object, model_id: Option<string>, session: Option<ClientSession>): Promise<string> => {

    const options = session.map<any>(_session => { return { _session, new: true } }).getOrElse({ new: true });

    return GeometryModel.findOneAndUpdate({ name: name, project: room_id },
        {
            $set: model_id.match({
                some: (model_id) => { return { geometry: geometry, model: model_id } },
                none: () => { return { geometry: geometry } }
            })
        }, options).
        then<string>((existingGeometry) => {
            if (!existingGeometry) {
                const _geometry = new GeometryModel({
                    project: room_id,
                    geometry: geometry,
                    model: model_id.getOrElse(null),
                    name: name,
                    date: Date.now()
                });
                return _geometry.save(options).then<string>((doc) => {
                    return RoomController.addGeometry(room_id, doc._id, session).then<string>(
                        (data) => {
                            return doc._id
                        }).catch(err => { throw new Error(err) });
                }).catch(err => {
                    throw new Error(err);
                });
            } else {
                return existingGeometry._id;
            }
        });

}

let saveRevision = (name: string, room_id: string, author_id: string, data: object, model_id: Option<string>, 
    session: Option<ClientSession>): Promise<string> => {

    const options = session.map<any>(_session => { return { _session, new: true } }).getOrElse({ new: true });

    const revision = new GeometryRevisionModel({
        room: room_id,
        data: data,
        date: Date.now(),
        author: author_id,
        model: model_id.getOrElse(null)
    });

    return revision.save(options).then<string>((doc) => {
        return GeometryVersionModel.findOneAndUpdate({ name: name, room: room_id }, { $push: { revisions: { $each: [doc._id], $position: 0 } } }, options).then<string>(
            (version) => {
                if (!version) {
                    const version = new GeometryVersionModel({
                        room: room_id,
                        revisions: [doc._id],
                        name: name
                    });
                    return version.save(options).then((ver) => {
                        return RoomController.addVersion(room_id, ver._id, session).then<string>(
                            (data) => { return doc._id; }
                        );
                    })
                } else {
                    RoomModel.findById(room_id, (err, res) => {
                        if (err) { return doc._id }
                        if (res && res['versions'].indexOf(version._id) === -1) {
                            return RoomController.addVersion(room_id, version._id, session).then<string>(
                                (data) => { return doc._id; }
                            );
                        }
                    });
                    return doc._id;
                }
            }
        )
    })

}
