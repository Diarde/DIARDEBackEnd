import * as express from "express";
import * as bodyParser from "body-parser";
import { Routes } from "./routes/crmRoutes";
import * as session from "express-session";
import * as passport from "passport";
import * as expressValidator from "express-validator";
import * as lusca from "lusca";
import * as flash from "express-flash";
import * as mongoose from "mongoose";
import * as passportConfig from "./config/passport";
import * as bluebird from "bluebird";
import { getMongoURL } from "./config/config";
import { logger } from "./log/logger";
import * as HttpStatus from "http-status-codes";
import { body } from "express-validator/check";

class App {
  public app: express.Application;
  public routePrv: Routes = new Routes();

  constructor() {
    this.app = express();
    this.app.use(flash());
    let s = passportConfig.isAuthenticated;
    this.connection();
    this.config();
    this.routePrv.routes(this.app);
    this.app.use(function(error, req, res, next) {
      logger.error(`Error occured ${error}`);
      res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  }

  private connection() {
    const mongoUrl: string = getMongoURL();
    (<any>mongoose).Promise = bluebird;
    mongoose
      .connect(mongoUrl)
      .then(() => {
        /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
      })
      .catch((err) => {
        console.log(
          "MongoDB connection error. Please make sure MongoDB is running. " +
            err
        );
        //process.exit();
      });
  }

  private config(): void {
    this.app.use(expressValidator());
    this.app.use(session({ secret: "cats" }));
    this.app.use(bodyParser.json({ limit: "50mb" }));
    this.app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
    this.app.use(passport.initialize());
    this.app.use(passport.session());
    this.app.use(flash());
    this.app.use(lusca.xframe("SAMEORIGIN"));
    this.app.use(lusca.xssProtection(true));
    this.app.use((req, res, next) => {
      res.locals.user = req.user;
      next();
    });
  }
}

export default new App().app;
