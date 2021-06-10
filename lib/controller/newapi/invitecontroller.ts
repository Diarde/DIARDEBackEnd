import InvitationModel from "../../models/invitations";
import { Request, Response, NextFunction } from "express";
import { Roles } from "../../utility/enums";
import * as HttpStatus from "http-status-codes";
import * as crypto from "crypto";
import { logger } from "../../log/logger";
import { ifblock } from "../../utility/functional";

export const getInvites = (req: Request, res: Response, next: NextFunction) => {
  logger.log(`Request invites by user ${req.user.email} [${req.headers.host}${req.originalUrl}]`);

  const isAdmin = req.user.roles.includes(Roles.ADMIN);

  if (!isAdmin) {
    res.sendStatus(HttpStatus.UNAUTHORIZED);
  } else {
    InvitationModel.find({}).populate({path: "creator", select:' email'}).exec(function (err, docs) {
      if (!err) {
        res.status(HttpStatus.OK).json(docs);
      } else {
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  }
};

export const postInvites = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);

  if (!isAdmin) {
    res.sendStatus(HttpStatus.UNAUTHORIZED);
  } else {
    logger.log(`Create invite for ${req.body.email} by user ${req.user.email} [${req.headers.host}${req.originalUrl}]`);

    const invite = new InvitationModel({
      email: req.body.email,
      token: crypto.randomBytes(16).toString("hex"),
      date: Date.now(),
      creator: req.user.id,
    });

    invite
      .save()
      .then((doc: any) => {
        logger.log(`Created invite ${doc._id}`);
        res.status(HttpStatus.OK).send(doc);
      })
      .catch((err) => {
        logger.error(`Error occured when creating invite: ${err}`);
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      });
  }
};

export const checkForInvite = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  const token = ifblock(req.query.tk !== undefined).let(
    () => {
      logger.log(`Request invite access by token ${req.query.tk} [ip=${ip}]`);
      return req.query.tk;
    },
    () => {
      return req.session.invitetoken;
    }
  );

  InvitationModel.findOne({ token: token })
    .exec()
    .then((document: any) => {
      if (document !== null) {
        req.session.invitetoken = token;
        next();
      } else {
        logger.warn(`Invite request by token ${req.query.tk} declined [ip=${ip}]`);
        res.sendStatus(HttpStatus.UNAUTHORIZED);
      }
    })
    .catch((err) => {
      logger.error(`Error occured when checking for invite: ${err}`);
      res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    });
};
