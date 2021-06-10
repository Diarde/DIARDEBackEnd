import { Request, Response, NextFunction } from 'express';
import * as HttpStatus from 'http-status-codes';
import { logger } from '../../log/logger';
import ProjectModel from '../../models/project';
import { Roles, Status } from '../../utility/enums';
import RoomModel from '../../models/rooms';
import { addPhoto, addPhotos } from './photocontroller';
import { persistPhoto, persistPhotos } from '../gcloudcontroller';
import { none } from 'ts-option';
import { startSessionAndTransaction } from '../../utility/sessionManager';
import * as NewProjectController from './projectcontroller';
import FotoModel from '../../models/foto';
import { ifblock } from '../../utility/functional';

export let getRoom = (req: Request, res: Response, next: NextFunction) => {
  const _loadRoom = (
    projectId: string,
    roomId: string,
    user: any,
    res: Response,
    next: NextFunction
  ) => {
    const isAdmin = user.roles.includes(Roles.ADMIN);

    const query = !isAdmin
      ? {
          path: 'rooms',
          select:
            'name date description _id fotos supplements versions processing.status processing.result.model',
          match: { _id: { $eq: roomId } },
          populate: [
            { path: 'fotos', match: { visible: { $ne: false } } },
            { path: 'supplements', match: { visible: { $ne: false } } },
            { path: 'versions', select: '_id name' },
          ],
        }
      : {
          path: 'rooms',
          match: { _id: { $eq: roomId } },
          populate: [
            { path: 'fotos', match: { visible: { $ne: false } } },
            { path: 'supplements', match: { visible: { $ne: false } } },
            { path: 'versions', select: '_id name' },
            { path: 'skps', match: { visible: { $ne: false } } },
            { path: 'dxfs', match: { visible: { $ne: false } } },
            {
              path: 'processing.result.skp',
              match: { visible: { $ne: false } },
            },
            {
              path: 'processing.result.dxf',
              match: { visible: { $ne: false } },
            },
          ],
        };

    ProjectModel.findById(projectId)
      .populate(query)
      .exec(function (err, project) {
        if (!err) {
          if (!isAdmin && (project as any).creator != user.id) {
            res
              .status(HttpStatus.UNAUTHORIZED)
              .json({ error: 'Not Authorized.' });
          } else {
            res
              .status(HttpStatus.OK)
              .json((project as any).rooms.find((x) => x !== undefined));
          }
        } else {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: 'Internal server error.' });
        }
      });
  };

  _loadRoom(req.params.projectId, req.params.roomId, req.user, res, next);
};

export let getRooms = (req: Request, res: Response, next: NextFunction) => {
  const _loadRooms = (
    projectId: string,
    user: any,
    res: Response,
    next: NextFunction
  ) => {
    const isAdmin = user.roles.includes(Roles.ADMIN);

    ProjectModel.findOne(
      isAdmin
        ? { _id: projectId, visible: { $ne: false } }
        : { _id: projectId, visible: { $ne: false }, creator: user.id }
    )
      .populate({
        path: 'rooms',
        select: '_id description name date',
        match: { visible: { $ne: false } },
        populate: [
          {
            path: 'fotos',
            match: { visible: { $ne: false } },
            select: '_id filename date',
          },
          { path: 'supplements' },
        ],
      })
      .exec(function (err, project) {
        if (!err) {
          if (!isAdmin && (project as any).creator != user.id) {
            res
              .status(HttpStatus.UNAUTHORIZED)
              .json({ error: 'Not Authorized.' });
          } else {
            res.status(HttpStatus.OK).json((project as any).rooms);
          }
        } else {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: 'Internal server error.' });
        }
      });
  };

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Get rooms by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  _loadRooms(req.params.projectId, req.user, res, next);
};

export let getAllRooms = (req: Request, res: Response, next: NextFunction) => {
  const _loadAllRooms = (user: any, res: Response, next: NextFunction) => {
    const isAdmin = user.roles.includes(Roles.ADMIN);

    ProjectModel.find(
      isAdmin
        ? { visible: { $ne: false } }
        : { visible: { $ne: false }, creator: user.id }
    )
      .populate({
        path: 'rooms',
        select: '_id description name date processing.status processing.result.model',
        match: { visible: { $ne: false } },
        
      }).populate({ path: 'creator', select: '_id email' })
      .exec(function (err, project) {
        if (!err) {
          if (!isAdmin && ((project as any).creator === null || 
            (project as any).creator === undefined || 
            ((project as any).creator._id !== user.id))) {
            res
              .status(HttpStatus.UNAUTHORIZED)
              .json({ error: 'Not Authorized.' });
          } else {
            res.status(HttpStatus.OK).json(project as any);
          }
        } else {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: 'Internal server error.' });
        }
      });
  };

  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Get all rooms by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  _loadAllRooms(req.user, res, next);
};

export let postRoom = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Add room with for project: ${req.params.projectId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  startSessionAndTransaction().then((session) => {
    const room = new RoomModel({
      description: req.body.description,
      name: req.body.name,
      date: Date.now(),
      creator: req.user.id,
      'processing.status' : Status.OPEN 
    });

    const options = session
      .map<any>((_session) => {
        return { _session };
      })
      .getOrElse({});

    return room
      .save(options)
      .then((room) => {
        return NewProjectController.addRoom(
          req.params.projectId,
          room._id,
          req.user,
          session
        );
      })
      .then((doc) => {
        session.map((_session) => {
          _session.commitTransaction();
          _session.endSession();
        });
        res.status(HttpStatus.OK).send({ id: room._id });
      })
      .catch((err) => {
        session.map((_session) => {
          _session.abortTransaction();
          _session.endSession();
        });
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: 'Internal server error.' });
      });
  });
};

export let putRoom = (req: Request, res: Response, next: NextFunction) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Update room with id ${req.params.projectId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  const sub = {
    name: req.body.name !== null ? req.body.name : undefined,
    description:
      req.body.description !== null ? req.body.description : undefined,
  };

  ProjectModel.findOne(
    isAdmin
      ? { _id: req.params.projectId, visible: { $ne: false } }
      : {
          _id: req.params.projectId,
          visible: { $ne: false },
          creator: req.user.id,
        },
    { visible: false }
  )
    .exec()
    .then((doc) => {
      if (doc !== null) {
        RoomModel.findOneAndUpdate(
          { _id: req.params.roomId, visible: { $ne: false } },
          sub
        )
          .exec()
          .then((doc2) => {
            if (doc2 !== null) {
              res.status(HttpStatus.OK).send({ success: true });
            } else {
              res.sendStatus(HttpStatus.NOT_FOUND);
            }
          })
          .catch();
      } else {
        res.sendStatus(HttpStatus.NOT_FOUND);
      }
    })
    .catch((err) => {
      logger.error(`${err}`);
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};

export let deleteRoom = (req: Request, res: Response, next: NextFunction) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Delete room with id ${req.params.projectId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  ProjectModel.findOne(
    isAdmin
      ? { _id: req.params.projectId, visible: { $ne: false } }
      : {
          _id: req.params.projectId,
          visible: { $ne: false },
          creator: req.user.id,
        },
    { visible: false }
  )
    .exec()
    .then((doc) => {
      if (doc !== null) {
        RoomModel.findOneAndUpdate(
          { _id: req.params.roomId, visible: { $ne: false } },
          { visible: false }
        )
          .exec()
          .then((doc2) => {
            if (doc2 !== null) {
              res.status(HttpStatus.OK).send({ success: true });
            } else {
              res.sendStatus(HttpStatus.NOT_FOUND);
            }
          })
          .catch();
      } else {
        res.sendStatus(HttpStatus.NOT_FOUND);
      }
    })
    .catch((err) => {
      logger.error(`${err}`);
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};

export let postPhoto = (req: Request, res: Response, next: NextFunction) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Upload photo with to project: ${req.params.projectId} and room: ${req.params.roomId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  ProjectModel.findOne(
    isAdmin
      ? { _id: req.params.projectId, visible: { $ne: false } }
      : {
          _id: req.params.projectId,
          visible: { $ne: false },
          creator: req.user.id,
        },
    { visible: false }
  )
    .exec()
    .then((doc) => {
      if (doc !== null) {
        persistPhoto(req.file)
          .then((filename) => {
            addPhoto(filename, none)
              .then((doc2) => {
                if (doc2 !== null) {
                  RoomModel.findOneAndUpdate(
                    { _id: req.params.roomId, visible: { $ne: false } },
                    { $push: { foto: doc2._id } }
                  )
                    .exec()
                    .then((doc3) => {});
                } else {
                  res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
                }
              })
              .catch((err) => {
                res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
              });
          })
          .catch((err) => {
            res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
          });
          res.status(HttpStatus.OK).send({ success: true });
      } else {
        res.sendStatus(HttpStatus.NOT_FOUND);
      }
    })
    .catch((err) => {
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};

export let postPhotos = (req: Request, res: Response, next: NextFunction) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Upload photos to project: ${req.params.projectId} and room: ${req.params.roomId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  ProjectModel.findOne(
    isAdmin
      ? { _id: req.params.projectId, visible: { $ne: false } }
      : {
          _id: req.params.projectId,
          visible: { $ne: false },
          creator: req.user.id,
        }
  )
    .exec()
    .then((doc) => {
      if (doc !== null) {
        return persistPhotos(req.files as Express.Multer.File[]).then(
          (filenames: string[]) => {
            return addPhotos(filenames, none).then((doc2: any[]) => {
              if (doc2 !== null) {
                RoomModel.findOneAndUpdate(
                  { _id: req.params.roomId, visible: { $ne: false } },
                  { $push: { fotos: { $each: doc2.map((d) => d._id) } } }
                )
                  .exec()
                  .then((doc3) => {
                    if (doc3 !== null) {
                      res.status(HttpStatus.OK).send({ success: true });
                    } else {
                      return Promise.reject();
                    }
                  });
              } else {
                return Promise.reject();
              }
            });
          }
        );
      } else {
        return Promise.reject();
      }
    })
    .catch((err) => {
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};

export const postEdgeMap = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

 FotoModel.findById(req.params.imageId).exec().then(doc =>
  {
    console.log(doc);
  }
  //persistEdgeMap(req.file, doc.filename)
 )

}

export const deletePhoto = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Delete photos with to project: ${req.params.projectId} and room: ${req.params.roomId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  ProjectModel.findOne(
    isAdmin
      ? { _id: req.params.projectId }
      : {
          _id: req.params.projectId,
          creator: req.user.id,
        }
  )
    .populate({
      path: 'rooms',
      select: '_id',
      match: { _id: { $eq: req.params.roomId } },
      populate: [
        { path: 'fotos', match: { _id: { $eq: req.params.imageId } } },
      ],
    })
    .exec()
    .then((doc) => {
      if (
        doc !== null &&
        ((doc as any).rooms as Array<any>).length > 0 &&
        (((doc as any).rooms[0] as any).fotos as Array<any>).length > 0
      ) {
        return FotoModel.findByIdAndUpdate(req.params.imageId, {
          $set: { visible: false },
        })
          .exec()
          .then((doc) => {
            if (doc !== null) {
              res.status(HttpStatus.OK).send({ success: true });
            } else {
              return Promise.reject();
            }
          });
      } else {
        return Promise.reject();
      }
    })
    .catch((err) => {
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};

export const updateModels = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Update room models with id ${req.params.projectId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  ifblock(isAdmin).let(
    () => {
      const roomID = req.params.roomId;
      const modelID = req.body.modelID !== null ? req.body.modelID : undefined;
      const skpID = req.body.skpID !== null ? req.body.skpID : undefined;
      const dxfID = req.body.dxfID !== null ? req.body.dxfID : undefined;
      const sub = {
        'processing.status': Status.PROCESSED,
        'processing.result': { model: modelID, skp: skpID, dxf: dxfID },
      };

      RoomModel.findOneAndUpdate(
        { _id: roomID, visible: { $ne: false } },
        sub,
        {new: true})
        .exec()
        .then((doc) => {
          if (doc !== null) {
            res.status(HttpStatus.OK).send(doc);
          } else {
            return Promise.reject(`Document not found or updated ${doc}`);
          }
        })
        .catch((err) => {
          logger.error(`Error occurred when updating models: ${err}`);
          res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)});
    },
    () => res.sendStatus(HttpStatus.UNAUTHORIZED)
  );
};

export const submitPhotos = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  logger.log(
    `Update room status with id ${req.params.projectId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  const query = !isAdmin
    ? {
        path: 'rooms',
        select: 'name date description _id fotos supplements versions processing.status',
        match: { _id: { $eq: req.params.roomId } },
        populate: [
          { path: 'fotos', match: { visible: { $ne: false } } },
          { path: 'supplements', match: { visible: { $ne: false } } },
          { path: 'versions', select: '_id name' },
        ],
      }
    : {
        path: 'rooms',
        match: { _id: { $eq: req.params.roomId } },
        populate: [
          { path: 'fotos', match: { visible: { $ne: false } } },
          { path: 'supplements', match: { visible: { $ne: false } } },
          { path: 'versions', select: '_id name' },
          { path: 'skps', match: { visible: { $ne: false } } },
          { path: 'dxfs', match: { visible: { $ne: false } } },
          {
            path: 'processing.result.model',
            match: { visible: { $ne: false } },
          },
          {
            path: 'processing.result.skp',
            match: { visible: { $ne: false } },
          },
          {
            path: 'processing.result.dxf',
            match: { visible: { $ne: false } },
          },
        ],
      };

  ProjectModel.findOne(
    isAdmin
      ? { _id: req.params.projectId }
      : {
          _id: req.params.projectId,
          creator: req.user.id,
        }
  )
    .populate({
      path: 'rooms',
      select: '_id',
      match: { _id: { $eq: req.params.roomId } },
    })
    .exec()
    .then((doc) => {
      if (doc !== null && ((doc as any).rooms as Array<any>).length > 0) {
        return RoomModel.findByIdAndUpdate(
          req.params.roomId,
          { 'processing.status': Status.PENDING },
          {
            new: true,
          }
        )
          .populate(query)
          .exec()
          .then((doc) => {
            if (doc !== null) {
              res.status(HttpStatus.OK).send(doc);
            } else {
              return Promise.reject();
            }
          });
      } else {
        return Promise.reject();
      }
    })
    .catch((err) => {
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};
