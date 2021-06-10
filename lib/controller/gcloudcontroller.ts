import { Request, Response, NextFunction } from "express";
import * as CloudStorage from "@google-cloud/storage";
import { Option, some, none } from "ts-option";
import { rescale, rescaleBuffer } from "../utility/rescaling";
import * as HttpStatus from "http-status-codes";
import { getCloudStorage} from "../config/config";
import * as path from "path";
import sharp = require("sharp");
import * as crypto from "crypto";
import { Readable } from "nodemailer/lib/xoauth2";

let _storage: Option<CloudStorage.Storage> = none;
const getStorage = ({ projectId, keyFilename }): CloudStorage.Storage => {
  return _storage.getOrElse(() => {
    const storage = new CloudStorage.Storage({ projectId, keyFilename });
    _storage = some(storage);
    return storage;
  });
};

export let getGCloudPhoto = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.type(`image/jpg`);
  res.set('Cache-control', 'public')

  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");

  const file = bucket.file(path.join("uploads", req.url));
  file.exists().then((exists) => {
    if (exists[0]) {
      file.createReadStream().pipe(res);
    } else {
      const _path = path.join(
        "uploads",
        req.url.split(".").slice(0, -2).join(".")
      );
      const thumb = bucket.file(_path);
      thumb.exists().then((thumb_exists) => {
        if (thumb_exists[0]) {
          rescale(thumb.createReadStream()).map((stream) => stream.pipe(res));
        } else {
          res.status(HttpStatus.NOT_FOUND).send();
          return none;
        }
      });
    }
  });
};

export const getSketchupOrDXFAsReadable = (filename: string, dxf = false): Promise<Readable>  => {

  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");

  const file = bucket.file(path.join('models', dxf ? 'dxf' : 'sketchup', filename));
  
  return file.exists().then(exists => {
    if(exists[0]) return file.createReadStream();
    return Promise.reject()
  });

}

export let postUploadFoto = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");
  
  scaleAndPersistPhotoToGCLoud(req.file, bucket).then((response) => {
    res.status(HttpStatus.OK).send({file: response});
  })
  .catch((err) => {
    res.status(HttpStatus.BAD_REQUEST).send(err.message);
  });;

};

export let postUploadMultiFoto = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");

  let promises = [];

  (req.files as Express.Multer.File[]).map((file) => {
    promises.push(scaleAndPersistPhotoToGCLoud(file, bucket));
  });

  Promise.all(promises)
  .then((response) => {
    res.status(HttpStatus.OK).send({files: response});
  })
  .catch((err) => {
    res.status(HttpStatus.BAD_REQUEST).send(err.message);
  });
};

export const persistUploadSketchUp = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<string> => {
  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");
  
  return persistSketchUpToGCLoud(req.file, bucket);
}

export const persistUploadDXF = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<string> => {
  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");
  
  return persistDXFToGCLoud(req.file, bucket);
}

export const persistPhotos = (
  files: Express.Multer.File[]
): Promise<string[]> => {
  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");

  let promises = [];

  (files as Express.Multer.File[]).map((file) => {
    promises.push(scaleAndPersistPhotoToGCLoud(file, bucket));
  });

  return Promise.all(promises);
}

export const persistPhoto = (
  file: Express.Multer.File
): Promise<string> => {
  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");
  
  return scaleAndPersistPhotoToGCLoud(file, bucket);

}

export const persistEdgeMap = (
  file: Express.Multer.File,
  filename: string
): Promise<string> => {
  const storage = getStorage(getCloudStorage());
  const bucket = storage.bucket("diarde-photos");
  
  return persistEdgeMapToGCLoud(file, filename, bucket);
}

const scaleAndPersistPhotoToGCLoud = (
  file: Express.Multer.File,
  bucket: CloudStorage.Bucket
): Promise<string> => {

  const now = new Date(Date.now());
  const filepath = now.toISOString().slice(0, 4) +
  now.toISOString().slice(5, 7) +
  now.toISOString().slice(8, 10) + '/' + String(Date.now()) + '_' +  crypto.randomBytes(8).toString("hex");

  const blob = bucket.file(path.join('uploads', filepath));

  const newPromise = new Promise((resolve, reject) => {
    blob
      .createWriteStream({
        metadata: { contentType: file.mimetype },
      })
      .on("finish", () => {
        resolve(filepath);
      })
      .on("error", (err) => {
        reject(err);
      })
      .end(file.buffer);
  });

  const scaledblob = bucket.file(path.join('uploads',filepath + '.thumb.jpg'));
  const rescalePromise = rescaleBuffer(file.buffer);
  const scaledPromise = new Promise((resolve, reject) => {
    rescalePromise.then((buffer) => {
      scaledblob
        .createWriteStream({
          metadata: { contentType: file.mimetype },
        })
        .on("finish", () => {
          resolve(filepath + '.thumb.jpg');
        })
        .on("error", (err) => {
          reject(err);
        })
        .end(buffer);
    });
    rescalePromise.catch((err) => {
      reject(err);
    });
  });

  return Promise.all([newPromise, scaledPromise]).then<string>((value) => {
    const [filename, dummy] = value;
    return filename as string;
  });
};

const persistEdgeMapToGCLoud = (
  file: Express.Multer.File,
  filename: string, 
  bucket: CloudStorage.Bucket
): Promise<string> => {

  const blob = bucket.file(path.join('uploads', filename));

  const newPromise = new Promise<string>((resolve, reject) => {
    blob
      .createWriteStream({
        metadata: { contentType: file.mimetype },
      })
      .on("finish", () => {
        resolve(filename);
      })
      .on("error", (err) => {
        reject(err);
      })
      .end(file.buffer);
  });

  return newPromise;
};

const persistSketchUpToGCLoud = (
  file: Express.Multer.File,
  bucket: CloudStorage.Bucket
): Promise<string> => {

  const now = new Date(Date.now());
  const filepath = now.toISOString().slice(0, 4) +
  now.toISOString().slice(5, 7) +
  now.toISOString().slice(8, 10) + '/' + String(Date.now()) + '_' +  crypto.randomBytes(8).toString("hex");

  const blob = bucket.file(path.join('models', 'sketchup', filepath));

  const newPromise = new Promise<string>((resolve, reject) => {
    blob
      .createWriteStream({
        metadata: { contentType: file.mimetype },
      })
      .on("finish", () => {
        resolve(filepath);
      })
      .on("error", (err) => {
        reject(err);
      })
      .end(file.buffer);
  });

 

  return newPromise;
};

const persistDXFToGCLoud = (
  file: Express.Multer.File,
  bucket: CloudStorage.Bucket
): Promise<string> => {

  const now = new Date(Date.now());
  const filepath = now.toISOString().slice(0, 4) +
  now.toISOString().slice(5, 7) +
  now.toISOString().slice(8, 10) + '/' + String(Date.now()) + '_' +  crypto.randomBytes(8).toString("hex");

  const blob = bucket.file(path.join('models', 'dxf', filepath));

  const newPromise = new Promise<string>((resolve, reject) => {
    blob
      .createWriteStream({
        metadata: { contentType: file.mimetype },
      })
      .on("finish", () => {
        resolve(filepath);
      })
      .on("error", (err) => {
        reject(err);
      })
      .end(file.buffer);
  });

 

  return newPromise;
};