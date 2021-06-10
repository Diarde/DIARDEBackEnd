import { Request, Response, NextFunction } from "express";
import { ClientSession } from "mongoose";
import * as HttpStatus from "http-status-codes";
import { Roles } from "../../utility/enums";
import ProjectModel from "../../models/project";
import { logger } from "../../log/logger";
import { block } from '../../utility/functional';
import { none, some, Option } from 'ts-option';

export let getGeometry = (req: Request, res: Response, next: NextFunction) => {
  const loadGeometry = (
    projectId: string,
    roomId: string,
    geometryId: string,
    user: any,
    res: Response,
    next: NextFunction
  ) => {
    const isAdmin = user.roles.includes(Roles.ADMIN);

    ProjectModel.findById(projectId)
      .populate({
        path: "rooms",
        match: { _id: { $eq: roomId } },
        populate: [
          {
            path: "versions",
            select: "_id revisions",
            match: { _id: { $eq: geometryId } },
            populate: [
              {
                path: "revisions",
                select: "_id date data",
                options: {
                  sort: { date: -1},
                  limit: 1,
                },
              },
            ],
          },
        ],
      })
      .exec(function (err, project) {
        if (!err) {
          if (!isAdmin && (project as any).creator != user.id) {
            res
              .status(HttpStatus.UNAUTHORIZED)
              .json({ error: "Not Authorized." });
          } else {
            res
              .status(HttpStatus.OK)
              .json(
                (project as any).rooms.find(
                  (x) => x !== undefined
                ).versions.find(
                  (x) => x !== undefined
                )
              );
          }
        } else {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal server error." });
        }
      });
  };

  loadGeometry(
    req.params.projectId,
    req.params.roomId,
    req.params.geometryId,
    req.user,
    res,
    next
  );
};

export let getGeometries = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const loadGeometries = (
    projectId: string,
    roomId: string,
    user: any,
    res: Response,
    next: NextFunction
  ) => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logger.log(
      `Get geometries by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
    );

    const isAdmin = user.roles.includes(Roles.ADMIN);

    ProjectModel.findById(projectId)
      .populate({
        path: "rooms",
        match: { _id: { $eq: roomId } },
        populate: [
          {
            path: "versions",
            select: "_id name",
          },
        ],
      })
      .exec(function (err, project) {
        if (!err) {
          if (!isAdmin && (project as any).creator != user.id) {
            res
              .status(HttpStatus.UNAUTHORIZED)
              .json({ error: "Not Authorized." });
          } else {
            res
              .status(HttpStatus.OK)
              .json(
                (project as any).rooms.find(x => x!== undefined).versions
              );
          }
        } else {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal server error." });
        }
      });
  };

  loadGeometries(
    req.params.projectId,
    req.params.roomId,
    req.user,
    res,
    next
  );
};

export const getRevisions = (req: Request, res: Response, next: NextFunction) => {
    
  const loadRevisions = (
      projectId: string,
      roomId: string,
      geometryId: string,
      user: any,
      res: Response,
      next: NextFunction
    ) => {
      const isAdmin = user.roles.includes(Roles.ADMIN);
  
      ProjectModel.findById(projectId)
        .populate({
          path: "rooms",
          match: { _id: { $eq: roomId } },
          populate: [
            {
              path: "versions",
              select: "_id revisions",
              match: { _id: { $eq: geometryId } },
              populate: [
                {
                  path: "revisions",
                  select: '_id date author comment model',
                populate: {
                  path: 'author',
                  select: 'email'
                 }
                },
              ],
            },
          ],
        })
        .exec(function (err, project) {
          if (!err) {
            if (!isAdmin && (project as any).creator != user.id) {
              res
                .status(HttpStatus.UNAUTHORIZED)
                .json({ error: "Not Authorized." });
            } else {
              res
                .status(HttpStatus.OK)
                .json(
                  (project as any).rooms.find(
                    (x) => x !== undefined
                  ).versions.find(
                    (x) => x !== undefined
                  ).revisions
                );
            }
          } else {
            res
              .status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({ error: "Internal server error." });
          }
        });
    };

    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logger.log(
      `Get revisions by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
    );
  
    loadRevisions(
      req.params.projectId,
      req.params.roomId,
      req.params.geometryId,
      req.user,
      res,
      next
    );


} 

export const getRevision = (req: Request, res: Response, next: NextFunction) => {
    
    const loadRevision = (
        projectId: string,
        roomId: string,
        geometryId: string,
        revisionId: string,
        user: any,
        res: Response,
        next: NextFunction
      ) => {
        const isAdmin = user.roles.includes(Roles.ADMIN);
    
        ProjectModel.findById(projectId)
          .populate({
            path: "rooms",
            match: { _id: { $eq: roomId } },
            populate: [
              {
                path: "versions",
                select: "_id revisions",
                match: { _id: { $eq: geometryId } },
                populate: [
                  {
                    path: "revisions",
                    select: "_id date data",
                    match: { _id: { $eq: revisionId } },
                  },
                ],
              },
            ],
          })
          .exec(function (err, project) {
            if (!err) {
              if (!isAdmin && (project as any).creator != user.id) {
                res
                  .status(HttpStatus.UNAUTHORIZED)
                  .json({ error: "Not Authorized." });
              } else {
                res
                  .status(HttpStatus.OK)
                  .json(
                    (project as any).rooms.find(x => x !== undefined).versions.find(
                      (x) => x !== undefined
                    ).revisions.find(x =>  x!== undefined)
                  );
              }
            } else {
              res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ error: "Internal server error." });
            }
          });
      };
    
      loadRevision(
        req.params.projectId,
        req.params.roomId,
        req.params.geometryId,
        req.params.revisionId,
        req.user,
        res,
        next
      );


} 

export const getModel = (req: Request, res: Response, next: NextFunction) => {
    
  const loadModel = (
      projectId: string,
      roomId: string,
      user: any,
      res: Response,
      next: NextFunction
    ) => {
      const isAdmin = user.roles.includes(Roles.ADMIN);
  
      ProjectModel.findById(projectId)
        .populate({
          select: '_id name processing.result.skp processing.result.dxf',
          path: "rooms",
          match: { _id: { $eq: roomId } },
          populate: [
            {
              path: "processing.result.model"
            },
          ],
        })
        .exec(function (err, project) {
          if (!err) {
            if (!isAdmin && (project as any).creator != user.id) {
              res
                .status(HttpStatus.UNAUTHORIZED)
                .json({ error: "Not Authorized." });
            } else {
              res
                .status(HttpStatus.OK)
                .json(
                  block<any, any>((room) => {
                    const result: Option<any> = room.processing ? room.processing.result ? some(room.processing.result) : none : none; 
                    return ({
                    name: room.name,
                    skp: result.map(result => result.skp ? true: false).getOrElse(false),
                    dxf: result.map(result => result.dxf ? true: false).getOrElse(false),
                    model: result.map(result => result.model).getOrElse(undefined)
                  })},
                  () => undefined)(((project as any).rooms as Array<any>).find(x => x !== undefined))
                );
            }
          } else {
            res
              .status(HttpStatus.INTERNAL_SERVER_ERROR)
              .json({ error: "Internal server error." });
          }
        });
    };
  
    loadModel(
      req.params.projectId,
      req.params.roomId,
      req.user,
      res,
      next
    );


} 



