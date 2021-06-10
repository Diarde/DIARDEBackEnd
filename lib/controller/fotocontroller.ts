import { Request, Response, NextFunction } from "express";
import FotoModel from '../models/foto';
import * as path from 'path';
import { startSessionAndTransaction } from "../utility/sessionManager";
import { getUploadBasePath } from "../config/config";
import { loadRescaleAndSave, loadAndRescale } from "../utility/rescaling";
import { Option, some, none } from "ts-option";

export let getPhotoFallback = (req: Request, res: Response, next: NextFunction) => {
    res.type(`image/jpg`);
    loadAndRescale(path.join(getUploadBasePath(), req.url.split('.').slice(0, -2).join('.'))).
        map((stream) => { stream.pipe(res) }).
        orElse(() => { res.status(404).send(); return none; })
};

export let postUploadFoto = (req: Request, res: Response, next: NextFunction) => {
    const _path = req.file.path.split('/').splice(-2).join('/');
    const input = path.join(getUploadBasePath(), _path);
    const output = path.join(getUploadBasePath(), _path + '.thumb.jpg');
    loadRescaleAndSave(input, output);
    res.status(200).json({ file: _path });
};

export let postUploadMultiFoto = (req: Request, res: Response, next: NextFunction) => {
    const paths = (req.files as Express.Multer.File[]).map(file => {
        const _path = file.path.split('/').splice(-2).join('/');
        const input = path.join(getUploadBasePath(), _path);
        const output = path.join(getUploadBasePath(), _path + '.thumb.jpg');
        loadRescaleAndSave(input, output);
        return _path;
    });
    res.status(200).json({ files: paths });
};

export let postAddPhoto = (req: Request, res: Response, next: NextFunction) => {

    const foto = new FotoModel({
        filename: req.body.filename,
        date: Date.now(),
        owner: null,
        metadata: { x: 0, y: 0 }
    });

    foto.save().then(data => {
        res.status(200).json({ id: data._id });
    });

};

export let postAddPhotos = (req: Request, res: Response, next: NextFunction) => {

    startSessionAndTransaction().then(session => {
        return Promise.all(
            (req.body.filenames as Array<string>).map((filename) => {
                const foto = new FotoModel({
                    filename: filename,
                    date: Date.now(),
                    owner: null,
                    metadata: { x: 0, y: 0 }
                });
                const options = session.map<any>(_session => { return { _session } }).getOrElse({});
                return foto.save(options);
            })
        ).then(data => {
            session.map(_session => {
                _session.commitTransaction();
                _session.endSession();
            })
            res.status(200).json({ ids: data.map(datum => datum._id) })
        }).
            catch(err => {
                session.map(_session => {
                    _session.abortTransaction();
                    _session.endSession();
                })
            });
    })

};
