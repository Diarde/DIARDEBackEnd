import { Request, Response, NextFunction } from "express";
import RoomModel from "../models/rooms";
import * as ProjectController from "./projectcontroller";
import { Option, some, none } from "ts-option";
import { ClientSession } from "mongoose";
import { startSessionAndTransaction } from "../utility/sessionManager";
import * as HttpStatus from "http-status-codes";
import { Roles } from "../utility/enums";
import ProjectModel from "../models/project";
import { postLoadGeometry } from "./geometrycontroller";
import { logger } from "../log/logger";

/// Load Rooms

export const getRooms = (req: Request, res: Response, next: NextFunction) => {
  logger.log(`Get rooms for project: ${req.params.projectId}`);
  loadRooms(req.params.projectId, req.user, res, next);
};

const loadRooms = (
  projectId: string,
  user: any,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = user.roles.includes(Roles.ADMIN);

  ProjectModel.findById(projectId)
    .populate({
      path: "rooms",
      populate: [
        { path: "fotos" },
        { path: "supplements" },
        { path: "versions", select: "_id name" },
      ],
    })
    .exec(function (err, project) {
      if (!err) {
        if (!isAdmin && (project as any).creator != user.id) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: "Not Authorized." });
        } else {
          res.status(HttpStatus.OK).json(project["rooms"] as any);
        }
      } else {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: "Internal server error." });
      }
    });
};

/// Load Room

export let postLoadRoom = (req: Request, res: Response, next: NextFunction) => {
  loadRoom(req.body.id, req.user, res, next);
};

const loadRoom = (
  roomId: string,
  user: any,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = user.roles.includes(Roles.ADMIN);

  RoomModel.findById(roomId)
    .populate("fotos")
    .populate("supplements")
    .populate({
      path: "versions",
      select: "_id name revisions",
      populate: {
        path: "revisions",
        select: "date",
        options: {
          $slice: 1,
        },
      },
    })
    .exec(function (err, project) {
      if (!err) {
        if (!isAdmin && (project as any).creator != user.id) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: "Not Authorized." });
        } else {
          res.status(HttpStatus.OK).json(project as any);
        }
      } else {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: "Internal server error." });
      }
    });
};

/// Load revision list

export let postLoadRevisionListsForRoom = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  RoomModel.findById(req.body.id)
    .populate("fotos")
    .populate("supplements")
    .populate({
      path: "versions",
      select: "_id name revisions",
      populate: {
        path: "revisions",
        select: "date model",
      },
    })
    .exec(function (err, room) {
      if (!err) {
        if (!isAdmin && (room as any).creator != req.user.id) {
          res
            .status(HttpStatus.UNAUTHORIZED)
            .json({ error: "Not Authorized." });
        } else {
          res.status(HttpStatus.OK).json(room as any);
        }
      } else {
        console.log(err);
      }
    });
};

export let postSaveRoom = (req: Request, res: Response, next: NextFunction) => {
  startSessionAndTransaction().then((session) => {
    const room = new RoomModel({
      description: req.body.description,
      name: req.body.name,
      date: Date.now(),
      creator: req.user.id,
    });

    const options = session
      .map<any>((_session) => {
        return { _session };
      })
      .getOrElse({});

    return room
      .save(options)
      .then((room) => {
        return ProjectController.addRoom(
          req.body.project_id,
          room._id,
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
          .json({ error: "Internal server error." });
      });
  });
};

export let postAddPhoto = (req: Request, res: Response, next: NextFunction) => {
  startSessionAndTransaction().then((session) => {
    RoomModel.findById(req.body.id, (err, project: any) => {
      if (err) {
        return next(err);
      }

      const fotos = project.fotos;
      fotos.push(req.body.photo_id);
      const photos = project.photos ? project.photos : [];
      photos.push({ photo: req.body.photo_id, visible: true });

      return findAndUpdateRoom(
        req.body.id,
        { fotos: fotos, photos: photos },
        none
      ).then((doc) => {
        session.map((_session) => {
          _session.commitTransaction();
          _session.endSession();
        });
        res.status(200).send(doc);
      });
    }).catch((err) => {
      session.map((_session) => {
        _session.abortTransaction();
        _session.endSession();
      });
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal server error." });
    });
  });
};

export let postAddPhotos = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  startSessionAndTransaction().then((session) => {
    RoomModel.findById(req.body.id, (err, project: any) => {
      if (err) {
        return next(err);
      }

      const fotos = project.fotos;
      const photos = project.photos.map(photo => { return {photo: photo.photo, visible: photo.visible}});
      req.body.photos.forEach((photo_id) => {
        fotos.push(photo_id);
        photos.push({photo: photo_id, visible: true});
      });

      return findAndUpdateRoom(
        req.body.id,
        { fotos: fotos, photos: photos },
        none
      ).then((doc) => {
        session.map((_session) => {
          _session.commitTransaction();
          _session.endSession();
        });
        res.status(200).send(doc);
      });
    }).catch((err) => {
      session.map((_session) => {
        _session.abortTransaction();
        _session.endSession();
      });
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal server error." });
    });
  });
};

export let postRemovePhoto = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  startSessionAndTransaction().then((session) => {
    RoomModel.findById(req.body.id, (err, project: any) => {
      if (err) {
        return next(err);
      }

      const fotos = project["fotos"];
      const photos = Array.from(project.photos);
      let index = fotos.indexOf(req.body.photo_id, 0);
      if (index > -1) {
        fotos.splice(index, 1);
      }
      project.photos.forEach((photo, index) => {
        if ((photo as any).photo && ((photo as any).photo.equals(req.body.photo_id))) {
          photos.splice(index, 1);
        }
      });

      const supplements = project["supplements"];
      index = supplements.indexOf(req.body.photo_id, 0);
      if (index > -1) {
        supplements.splice(index, 1);
      }

      findAndUpdateRoom(
        req.body.id,
        { fotos: fotos, photos: photos, supplements: supplements },
        none
      ).then((doc) => {
        session.map((_session) => {
          _session.commitTransaction();
          _session.endSession();
        });
        res.status(200).send(doc);
      });
    }).catch((err) => {
      session.map((_session) => {
        _session.abortTransaction();
        _session.endSession();
      });
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: "Internal server error." });
    });
  });
};

export let postAddSupplements = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  RoomModel.findById(req.body.id, (err, project: any) => {
    if (err) {
      return next(err);
    }

    const supplements = project.supplements;
    req.body.supplements.forEach((photo_id) => {
      supplements.push(photo_id);
    });

    findAndUpdateRoom(
      req.body.id,
      { supplements: supplements },
      none
    ).then((doc) => res.status(200).send(doc));
  });
};

export let postUpdateName = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const name = req.body.name;

  findAndUpdateRoom(id, { name: name }, none).then((doc) =>
    res.status(200).send(doc)
  );
};

export let postUpdateDescription = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const description = req.body.description;

  findAndUpdateRoom(id, { description: description }, none).then((doc) =>
    res.status(200).send(doc)
  );
};

export let postUpdateNameAndDescription = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const name = req.body.name;
  const description = req.body.description;

  findAndUpdateRoom(
    id,
    { name: name, description: description },
    none
  ).then((doc) => res.status(HttpStatus.OK).send(doc));
};

export let postUpdateImageSequence = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const ids = req.body.ids;

  findAndUpdateRoom(id, { fotos: ids }, none).then((doc) =>
    res.status(200).send(doc)
  );
};

export let postUpdateSupplementSequence = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const ids = req.body.ids;

  findAndUpdateRoom(id, { supplements: ids }, none).then((doc) =>
    res.status(200).send(doc)
  );
};

export let addGeometry = (
  room_id: string,
  geometry_id: string,
  session: Option<ClientSession>
) => {
  return new Promise<any>((resolve, reject) => {
    RoomModel.findById(room_id, (err, room: any) => {
      if (err) {
        reject(err);
        return;
      }

      const geometries = room.geometries;
      geometries.push(geometry_id);

      findAndUpdateRoom(room_id, { geometries: geometries }, session).then(
        (doc) => resolve(doc),
        (err) => reject(err)
      );
    });
  });
};

export let addVersion = (
  room_id: string,
  version_id: string,
  session: Option<ClientSession>
) => {
  const options = session
    .map<any>((_session) => {
      return { _session, new: true };
    })
    .getOrElse({ new: true });
  return RoomModel.findByIdAndUpdate(
    room_id,
    { $push: { versions: version_id } },
    options
  )
    .populate("fotos")
    .populate("supplements")
    .populate("versions", "_id name")
    .exec();
};

let findAndUpdateRoom = (
  id: string,
  data: any,
  session: Option<ClientSession>
): Promise<import("mongoose").Document> => {
  const options = session
    .map<any>((_session) => {
      return { _session, new: true };
    })
    .getOrElse({ new: true });

  return RoomModel.findByIdAndUpdate(id, { $set: data }, options)
    .populate("fotos")
    .populate("photos")
    .populate("supplements")
    .populate("geometries", "_id name date")
    .exec();
};
