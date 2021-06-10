import { Request, Response } from "express";
import * as express from "express";
import * as UserController from "../controller/usercontroller";
import * as ProjectController from "../controller/projectcontroller";
import * as PhotoController from "../controller/fotocontroller";
import * as GCloudController from "../controller/gcloudcontroller";
import * as GeometryController from "../controller/geometrycontroller";
import * as RoomController from "../controller/roomcontroller";
import * as AuthController from "../controller/authcontroller";
import * as ModelController from "../controller/model3dcontroller";

import * as NewProjectController from "../controller/newapi/projectcontroller";
import * as NewRoomController from "../controller/newapi/roomcontroller";
import * as NewGeometryController from "../controller/newapi/geometrycontroller";
import * as NewUserController from "../controller/newapi/usercontroller";
import * as InviteController from "../controller/newapi/invitecontroller";
import * as DataController from "../controller/newapi/datacontroller";

import * as multer from 'multer';
import { getUploadPath, getUploadBasePath, getApps, hasCloudStorage } from '../config/config';
import vhost = require("vhost");


const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, getUploadPath())
        },
        filename: function (req, file, cb) {
            cb(null, String(Date.now()) + '_' + file.originalname)
        }
    })
})

const gcupload = multer({ storage: multer.memoryStorage() })

const path = require('path');

export class Routes {
    public routes(app: any): void {
        app.route('/_api')
            .get((req: Request, res: Response) => {
                res.redirect("/login");//status(200).send({
                //   message: 'GET request successfulll!!!!'
                // });
            });
        const path = require('path');

        const useCloudStorage = hasCloudStorage();
        useCloudStorage ?  (() => {
            app.use("/_uploads", GCloudController.getGCloudPhoto);
            app.post("/_api/imageupload", gcupload.single('file'), GCloudController.postUploadFoto);
            app.post("/_api/multiimageupload", gcupload.array('file'), GCloudController.postUploadMultiFoto);
        } )() 
        : (() => {
            app.use("/_uploads", express.static(getUploadBasePath()), PhotoController.getPhotoFallback);
            app.post("/_api/imageupload", upload.single('file'), PhotoController.postUploadFoto);
            app.post("/_api/multiimageupload", upload.array('file'), PhotoController.postUploadMultiFoto);
         })()
        app.post("/_api/login", UserController.postLogin);
        app.post("/_api/signup", UserController.postSignup);
        app.post("/_api/isadmin", AuthController.isAuthenticated, UserController.postIsAdmin);
        app.post("/_api/updateprofile", AuthController.isAuthenticated, UserController.postUpdateProfile);
        app.get("/_api/logout", AuthController.isAuthenticated, UserController.logout);
        app.get("/_api/getlogin", AuthController.isAuthenticated, UserController.getLogin);
        app.get("/_api/userlist", AuthController.isAuthenticated, UserController.getUserList);
        app.get("/_api/projectlist", AuthController.isAuthenticated, ProjectController.getProjectList);
        app.post("/_api/revisionlist", AuthController.isAuthenticated, GeometryController.postLoadRevisionList);
        app.post("/_api/createproject", AuthController.isAuthenticated, ProjectController.postSaveProject);
        app.post("/_api/createroom", AuthController.isAuthenticated, RoomController.postSaveRoom);
        app.post("/_api/loadroom", AuthController.isAuthenticated, RoomController.postLoadRoom);
        app.post("/_api/loadproject", AuthController.isAuthenticated, ProjectController.postLoadProject);
        app.post("/_api/loadrevision", AuthController.isAuthenticated, GeometryController.postLoadRevision);
        app.post("/_api/loadallrevisions", AuthController.isAuthenticated, GeometryController.postLoadAllRevisions);
        app.post("/_api/loadrevisionlistsforroom", AuthController.isAuthenticated, RoomController.postLoadRevisionListsForRoom);
        app.post("/_api/addimage", AuthController.isAuthenticated, PhotoController.postAddPhoto);
        app.post("/_api/addmultiimage", AuthController.isAuthenticated, PhotoController.postAddPhotos);
        app.post("/_api/addimagetoroom", AuthController.isAuthenticated, RoomController.postAddPhoto);
        app.post("/_api/addmultiimagetoroom", AuthController.isAuthenticated, RoomController.postAddPhotos);
        app.post("/_api/addsupplementstoroom", AuthController.isAuthenticated, RoomController.postAddSupplements);
        app.post("/_api/removeimage", AuthController.isAuthenticated, RoomController.postRemovePhoto);
        app.post("/_api/updateprojectname", AuthController.isAuthenticated, ProjectController.postUpdateName);
        app.post("/_api/updateprojectdesc", AuthController.isAuthenticated, ProjectController.postUpdateDescription);
        app.post("/_api/updateprojectnameanddesc", AuthController.isAuthenticated, ProjectController.postUpdateNameAndDescription);
        app.post("/_api/updateroomname", AuthController.isAuthenticated, RoomController.postUpdateName);
        app.post("/_api/updateroomdesc", AuthController.isAuthenticated, RoomController.postUpdateDescription);
        app.post("/_api/updateroomnameanddesc", AuthController.isAuthenticated, RoomController.postUpdateNameAndDescription);
        app.post("/_api/updateimgseq", AuthController.isAuthenticated, RoomController.postUpdateImageSequence);
        app.post("/_api/updatespplseq", AuthController.isAuthenticated, RoomController.postUpdateSupplementSequence);
        app.post("/_api/loadgeometry", AuthController.isAuthenticated, GeometryController.postLoadGeometry);
        app.post("/_api/savegeometry", AuthController.isAuthenticated, GeometryController.postSaveGeometry);
        app.post("/_api/savegeometryandmodel", AuthController.isAuthenticated, GeometryController.postSaveGeometryAndModel);
        app.post("/_api/loadmodel", AuthController.isAuthenticated, ModelController.postLoadModel3D);
        
        app.post("/_api/user/login", UserController.postLogin);
        app.post("/_api/user/signup", NewUserController.signup);
        app.post("/_api/user/verifyemail", NewUserController.verifiyEmail);
        app.post("/_api/user/requestpasswordreset", NewUserController.requestpasswordreset);
        app.post("/_api/user/resetpassword", NewUserController.passwordreset);
        app.get("/_api/user/istokenvalid/:token", NewUserController.isTokenValid);
        app.get("/_api/user/isadmin", AuthController.isAuthenticated, UserController.postIsAdmin);
        //app.put("/_api/user", AuthController.isAuthenticated, UserController.postUpdateProfile);
        app.get("/_api/user/logout", AuthController.isAuthenticated, UserController.logout);
        app.get("/_api/user", AuthController.isAuthenticated, UserController.getLogin);
        app.get("/_api/users", AuthController.isAuthenticated, NewUserController.getUsers);
        
        app.get("/_api/projects", AuthController.isAuthenticated, NewProjectController.getProjects);
        app.post("/_api/projects", AuthController.isAuthenticated, NewProjectController.postProject);
        app.get("/_api/projects/:projectId", AuthController.isAuthenticated, NewProjectController.getProject);
        app.put("/_api/projects/:projectId", AuthController.isAuthenticated, NewProjectController.putProject);
        app.delete("/_api/projects/:projectId", AuthController.isAuthenticated, NewProjectController.deleteProject);

        app.get("/_api/projects/all/rooms", AuthController.isAuthenticated, NewRoomController.getAllRooms);
        app.get("/_api/projects/:projectId/rooms", AuthController.isAuthenticated, NewRoomController.getRooms);
        app.post("/_api/projects/:projectId/rooms", AuthController.isAuthenticated, NewRoomController.postRoom);
        app.get("/_api/projects/:projectId/rooms/:roomId", AuthController.isAuthenticated, NewRoomController.getRoom);
        app.put("/_api/projects/:projectId/rooms/:roomId", AuthController.isAuthenticated, NewRoomController.putRoom);
        app.delete("/_api/projects/:projectId/rooms/:roomId", AuthController.isAuthenticated, NewRoomController.deleteRoom);
        app.put("/_api/projects/:projectId/rooms/:roomId/model", AuthController.isAuthenticated, NewRoomController.updateModels);
        app.get("/_api/projects/:projectId/rooms/:roomId/model", AuthController.isAuthenticated, NewGeometryController.getModel);

        app.post("/_api/projects/:projectId/rooms/:roomId/images", AuthController.isAuthenticated, gcupload.array('file'), NewRoomController.postPhotos);
        app.delete("/_api/projects/:projectId/rooms/:roomId/images/:imageId", AuthController.isAuthenticated, NewRoomController.deletePhoto);
        //app.put("/_api/projects/:projectId/rooms/:roomId/images", AuthController.isAuthenticated, RoomController.postAddPhotos);
        //app.post("/_api/projects/:projectId/rooms/:roomId/images/:imageId/edges", AuthController.isAuthenticated, gcupload.array('file'), NewRoomController.postEdges)

        app.post("/_api/projects/:projectId/rooms/:roomId/images", AuthController.isAuthenticated, NewRoomController.postPhotos);
        app.post("/_api/projects/:projectId/rooms/:roomId/submit", AuthController.isAuthenticated, NewRoomController.submitPhotos);
        app.post("/_api/projects/:projectId/rooms/:roomId/skp", AuthController.isAuthenticated, gcupload.single('file'), DataController.postSketchup);
        app.post("/_api/projects/:projectId/rooms/:roomId/dxf", AuthController.isAuthenticated, gcupload.single('file'), DataController.postDXF);
        app.post("/_api/projects/:projectId/rooms/:roomId/requestmodels", AuthController.isAuthenticated, DataController.sendModelsEmail);



        app.get("/_api/projects/:projectId/rooms/:roomId/geometries", AuthController.isAuthenticated, NewGeometryController.getGeometries);
        //app.post("/_api/projects/:projectId/rooms/:roomId/geometries", AuthController.isAuthenticated, RoomController.getRoom);
        app.get("/_api/projects/:projectId/rooms/:roomId/geometries/:geometryId", AuthController.isAuthenticated, NewGeometryController.getGeometry);

        app.get("/_api/projects/:projectId/rooms/:roomId/geometries/:geometryId/revisions", AuthController.isAuthenticated, NewGeometryController.getRevisions);
        //app.get("/_api/projects/:projectId/rooms/:roomId/geometries/:geometryId/revisions/all", AuthController.isAuthenticated, NewRoomController.getRoom);
        app.get("/_api/projects/:projectId/rooms/:roomId/geometries/:geometryId/revisions/:revisionId", AuthController.isAuthenticated, NewGeometryController.getRevision);
        //app.post("/_api/projects/rooms/revisions", AuthController.isAuthenticated, GeometryController.postLoadRevisionList);

        app.get("/_api/invites", AuthController.isAuthenticated, InviteController.getInvites);
        app.post("/_api/invites", AuthController.isAuthenticated, InviteController.postInvites);

        const webapps = getApps();
        webapps.forEach(webapp => {
            const basePath = webapp.path;
            if(webapp.oninvite)
                {app.use(vhost(webapp.host, InviteController.checkForInvite))};
            app.use(vhost(webapp.host, express.static(basePath)));
            app.use(vhost(webapp.host, (request: any, response: any) => { response.sendFile(path.resolve(basePath + '/index.html'))}));
            //app.get(webapp.base, (request: any, response: any) => { response.sendFile(path.resolve(basePath + '/index.html')) });
            //app.get(webapp.base + "/*", (request: any, response: any) => { response.sendFile(path.resolve(basePath + '/index.html')) });
        });

    }
}