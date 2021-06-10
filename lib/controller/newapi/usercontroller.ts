import { Request, Response, NextFunction } from "express";
import { Roles } from "../../utility/enums";
import * as HttpStatus from "http-status-codes";
import { logger } from "../../log/logger";
import User from "../../models/user";
import { mail, getResetEmail, getRegisterEmail } from "../../mailer/mailer";
import * as crypto from "crypto";

export const getUsers = (req: Request, res: Response) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  logger.log(
    `Request users by user ${req.user.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
  );

  if (!isAdmin) {
    res.sendStatus(HttpStatus.UNAUTHORIZED);
  } else {
    User.find({}, "_id email verified roles createdAt").exec(function (err, docs) {
      if (!err) {
        res.status(HttpStatus.OK).json(docs);
      } else {
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  }
};

export const signup = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
  req.assert("confirmPassword", "Passwords do not match.").equals(req.body.password);
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });
  validate(req, res, next).do(() => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logger.log(
      `Request signup by ${req.body.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
    );
  
    const token = crypto.randomBytes(16).toString("hex");
  
    const user = new User({
      email: req.body.email,
      password: req.body.password,
      verified: false,
      verificationToken: token,
      roles: [Roles.USER],
      profile: {language: req.body.language}
    });
  
    User.findOne({ email: req.body.email }).exec().then((existingUser: any) => {
      if (existingUser) {
        res.status(HttpStatus.OK).send({ success: false, error: 'User exists' });
      }
      user.save().then(() => {
        const email = getRegisterEmail(`${req.headers.host}/status/${token}`, req.body.language);
        mail(req.body.email, email).then(() => {
          res.status(HttpStatus.OK).send({success: true, error: null, result: user});
        });
      }
      ).catch(err => { res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)});
    }).catch(err => { res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)});
  });
 
};

export const verifiyEmail = (req: Request, res: Response, next: NextFunction) => {
  req.assert("token", "Token is not valid").exists();
  validate(req, res, next).do(() => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logger.log(
      `Request email verification with token ${req.body.token} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
    );
  
    User.findOne({ verificationToken: req.body.token }).exec().then((user: any) => {
      if (!user) {
        res.status(HttpStatus.OK).send({ success: false, error: 'Token is not valid' });
        return;
      }
        user.verified = true;
        user.verificationToken = undefined;
        user.save().then(() => {
          req.logIn(user, (err) => {
            if(!err){
              logger.log(
                `Logged in user ${user.email} via Signup [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
              );
              res.status(HttpStatus.OK).send({success: true, error: null, user: { email: user.email, language: user.profile.language }});
              return;
            }
            res.status(HttpStatus.OK).send({ success: true, error: "Could not sign in user" });
        });
      });
    }).catch(err => { res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)});
  });

};

export const requestpasswordreset = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.assert("email", "Please enter a valid email address.").isEmail();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });
  validate(req, res, next).do(() => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logger.log(
      `Request password reset email by ${req.body.email} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
    );
  
    const token = crypto.randomBytes(16).toString("hex");
  
    User.findOne({ email: req.body.email })
      .exec()
      .then((user: any) => {
        if (!user) {
              res.status(HttpStatus.OK).send({success: false, error: "Account with that email address does not exist."});
        }
        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour
        user.save()
          .then((user) => {
            const email = getResetEmail(`${req.headers.host}/passwordreset/${token}`, user.profile.langugage ? user.profile.language : 'en');
            mail(user.email, email).then(() => {
              res.status(HttpStatus.OK).send({success: true, error: null});
            }).catch((err) => {res.status(HttpStatus.OK).send({success: false, error: "Email could not be sent"})});
          })
          .catch((err) => {
            logger.error(`Error occured ${err}`);
            res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)});
      }).catch(err => { 
        logger.error(`Error occured ${err}`);
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR)});
  });
  
};

export const passwordreset = (req: Request,
  res: Response,
  next: NextFunction) => {
    req.assert("password", "Password must be at least 4 characters long.").len({ min: 4 });
    req.assert("confirm", "Passwords must match.").equals(req.body.password);
    req.assert("token", "Token is not valid.").exists();
    validate(req, res, next).do(() => {
      const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      logger.log(
        `Request password reset with token ${req.body.token} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
      );
  
      User
      .findOne({ passwordResetToken: req.body.token })
      .where("passwordResetExpires").gt(Date.now())
      .exec().then((user: any) => {
        if (!user) {
          res.status(HttpStatus.OK).send({success: false, error: "Password reset token is invalid or has expired"});
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.save().then((user: any) => {
          req.logIn(user, (err) => {
            if(!err){
              res.status(HttpStatus.OK).send({success: true, error: null, result: user});
              return;
            }
            res.status(HttpStatus.OK).send({success: false, error: "Could not sign in user"});
          });
        });
      }).catch(err => {
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR); 
      });
    });
    
  } 

export const isTokenValid = (req: Request,
  res: Response,
  next: NextFunction) => {
    req.assert("token", "Token is missing").exists();
    validate(req, res, next).do(() => {
      
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    logger.log(
      `Request token validity with token ${req.params.token} [host=${req.headers.host}${req.originalUrl}, ip=${ip}]`
    );

    User
    .findOne({ passwordResetToken: req.params.token })
    .where("passwordResetExpires").gt(Date.now())
    .exec().then((user: any) => {
      if (!user) {
        res.status(HttpStatus.OK).send({success: true, error: null, result: false});
        return;
      }
      res.status(HttpStatus.OK).send({success: true, error: null, result: true});
    }).catch(err => {
      res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR); 
    });
    });
  
  } 


const validate = (req: Request, res: Response, next: NextFunction): {do: (func: ()=> void) => void} => {
  const errors = req.validationErrors();
  if (errors) {
    res.status(HttpStatus.OK).send({success: false, error: errors[0].msg});
  }
  return { "do":   errors ? (func: () => void) => { } : (func: () => void) => { func()}}
} 
