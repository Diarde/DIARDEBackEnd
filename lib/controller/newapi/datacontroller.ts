import { Request, Response, NextFunction } from "express";
import { Roles } from "../../utility/enums";
import * as HttpStatus from "http-status-codes";
import { logger } from "../../log/logger";
import { persistUploadSketchUp, persistUploadDXF, getSketchupOrDXFAsReadable } from '../gcloudcontroller';
import DataModel from '../../models/data';
import RoomModel from '../../models/rooms';
import ProjectModel from '../../models/project';
import { mail, getSendModelEmail } from '../../mailer/mailer';
import { Readable } from 'nodemailer/lib/xoauth2';
import { ifblock, mapNotNone } from '../../utility/functional';
import { Option, some, none } from 'ts-option';

export const postSketchup = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const isAdmin = req.user.roles.includes(Roles.ADMIN);

    if (!isAdmin) {
        res.sendStatus(HttpStatus.UNAUTHORIZED);
    } else {
        //logger.log(`Create invite for ${req.body.email} by user ${req.user.email} [${req.headers.host}${req.originalUrl}]`);

        persistUploadSketchUp(req, res, next).then(
            (filename) => {
                const data = new DataModel({
                    filename: filename,
                    humanname: req.file.originalname,
                    date: Date.now(),
                    creator: req.user.id,
                });
                return data.save().then(
                    (doc) => {
                        if (doc !== null) {
                            return RoomModel.findOneAndUpdate(
                                { _id: req.params.roomId, visible: { $ne: false } },
                                { $push: { skps: doc._id } }
                            ).exec().then(doc2 =>
                                res.status(HttpStatus.OK).send({ id: doc._id }));
                        }
                        return Promise.reject();
                    }
                );
            }
        ).catch((err) => {
            logger.error(`Error occurred when uploading skp file: ${err}`);
            res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        });

    }
}

export const postDXF = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const isAdmin = req.user.roles.includes(Roles.ADMIN);

    if (!isAdmin) {
        res.sendStatus(HttpStatus.UNAUTHORIZED);
    } else {
        //logger.log(`Create invite for ${req.body.email} by user ${req.user.email} [${req.headers.host}${req.originalUrl}]`);

        persistUploadDXF(req, res, next).then(
            (filename) => {
                const data = new DataModel({
                    filename: filename,
                    humanname: req.file.originalname,
                    date: Date.now(),
                    creator: req.user.id,
                });
                return data.save().then(
                    (doc) => {
                        if (doc !== null) {
                            return RoomModel.findOneAndUpdate(
                                { _id: req.params.roomId, visible: { $ne: false } },
                                { $push: { dxfs: doc._id } }
                            ).exec().then(doc2 =>
                                res.status(HttpStatus.OK).send({ id: doc._id }));
                        }
                        return Promise.reject();
                    }
                );
            }
        ).catch((err) => {
            logger.error(`Error occurred when uploading dxf file: ${err}`);
            res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        });

    }
}

export const sendModelsEmail = (
    req: Request,
    res: Response,
    next: NextFunction) => {

    const getAttachment = (include: boolean, data: { filename: string, humanname: string }, dxf = false):
        Promise<Option<{ name: string, stream: Readable }>> => {
        return ifblock<Promise<Option<{ name: string, stream: Readable }>>>(include && (data !== null || data !== undefined)).let(() => {
            return getSketchupOrDXFAsReadable(data.filename, dxf).then(stream => some({ name: data.humanname, stream: stream }));
        },
            () => {
                return Promise.resolve(none);
            })
    }

    const [projectId, roomId, user] = [req.params.projectId, req.params.roomId, req.user];
    const isAdmin = user.roles.includes(Roles.ADMIN);

    const query = {
        path: 'rooms',
        match: { _id: { $eq: roomId } },
        populate: [
            {
                path: 'processing.result.skp',
                match: { visible: { $ne: false } },
            },
            {
                path: 'processing.result.dxf',
                match: { visible: { $ne: false } },
            },
        ],
    }

    ProjectModel.findById(projectId)
        .populate(query)
        .exec().then(((doc: any) => {
            if (!isAdmin && doc.creator != user.id) {
                res.sendStatus(HttpStatus.UNAUTHORIZED)
            } else {
                if (doc.rooms !== null && doc.rooms.length > 0) {
                    const room = doc.rooms[0];
                    const result = room.processing.result;
                    const attachments = Promise.all<Option<{ name: string, stream: Readable }>>(
                        [getAttachment(req.body.skp, result.skp, false), getAttachment(req.body.dxf, result.dxf, true)]).
                        then((attachmentOptions) => {
                            const attachments = mapNotNone<Option<{ name: string; stream: Readable; }>, { name: string; stream: Readable; }>(x => x)(attachmentOptions);
                            mail(user.email, getSendModelEmail(doc.name, room.name, attachments, user.profile.language));
                            res.status(HttpStatus.OK).send({ success: true });
                        }).catch(err => {
                            res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        });
                } else {
                    res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                }
            }
        })).catch(
            (err) => {
                logger.error(err);
                res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)
            }
        );


}
