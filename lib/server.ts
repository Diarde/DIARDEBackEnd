import app from "./app";
import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import { getPort, getRedirectionPort } from "./config/config";
import { getCertificates, hasSSL } from "./config/config";
import * as express from "express";
import * as HttpStatus from "http-status-codes";
import * as tls from "tls";

const port = getPort().getOrElse(4000);
const redirection_port = getRedirectionPort().getOrElse(4100);

if (!hasSSL()) {

  const httpServer = http.createServer(app);
  httpServer.listen(port, () =>
    console.log(`HTTP server listening on ` + port)
  )


} else {

  const options: https.ServerOptions = {
    SNICallback: (domain, cb) => {
      const cert = getCertificates(domain);
      return cert.map((cert) => {
        cb(null, tls.createSecureContext({
          key: fs.readFileSync(cert.key),
          cert: fs.readFileSync(cert.cert),
          passphrase: cert.passphrase,
        }).context);
      });
    },
  };

  https
    .createServer(
      options,
      app
    )
    .listen(port);
  console.log("HTTPS server listening on port " + port);

  const httpApp = express();
  httpApp.all("*", (req, res) => {
    res.redirect(HttpStatus.MOVED_TEMPORARILY, `https://${req.hostname}:${port}`);
  });
  const httpServer = http.createServer(httpApp);
  httpServer.listen(redirection_port, () =>
    console.log(`HTTP redirection server listening on ` + redirection_port)
  )
}
