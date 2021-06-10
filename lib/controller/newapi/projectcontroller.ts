import { Request, Response, NextFunction } from "express";
import ProjectModel from "../../models/project";
import { Option, some, none } from "ts-option";
import { ClientSession } from "mongoose";
import { Roles } from "../../utility/enums";
import * as HttpStatus from "http-status-codes";
import { logger } from "../../log/logger";
import { ifblock } from "../../utility/functional";

export let getProjects = (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  logger.log(
    `Get projects by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  const isAdmin = req.user.roles.includes(Roles.ADMIN);

  ifblock(!isAdmin).let(
    () => {
      ProjectModel.find(
        { creator: req.user.id, visible: { $ne: false } }
      )
        .select("_id description name date")
        .exec(function (err, docs) {
          if (!err) {
            res.status(HttpStatus.OK).json(docs);
          } else {
            throw err;
          }
        });
    },
    () => {
      ProjectModel.find(
        { visible: { $ne: false } }
      )
        .select("_id description name date creator")
        .populate({ path: "creator", select: "email" })
        .exec(function (err, docs) {
          if (!err) {
            res.status(HttpStatus.OK).json(docs);
          } else {
            throw err;
          }
        });
    })
};

export let getProject = (req: Request, res: Response, next: NextFunction) => {
  logger.log(`Get project: ${req.params.projectId}`);

  const isAdmin = req.user.roles.includes(Roles.ADMIN);

  ProjectModel.findOne(
    isAdmin
      ? { _id: req.params.projectId }
      : {
        _id: req.params.projectId,
        creator: req.user.id,
        visible: { $ne: false },
      }
  )
    .populate({
      path: "rooms",
      select: "_id name description processing.status",
      match: { "visible": { $ne: false } },
      populate: [
        {
          path: "fotos",
          match: { "visible": { $ne: false } },
          select: "_id filename date"
        },
        { path: "supplements",
        match: { "visible": { $ne: false } },
        select: "_id filename date" },
      ],
    })
    .exec(function (err, project) {
      if (!err) {
        if (!isAdmin && (project as any).creator != req.user.id) {
          res.sendStatus(HttpStatus.UNAUTHORIZED);
        } else {
          res.status(HttpStatus.OK).json(project as any);
        }
      } else {
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
};

export let postProject = (req: Request, res: Response, next: NextFunction) => {
  const project = new ProjectModel({
    description: req.body.description,
    name: req.body.name,
    date: Date.now(),
    creator: req.user.id,
  });

  project
    .save()
    .then((doc) => {
      if (doc !== null) {
        res.status(HttpStatus.OK).send({ id: doc._id });
      } else {
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    })
    .catch((err) => { });
};

export let putProject = (req: Request, res: Response, next: NextFunction) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  logger.log(
    `Update project with id ${req.params.projectId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  const sub = {
    name: req.body.name !== null ? req.body.name : undefined,
    description:
      req.body.description !== null ? req.body.description : undefined,
  };

  ProjectModel.findOneAndUpdate(
    isAdmin
      ? { _id: req.params.projectId }
      : {
        _id: req.params.projectId,
        creator: req.user.id,
        visible: { $ne: false },
      },
    sub,
    { new: true }
  )
    .then((doc) => {
      if (doc !== null) {
        res.status(HttpStatus.OK).send(doc);
      } else {
        res.sendStatus(HttpStatus.NOT_FOUND);
      }
    })
    .catch((err) => {
      logger.error(err);
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};

export let deleteProject = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  logger.log(
    `Delete project with id ${req.params.projectId} by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  ProjectModel.findOneAndUpdate(
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
        res.status(HttpStatus.OK).send({ success: true });
      } else {
        res.sendStatus(HttpStatus.NOT_FOUND);
      }
    })
    .catch((err) => {
      logger.error(`An error occured ${err}`);
      res.sendStatus(HttpStatus.NOT_FOUND);
    });
};

export let addRoom = (
  project_id: string,
  room_id: string,
  user: any,
  session: Option<ClientSession>
): Promise<any> => {
  const options = session.fold<any>(() => {
    return { new: true };
  })((_session) => {
    return { _session, new: true };
  });

  const isAdmin = user.roles.includes(Roles.ADMIN);

  return ProjectModel.findOneAndUpdate(
    isAdmin
      ? { _id: project_id }
      : { _id: project_id, visible: { $ne: false } },
    { $push: { rooms: room_id } }, options
  ).exec();
};