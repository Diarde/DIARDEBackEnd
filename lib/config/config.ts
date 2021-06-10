import * as fs from 'fs';
import * as path from 'path';
import { Option, some, none } from 'ts-option';

const config = require('../../config.json');
let certificates: Option<Map<string, { key: string, cert: string, passphrase: string }>> = none;

export function getApps(): Array<{host: string, path: string, oninvite: boolean}> {
    return config.apps;
}

export function hasCloudStorage(): boolean {
    return config.uploads && config.uploads.storage; 
}

export function getCloudStorage(): { "projectId": string, "keyFilename": string} {
    return config.uploads.storage;
}

export function getUploadPath(): string {
    const now = new Date(Date.now());
    const dateString = '/' + now.toISOString().slice(0, 4) +
        now.toISOString().slice(5, 7) +
        now.toISOString().slice(8, 10);
    const _path = path.join(getUploadBasePath(), dateString);
    if (!fs.existsSync(_path)) {
        fs.mkdirSync(_path);
    }
    return _path
}
export function getUploadBasePath(): string {
    if (!fs.existsSync(config.uploadpath)) {
        fs.mkdirSync(config.uploadpath);
    }
    return config.uploadpath
}

export function getMongoURL(): string {
    return config.mongourl;
}

export function getCertificates(domain: string): Option<{ key: string, cert: string, passphrase: string }> {
    if(certificates.isEmpty){
        const certs = new Map();
        config.ssl.forEach(cert => {
            certs.set(cert.domain, cert);
        });

        certificates = some(certs);
    }
    const retObject = certificates.getOrElse(new Map()).get(domain);
    return retObject !== null && retObject !== undefined ? some(retObject) : none; 
}

export function hasSSL(): boolean {
    return config.ssl !== undefined;
}

export function getPort(): Option<number> {
    return config.port ? some(config.port) : none;
}

export function getRedirectionPort(): Option<number> {
    return config.redirectionport ? some(config.redirectionport) : none;
}

export function hasTransaction(): boolean {
    return config.transaction ? config.transaction : false;
}

export function getEmail():{sender: string, smtp: any, path: string} {
    return config.email;
}
