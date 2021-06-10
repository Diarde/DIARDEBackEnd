import * as async from "async";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import * as passport from "passport";
import { default as User, UserModel, AuthToken } from "../models/user";
import { Request, Response, NextFunction } from "express";
import { IVerifyOptions } from "passport-local";
import { WriteError } from "mongodb";
const request = require("express-validator");
import {} from "express-validator";
import { Roles } from "../utility/enums";
import * as HttpStatus from "http-status-codes";

/**
 * GET /login
 * Login page.
 */
export let getLogin = (req: Request, res: Response) => {
  if (req.user) {
    res.status(HttpStatus.OK).send({
      name: req.user.name,
      email: req.user.email,
      id: req.user.id,
    });
    return;
  }

  res.status(HttpStatus.UNAUTHORIZED).send({
    error: "not logged on",
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
export let postLogin = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Email is not valid.").isEmail();
  req.assert("password", "Password cannot be blank.").notEmpty();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors(); //as MappedError[];

  if (errors) {
    res
      .status(HttpStatus.OK)
      .send({ authentication: "failed", error: errors[0].msg });
    return;
  }

  passport.authenticate(
    "local",
    (err: Error, user: UserModel, info: IVerifyOptions) => {
      if (err) {
        res
          .status(HttpStatus.OK)
          .send({ authentication: "failed", error: err });
        return;
      }
      if (!user) {
        res
          .status(HttpStatus.OK)
          .send({ authentication: "failed", error: "unknown." });
        return;
      }
      req.logIn(user, (err) => {
        if (err) {
          res
            .status(HttpStatus.OK)
            .send({ authentication: "failed", error: err });
          return;
        }
        res
          .status(HttpStatus.OK)
          .send({
            authentication: "success",
            user: { email: user.email, language: user.profile.language },
          });
        return;
      });
    }
  )(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
export let logout = (req: Request, res: Response) => {
  req.logout();
  res.sendStatus(HttpStatus.OK);
};

/**
 * POST /signup
 * Create a new local account.
 */
export let postSignup = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Email is not valid").isEmail();
  req
    .assert("password", "Password must be at least 4 characters long")
    .len({ min: 4 });
  req
    .assert("confirmPassword", "Passwords do not match.")
    .equals(req.body.password);
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors(); //as MappedError[];

  if (errors) {
    res
      .status(HttpStatus.OK)
      .send({ registering: "failed", error: errors[0].msg });
    return;
  }

  const user = new User({
    email: req.body.email,
    password: req.body.password,
    verified: false,
    roles: [Roles.USER],
    profile: { language: req.body.language },
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) {
      return next(err);
    }
    if (existingUser) {
      res
        .status(HttpStatus.OK)
        .send({ registering: "failed", error: "User already exists" });
      return;
    }
    user.save((err) => {
      if (err) {
        res.status(HttpStatus.OK).send({ registering: "failed", error: err });
        return;
      }
      res.status(HttpStatus.OK).send({ registering: "success" });
      //req.logIn(user, (err) => {
      //  if (err) {
      //    return next(err);
      //  }
      // res.status(200).send({ 'registering': "success" });
      //});
    });
  });
};

export let getUserList = (req: Request, res: Response) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);

  if (!isAdmin) {
    res.sendStatus(HttpStatus.UNAUTHORIZED);
  } else {
    User.find({}, "_id email verified roles").exec(function (err, docs) {
      if (!err) {
        res.status(HttpStatus.OK).json(docs);
      } else {
        res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  }
};

export let postIsAdmin = (req: Request, res: Response) => {
  const isAdmin = req.user.roles.includes(Roles.ADMIN);

  res.status(HttpStatus.OK).json({ admin: isAdmin });
};

/**
 * GET /account
 * Profile page.
 */
export let getAccount = (req: Request, res: Response) => {
  res.render("account/profile", {
    title: "Account Management",
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
export let postUpdateProfile = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  User.findById(req.user.id, (err, user: UserModel) => {
    if (err) {
      return next(err);
    }
    user.profile.name = req.body.name || user.profile.name;
    user.profile.gender = req.body.gender || user.profile.gender;
    user.profile.location = req.body.location || user.profile.location;
    user.profile.website = req.body.website || user.profile.website;
    user.profile.language = req.body.language || user.profile.language;
    user.save((err: WriteError, user) => {
      if (err) {
        if (err.code === 11000) {
          req.flash("errors", {
            msg:
              "The email address you have entered is already associated with an account.",
          });
          return res.redirect("/account");
        }
        return next(err);
      }
      req.flash("success", { msg: "Profile information has been updated." });
      res.status(HttpStatus.OK).send(user.profile);
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
export let postUpdatePassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req
    .assert("password", "Password must be at least 4 characters long")
    .len({ min: 4 });
  req
    .assert("confirmPassword", "Passwords do not match")
    .equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/account");
  }

  User.findById(req.user.id, (err, user: UserModel) => {
    if (err) {
      return next(err);
    }
    user.password = req.body.password;
    user.save((err: WriteError) => {
      if (err) {
        return next(err);
      }
      req.flash("success", { msg: "Password has been changed." });
      res.redirect("/account");
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
export let postDeleteAccount = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) {
      return next(err);
    }
    req.logout();
    req.flash("info", { msg: "Your account has been deleted." });
    res.redirect("/");
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
export let getOauthUnlink = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const provider = req.params.provider;
  User.findById(req.user.id, (err, user: any) => {
    if (err) {
      return next(err);
    }
    user[provider] = undefined;
    user.tokens = user.tokens.filter(
      (token: AuthToken) => token.kind !== provider
    );
    user.save((err: WriteError) => {
      if (err) {
        return next(err);
      }
      req.flash("info", { msg: `${provider} account has been unlinked.` });
      res.redirect("/account");
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
export let getReset = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  User.findOne({ passwordResetToken: req.params.token })
    .where("passwordResetExpires")
    .gt(Date.now())
    .exec((err, user) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        req.flash("errors", {
          msg: "Password reset token is invalid or has expired.",
        });
        return res.redirect("/forgot");
      }
      res.render("account/reset", {
        title: "Password Reset",
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
export let postReset = (req: Request, res: Response, next: NextFunction) => {
  req
    .assert("password", "Password must be at least 4 characters long.")
    .len({ min: 4 });
  req.assert("confirm", "Passwords must match.").equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("back");
  }

  async.waterfall(
    [
      function resetPassword(done: Function) {
        User.findOne({ passwordResetToken: req.params.token })
          .where("passwordResetExpires")
          .gt(Date.now())
          .exec((err, user: any) => {
            if (err) {
              return next(err);
            }
            if (!user) {
              req.flash("errors", {
                msg: "Password reset token is invalid or has expired.",
              });
              return res.redirect("back");
            }
            user.password = req.body.password;
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            user.save((err: WriteError) => {
              if (err) {
                return next(err);
              }
              req.logIn(user, (err) => {
                done(err, user);
              });
            });
          });
      },
      function sendResetPasswordEmail(user: UserModel, done: Function) {
        const transporter = nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: process.env.SENDGRID_USER,
            pass: process.env.SENDGRID_PASSWORD,
          },
        });
        const mailOptions = {
          to: user.email,
          from: "express-ts@starter.com",
          subject: "Your password has been changed",
          text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`,
        };
        transporter.sendMail(mailOptions, (err) => {
          req.flash("success", {
            msg: "Success! Your password has been changed.",
          });
          done(err);
        });
      },
    ],
    (err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    }
  );
};

/**
 * GET /forgot
 * Forgot Password page.
 */
export let getForgot = (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("account/forgot", {
    title: "Forgot Password",
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
export let postForgot = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Please enter a valid email address.").isEmail();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/forgot");
  }

  async.waterfall(
    [
      function createRandomToken(done: Function) {
        crypto.randomBytes(16, (err, buf) => {
          const token = buf.toString("hex");
          done(err, token);
        });
      },
      function setRandomToken(token: AuthToken, done: Function) {
        User.findOne({ email: req.body.email }, (err, user: any) => {
          if (err) {
            return done(err);
          }
          if (!user) {
            req.flash("errors", {
              msg: "Account with that email address does not exist.",
            });
            return res.redirect("/forgot");
          }
          user.passwordResetToken = token;
          user.passwordResetExpires = Date.now() + 3600000; // 1 hour
          user.save((err: WriteError) => {
            done(err, token, user);
          });
        });
      },
      function sendForgotPasswordEmail(
        token: AuthToken,
        user: UserModel,
        done: Function
      ) {
        const transporter = nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: process.env.SENDGRID_USER,
            pass: process.env.SENDGRID_PASSWORD,
          },
        });
        const mailOptions = {
          to: user.email,
          from: "hackathon@starter.com",
          subject: "Reset your password on Hackathon Starter",
          text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`,
        };
        transporter.sendMail(mailOptions, (err) => {
          req.flash("info", {
            msg: `An e-mail has been sent to ${user.email} with further instructions.`,
          });
          done(err);
        });
      },
    ],
    (err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/forgot");
    }
  );
};
