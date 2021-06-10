import { Request, Response, NextFunction } from "express";
import ProjectModel from "../models/project";
import { Option, some, none } from "ts-option";
import { ClientSession } from "mongoose";
import { Roles } from "../utility/enums";
import * as HttpStatus from "http-status-codes";

export let getProjectList = (req: Request, res: Response) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);

  ProjectModel.find(isAdmin ? {} : { creator: req.user.id })
    .populate({
      path: "rooms",
      select: "_id name date fotos",
      populate: {
        path: "fotos",
        $slice: 1
      }
    })
    .exec(function (err, docs) {
      if (!err) {
        res.status(HttpStatus.OK).json(docs);
      } else {
        throw err;
      }
    });
};

/// Load Project

export let postLoadProject = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  loadProject(req.body.id, req.user, res, next);
}

const loadProject = (
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
        { path: "versions", select: "_id name" }
      ]
    })
    .exec(function (err, project) {
      if (!err) {
        if ((!isAdmin) && ((project as any).creator != user.id)) {
          res
            .sendStatus(HttpStatus.UNAUTHORIZED);
        } else {
          res.status(HttpStatus.OK).json(project as any);
        }
      } else {
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
};

/// Save Project

export let postSaveProject = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const project = new ProjectModel({
    description: req.body.description,
    name: req.body.name,
    date: Date.now(),
    creator: req.user.id
  });

  project
    .save()
    .then(doc => {
      res.status(200).send({ id: doc._id });
    })
    .catch(err => { });
};

export let postUpdateName = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const name = req.body.name;

  findAndUpdateProject(id, { name: name }, none);
};

export let postUpdateDescription = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id = req.body.id;
  const description = req.body.description;

  findAndUpdateProject(id, { description: description }, none).then(doc =>
    res.status(200).send(doc)
  );
};

export let postUpdateNameAndDescription = (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  const id = req.body.id;
  const description = req.body.description;
  const name = req.body.name;

  findAndUpdateProject(id, { name: name, description: description }, none).then(doc =>
    res.status(HttpStatus.OK).send(doc)
  );
}

export let putProject = ( req: Request,
  res: Response,
  next: NextFunction) => {

    const id = req.params.projectId;

    const project = req.body;
    delete project.date;
    delete project.creator;
    delete project.rooms;


  findAndUpdateProject(id, project, none).then(doc =>
    res.status(HttpStatus.OK).send(doc)
  );

}


export let addRoom = (
  project_id: string,
  room_id: string,
  session: Option<ClientSession>
) => {
  return new Promise<any>((resolve, reject) => {
    ProjectModel.findById(project_id, (err, project: any) => {
      if (err || (project === null)) {
        reject();
        return;
      }

      const rooms = project.rooms;
      rooms.push(room_id);

      findAndUpdateProject(project_id, { rooms: rooms }, session).then(
        doc => resolve(doc),
        err => reject()
      );
    });
  });
};

let findAndUpdateProject = (
  id: string,
  data: any,
  session: Option<ClientSession>
): Promise<import("mongoose").Document> => {
  const options = session.fold<any>(() => {
    return { new: true };
  })(_session => {
    return { _session, new: true };
  });

  return ProjectModel.findByIdAndUpdate(id, { $set: data }, options)
    .populate("fotos")
    .populate("supplements")
    .populate("geometries", "_id name date")
    .exec();
};
