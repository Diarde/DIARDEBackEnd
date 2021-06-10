import * as nodemailer from "nodemailer";
import { getEmail } from "../config/config";
import * as fs from 'fs';
import * as path from 'path';
import { Attachment } from "nodemailer/lib/mailer";
import { Readable } from 'nodemailer/lib/xoauth2';

export async function mail(recipient: string, mail: {subject: string, text: string, html: string, attachments: Attachment[]}) {

  const email = getEmail();

  let transporter = nodemailer.createTransport(email.smtp);

  let info = await transporter.sendMail({
    from: email.sender, 
    to: recipient, 
    subject: mail.subject, 
    text: mail.text,
    html: mail.html,
    attachments: mail.attachments
  });
}

export const getResetEmail = (link: string, language: string): {subject: string, text: string, html: string, attachments: Attachment[]} => {
  const basePath = getEmail().path;
  const getFile = (path: string, link: string): string => {
    return (fs.readFileSync(path, { encoding: 'utf8'})).replace(/{{link}}/g, link)
  }
  switch(language){
    case 'en':
      return {
        subject: 'Diarde password support',
        text: getFile(path.join(basePath,'/txt/requestmail.en.txt'), link), 
        html: getFile(path.join(basePath,'/html/requestmail.en.html'), link),
        attachments: null
      };
    case 'de':
      return {
        subject: 'Diarde Passwort Hilfe',
        text: getFile(path.join(basePath,'/txt/requestmail.de.txt'), link), 
        html: getFile(path.join(basePath,'/html/requestmail.de.html'), link),
        attachments: null};
  }
 
}

export const getRegisterEmail = (link: string, language: string): {subject: string, text: string, html: string, attachments: Attachment[]} => {
  const basePath = getEmail().path;
  const getFile = (path: string, link: string): string => {
    return (fs.readFileSync(path, { encoding: 'utf8'})).replace(/{{link}}/g, link)
  }
  switch(language){
    case 'en':
      return {
        subject: 'Welcome to Diarde',
        text: getFile(path.join(basePath,'/txt/verificationmail.en.txt'), link), 
        html: getFile(path.join(basePath,'/html/verificationmail.en.html'), link),
        attachments: null
      };
    case 'de':
      return {
        subject: 'Neuanmeldung bei Diarde',
        text: getFile(path.join(basePath,'/txt/verificationmail.de.txt'), link), 
        html: getFile(path.join(basePath,'/html/verificationmail.de.html'), link),
        attachments: null};
  }
} 


export const getSendModelEmail = (projectName: string, roomName: string, models: {name: string, stream: Readable}[] , language: string): 
  {subject: string, text: string, html: string, attachments: Attachment[]} => {
  const basePath = getEmail().path;
  const getFile = (path: string, projectName: string, roomName: string): string => {
    return (fs.readFileSync(path, { encoding: 'utf8'})).replace(/{{project}}/g, projectName).replace(/{{room}}/g, roomName)
  }
  const attachments = models.map(model => ({filename: model.name, content: model.stream}) as Attachment);
  switch(language){
    case 'en':
      return {
        subject: 'Diarde Models',
        text: getFile(path.join(basePath,'/txt/senddata.en.txt'), projectName, roomName), 
        html: getFile(path.join(basePath,'/html/senddata.en.html'), projectName, roomName),
        attachments: attachments
      };
    case 'de':
      return {
        subject: 'Diarde Modelle',
        text: getFile(path.join(basePath,'/txt/senddata.de.txt'), projectName, roomName), 
        html: getFile(path.join(basePath,'/html/senddata.de.html'), projectName, roomName),
        attachments: attachments};
  }
} 

